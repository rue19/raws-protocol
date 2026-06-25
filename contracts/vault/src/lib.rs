#![cfg_attr(not(any(test, feature = "testutils")), no_std)]

#[cfg(test)]
mod test;

mod events;
mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, Env, IntoVal, Symbol, Vec};
use crate::events::{emit_deposit, emit_deposit_single_asset, emit_harvest, emit_withdraw};
#[allow(unused_imports)]
use crate::storage::*;
use crate::types::{LPPosition, VaultMode};

// ─── Constants ─────────────────────────────────────────────────────

const BPS_BASE: i128 = 10_000;
const SLIPPAGE_BPS: i128 = 50;
const SCALE_FACTOR: i128 = 1_000_000;

// ─── Helpers ───────────────────────────────────────────────────────

/// Integer square root via Newton's method.
/// Returns floor(sqrt(n)) for n >= 0.
pub fn integer_sqrt(n: i128) -> i128 {
    if n < 0 {
        panic!("integer_sqrt: negative input");
    }
    if n == 0 {
        return 0;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

/// Calculate the optimal split ratio for a single-asset deposit.
///
/// Uses the 50/50 approximation: splits amount_in evenly.
///
/// TODO: Replace with closed-form formula before mainnet:
///   amount_to_swap = (sqrt(rx * (rx + amount_in * (1 - fee))) - rx) / (1 - fee)
///
/// Returns (amount_to_keep, amount_to_swap).
pub fn calc_split_ratio(
    _env: &Env,
    _soroswap_router: &Address,
    _token_in: &Address,
    _token_pair: &Address,
    amount_in: i128,
) -> (i128, i128) {
    let half = amount_in / 2;
    let other_half = amount_in - half;
    (half, other_half)
}

/// Slippage-adjusted minimum output amount.
pub fn calc_min_out(quoted: i128) -> i128 {
    quoted * (BPS_BASE - SLIPPAGE_BPS) / BPS_BASE
}

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    // ─── Phase 2 Functions ───────────────────────────────────────

    pub fn initialize(env: Env, admin: Address, keeper: Address, mode: VaultMode) {
        if is_initialized(&env) {
            panic!("already initialized");
        }
        set_admin(&env, &admin);
        set_keeper(&env, &keeper);
        set_mode(&env, &mode);
        set_shares_supply(&env, 0);
        set_total_lp(&env, 0);
    }

    pub fn deposit(env: Env, from: Address, lp_token: Address, amount: i128) -> i128 {
        from.require_auth();
        if amount <= 0 {
            panic!("deposit: amount must be > 0");
        }

        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);
        let df_tokens = if shares_supply == 0 {
            amount
        } else {
            amount
                .checked_mul(shares_supply)
                .expect("math overflow")
                / total_lp
        };

        set_user_shares(&env, &from, get_user_shares(&env, &from) + df_tokens);
        set_shares_supply(&env, shares_supply + df_tokens);
        set_total_lp(&env, total_lp + amount);

        emit_deposit(&env, &from, &lp_token, amount, df_tokens);

        df_tokens
    }

    pub fn withdraw(env: Env, from: Address, lp_token: Address, df_token_amount: i128) -> i128 {
        from.require_auth();
        if df_token_amount <= 0 {
            panic!("withdraw: df_token_amount must be > 0");
        }

        let user_shares = get_user_shares(&env, &from);
        if user_shares < df_token_amount {
            panic!("withdraw: insufficient dfTokens");
        }

        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);

        let lp_out = df_token_amount
            .checked_mul(total_lp)
            .expect("math overflow")
            / shares_supply;

        if lp_out <= 0 {
            panic!("withdraw: lp_out must be > 0");
        }

        set_user_shares(&env, &from, user_shares - df_token_amount);
        set_shares_supply(&env, shares_supply - df_token_amount);
        set_total_lp(&env, total_lp - lp_out);

        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&env.current_contract_address(), &from, &lp_out);

        emit_withdraw(&env, &from, &lp_token, lp_out, df_token_amount);

        lp_out
    }

    pub fn get_balance(env: Env, user: Address) -> (i128, i128) {
        let df_balance = get_user_shares(&env, &user);
        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);

        let lp_equivalent = if shares_supply == 0 {
            0
        } else {
            df_balance.checked_mul(total_lp).expect("math overflow") / shares_supply
        };

        (df_balance, lp_equivalent)
    }

    pub fn get_total_supply(env: Env) -> i128 {
        get_shares_supply(&env)
    }

    pub fn get_mode(env: Env) -> VaultMode {
        get_mode(&env)
    }

    pub fn get_keeper(env: Env) -> Address {
        get_keeper(&env)
    }

    pub fn harvest(env: Env, caller: Address, lp_token: Address, reward_amount: i128) {
        let registered_keeper = get_keeper(&env);
        if caller != registered_keeper {
            panic!("harvest: unauthorized — caller is not the registered keeper");
        }
        caller.require_auth();
        if reward_amount <= 0 {
            panic!("harvest: reward_amount must be > 0");
        }

        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&caller, &env.current_contract_address(), &reward_amount);

        let total_lp = get_total_lp(&env);
        set_total_lp(&env, total_lp + reward_amount);

        emit_harvest(&env, &caller, &lp_token, reward_amount);
    }

    // ─── Phase 3 Functions ───────────────────────────────────────

    /// Set the Soroswap router address. Admin-only, callable once.
    pub fn set_soroswap_router(env: Env, caller: Address, router: Address) {
        let admin = get_admin(&env);
        if caller != admin {
            panic!("set_soroswap_router: only admin");
        }
        caller.require_auth();
        set_soroswap_router(&env, &router);
    }

    pub fn get_soroswap_router(env: Env) -> Address {
        get_soroswap_router(&env)
    }

    /// Single-asset deposit into a Soroswap LP pool.
    ///
    /// Atomic flow:
    /// 1. Pull token_in from caller
    /// 2. Split 50/50: swap half for token_pair via Soroswap router
    /// 3. Add liquidity to target pool via Soroswap router
    /// 4. Mint dfTokens proportional to LP tokens received
    /// 5. Update positions map
    ///
    /// If any step fails, the entire transaction reverts — user keeps their tokens.
    pub fn deposit_single_asset(
        env: Env,
        caller: Address,
        token_in: Address,
        amount_in: i128,
        target_pool: Address,
        min_lp_out: i128,
    ) -> i128 {
        caller.require_auth();

        if amount_in <= 0 {
            panic!("deposit_single_asset: amount_in must be > 0");
        }

        let vault_addr = env.current_contract_address();
        let soroswap_router = get_soroswap_router(&env);

        // Pull token_in from caller
        let token_in_client = token::Client::new(&env, &token_in);
        token_in_client.transfer(&caller, &vault_addr, &amount_in);

        // Query the pair contract for token_0 and token_1
        let token_a: Address = env.invoke_contract(
            &target_pool,
            &Symbol::new(&env, "token_0"),
            soroban_sdk::vec![&env],
        );
        let token_b: Address = env.invoke_contract(
            &target_pool,
            &Symbol::new(&env, "token_1"),
            soroban_sdk::vec![&env],
        );

        // Determine which token is the pair (the one that's not token_in)
        let token_pair = if token_a == token_in {
            token_b
        } else {
            token_a
        };

        // Calculate split ratio (50/50 approximation)
        let (amount_to_keep, amount_to_swap) = calc_split_ratio(
            &env,
            &soroswap_router,
            &token_in,
            &token_pair,
            amount_in,
        );

        assert!(amount_to_swap > 0 && amount_to_keep > 0, "InvalidSplitRatio");
        assert!(
            amount_to_swap + amount_to_keep == amount_in,
            "SplitAmountMismatch"
        );

        // Build swap path
        let swap_path: Vec<Address> = soroban_sdk::vec![&env, token_in.clone(), token_pair.clone()];

        // Query expected output for slippage guard
        let amounts_out: Vec<i128> = env.invoke_contract(
            &soroswap_router,
            &Symbol::new(&env, "get_amounts_out"),
            soroban_sdk::vec![&env, amount_to_swap.into_val(&env), swap_path.clone().into_val(&env)],
        );
        let quoted_output = amounts_out.get(1).unwrap();
        let min_swap_out = calc_min_out(quoted_output);

        let deadline = env.ledger().timestamp() + 300;

        // C2C Call 1: Swap via Soroswap router
        let swap_result: Vec<i128> = env.invoke_contract(
            &soroswap_router,
            &Symbol::new(&env, "swap_exact_"),
            soroban_sdk::vec![
                &env,
                amount_to_swap.into_val(&env),
                min_swap_out.into_val(&env),
                swap_path.into_val(&env),
                vault_addr.clone().into_val(&env),
                deadline.into_val(&env),
            ],
        );
        let received_pair_tokens = swap_result.get(1).unwrap();

        // Guard: swap slippage
        assert!(
            received_pair_tokens >= min_swap_out,
            "SwapSlippageExceeded"
        );

        // C2C Call 2: Add liquidity via Soroswap router
        let min_token_a = calc_min_out(amount_to_keep);
        let min_token_b = calc_min_out(received_pair_tokens);

        let add_liq_result: (i128, i128, i128) = env.invoke_contract(
            &soroswap_router,
            &Symbol::new(&env, "add_liquidity"),
            soroban_sdk::vec![
                &env,
                token_in.clone().into_val(&env),
                token_pair.clone().into_val(&env),
                amount_to_keep.into_val(&env),
                received_pair_tokens.into_val(&env),
                min_token_a.into_val(&env),
                min_token_b.into_val(&env),
                vault_addr.clone().into_val(&env),
                deadline.into_val(&env),
            ],
        );
        let lp_tokens_received = add_liq_result.2;

        // Guard: overall LP minimum
        assert!(lp_tokens_received >= min_lp_out, "LPSlippageExceeded");

        // Update positions map
        let existing_lp = {
            let pos = get_position(&env, &target_pool);
            pos.map(|p| p.lp_tokens).unwrap_or(0)
        };

        let position = LPPosition {
            pool_id: target_pool.clone(),
            lp_tokens: existing_lp + lp_tokens_received,
            entry_price_ratio: if amount_to_keep > 0 {
                received_pair_tokens * SCALE_FACTOR / amount_to_keep
            } else {
                0
            },
            entry_timestamp: env.ledger().timestamp(),
            token_a: token_in.clone(),
            token_b: token_pair.clone(),
        };
        set_position(&env, &target_pool, &position);

        // Mint dfTokens using Phase 2's share logic
        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);
        let df_tokens = if shares_supply == 0 {
            lp_tokens_received
        } else {
            lp_tokens_received
                .checked_mul(shares_supply)
                .expect("math overflow")
                / total_lp
        };

        set_user_shares(
            &env,
            &caller,
            get_user_shares(&env, &caller) + df_tokens,
        );
        set_shares_supply(&env, shares_supply + df_tokens);
        set_total_lp(&env, total_lp + lp_tokens_received);

        emit_deposit_single_asset(
            &env,
            &caller,
            &token_in,
            amount_in,
            lp_tokens_received,
            df_tokens,
        );

        df_tokens
    }

    // ─── Phase 4 Functions ───────────────────────────────────────

    /// Set the RAW$ AMM contract address. Admin-only.
    pub fn set_amm_address(env: Env, caller: Address, amm: Address) {
        let admin = get_admin(&env);
        if caller != admin {
            panic!("set_amm_address: only admin");
        }
        caller.require_auth();
        set_amm_address(&env, &amm);
    }

    /// Get the RAW$ AMM contract address.
    pub fn get_amm_address(env: Env) -> Address {
        get_amm_address(&env).expect("AMM address not set")
    }

    /// Safe Mode deposit: routes single-token deposit into RAW$ AMM via C2C.
    ///
    /// Flow:
    /// 1. Pull token_in from caller
    /// 2. C2C call: AMM add_liquidity(caller, desired_a, desired_b, min_shares)
    /// 3. Mint dfTokens proportional to LP shares received
    /// 4. Update vault positions map
    pub fn deposit_safe_mode(
        env: Env,
        caller: Address,
        token_in: Address,
        amount_in: i128,
        min_shares: i128,
    ) -> i128 {
        caller.require_auth();
        assert!(amount_in > 0, "deposit_safe_mode: amount_in must be > 0");

        let mode = get_mode(&env);
        assert!(mode == VaultMode::SafeMode, "VaultNotInSafeMode");

        let amm_address = get_amm_address(&env).expect("AMM address not configured");

        // Pull token_in from caller
        let token_in_client = token::Client::new(&env, &token_in);
        token_in_client.transfer(&caller, &env.current_contract_address(), &amount_in);

        // For now: Safe Mode requires balanced deposit (equal value both tokens)
        // TODO (post-buildathon): add single-asset path via swap → add_liquidity
        // Simplified: caller deposits amount_in of one token, vault needs to figure out the pair
        // For the AMM: pass as desired_a or desired_b depending on which token
        // Since the AMM stores token_a and token_b, we need to check which one matches
        // C2C Call: AMM add_liquidity
        // Since we only have one token, we deposit it all as that token's side
        // The other side gets 0
        let lp_shares_received: i128 = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "add_liq"),
            soroban_sdk::vec![
                &env,
                caller.clone().into_val(&env),
                amount_in.into_val(&env),
                0i128.into_val(&env),
                min_shares.into_val(&env),
            ],
        );

        assert!(
            lp_shares_received >= min_shares,
            "SafeMode: InsufficientLPShares"
        );

        // Mint dfTokens using Phase 2's share logic
        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);
        let df_tokens = if shares_supply == 0 {
            lp_shares_received
        } else {
            lp_shares_received
                .checked_mul(shares_supply)
                .expect("math overflow")
                / total_lp
        };

        set_user_shares(
            &env,
            &caller,
            get_user_shares(&env, &caller) + df_tokens,
        );
        set_shares_supply(&env, shares_supply + df_tokens);
        set_total_lp(&env, total_lp + lp_shares_received);

        // Update positions map with AMM LP shares
        let existing_lp = {
            let pos = get_position(&env, &amm_address);
            pos.map(|p| p.lp_tokens).unwrap_or(0)
        };

        // Query AMM for its token_b address
        let amm_token_b: Address = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "get_token_b"),
            soroban_sdk::vec![&env],
        );

        let position = LPPosition {
            pool_id: amm_address.clone(),
            lp_tokens: existing_lp + lp_shares_received,
            entry_price_ratio: 0,
            entry_timestamp: env.ledger().timestamp(),
            token_a: token_in.clone(),
            token_b: amm_token_b,
        };
        set_position(&env, &amm_address, &position);

        emit_deposit_single_asset(
            &env,
            &caller,
            &token_in,
            amount_in,
            lp_shares_received,
            df_tokens,
        );

        df_tokens
    }
}
