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
use crate::types::{LPPosition, StorageKey, VaultMode};

// ─── Constants ─────────────────────────────────────────────────────

const BPS_BASE: i128 = 10_000;
const SLIPPAGE_BPS: i128 = 50;
const SCALE_FACTOR: i128 = 1_000_000;

// ─── Helpers ───────────────────────────────────────────────────────

/// Assert that the caller is NOT the keeper.
/// The keeper is only authorized to call harvest().
fn assert_not_keeper(env: &Env, caller: &Address) {
    let keeper = get_keeper(env);
    assert!(*caller != keeper, "Keeper cannot call user functions");
}

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
/// Given a pool with reserves (rx, ry) and an input amount, compute how much
/// of amount_in should be swapped (via constant-product AMM with fee bps)
/// such that after the swap, both sides are balanced for add_liquidity.
///
/// Formula (constant-product, fee in basis points):
///   amount_to_swap = (sqrt(rx * (rx + amount_in * 10_000 / (10_000 - fee_bps))) - rx)
///                    * (10_000 - fee_bps) / 10_000
///
/// Returns (amount_to_keep, amount_to_swap).
pub fn calc_split_ratio(
    _env: &Env,
    reserve_in: i128,
    reserve_out: i128,
    amount_in: i128,
    fee_bps: i128,
) -> (i128, i128) {
    if reserve_in <= 0 || reserve_out <= 0 {
        let half = amount_in / 2;
        return (half, amount_in - half);
    }

    let one_minus_fee = BPS_BASE - fee_bps;
    let numerator = reserve_in * (reserve_in * BPS_BASE + amount_in * one_minus_fee) / BPS_BASE;
    let sqrt_val = integer_sqrt(numerator);
    let amount_to_swap = (sqrt_val - reserve_in) * one_minus_fee / BPS_BASE;

    if amount_to_swap <= 0 || amount_to_swap >= amount_in {
        let half = amount_in / 2;
        return (half, amount_in - half);
    }

    (amount_in - amount_to_swap, amount_to_swap)
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
        assert!(admin != keeper, "initialize: admin and keeper must be different addresses");
        set_admin(&env, &admin);
        set_keeper(&env, &keeper);
        set_mode(&env, &mode);
        set_shares_supply(&env, 0);
        set_total_lp(&env, 0);
    }

    pub fn deposit(env: Env, from: Address, lp_token: Address, amount: i128) -> i128 {
        from.require_auth();
        assert_not_keeper(&env, &from);
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
        assert_not_keeper(&env, &from);
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

    /// Set the Soroswap router address. Admin-only, immutable after first set.
    pub fn set_soroswap_router(env: Env, caller: Address, router: Address) {
        let admin = get_admin(&env);
        if caller != admin {
            panic!("set_soroswap_router: only admin");
        }
        caller.require_auth();
        assert!(
            !env.storage().instance().has::<StorageKey>(&StorageKey::SoroswapRouter),
            "set_soroswap_router: already set — immutable after init"
        );
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
        assert_not_keeper(&env, &caller);

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

        // Query pool reserves by reading token balances
        let token_in_client_r = token::Client::new(&env, &token_in);
        let token_pair_client_r = token::Client::new(&env, &token_pair);
        let reserve_in = token_in_client_r.balance(&target_pool);
        let reserve_out = token_pair_client_r.balance(&target_pool);

        // Calculate optimal split ratio (Soroswap fee = 0.3% = 30 bps)
        let (amount_to_keep, amount_to_swap) = calc_split_ratio(
            &env,
            reserve_in,
            reserve_out,
            amount_in,
            30,
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

    /// Set the RAW$ AMM contract address. Admin-only, immutable after first set.
    pub fn set_amm_address(env: Env, caller: Address, amm: Address) {
        let admin = get_admin(&env);
        if caller != admin {
            panic!("set_amm_address: only admin");
        }
        caller.require_auth();
        assert!(
            !env.storage().instance().has::<StorageKey>(&StorageKey::RawsAmmAddress),
            "set_amm_address: already set — immutable after init"
        );
        set_amm_address(&env, &amm);
    }

    /// Get the RAW$ AMM contract address.
    pub fn get_amm_address(env: Env) -> Address {
        get_amm_address(&env).expect("AMM address not set")
    }

    /// Safe Mode deposit: routes single-token deposit into RAW$ AMM via C2C.
    ///
    /// Atomic flow:
    /// 1. Pull token_in from caller
    /// 2. Query AMM for token_a and token_b addresses
    /// 3. Split 50/50: swap half for token_pair via AMM exchange()
    /// 4. Add liquidity to AMM with both sides balanced via add_liquidity()
    /// 5. Mint dfTokens proportional to LP shares received
    /// 6. Update vault positions map
    ///
    /// If any step fails, the entire transaction reverts — user keeps their tokens.
    pub fn deposit_safe_mode(
        env: Env,
        caller: Address,
        token_in: Address,
        amount_in: i128,
        min_shares: i128,
    ) -> i128 {
        caller.require_auth();
        assert_not_keeper(&env, &caller);
        assert!(amount_in > 0, "deposit_safe_mode: amount_in must be > 0");

        let mode = get_mode(&env);
        assert!(mode == VaultMode::SafeMode, "VaultNotInSafeMode");

        let amm_address = get_amm_address(&env).expect("AMM address not configured");
        let vault_addr = env.current_contract_address();

        // Pull token_in from caller → vault
        let token_in_client = token::Client::new(&env, &token_in);
        token_in_client.transfer(&caller, &vault_addr, &amount_in);

        // Query AMM for its token addresses
        let amm_token_a: Address = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "get_token_a"),
            soroban_sdk::vec![&env],
        );
        let amm_token_b: Address = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "get_token_b"),
            soroban_sdk::vec![&env],
        );

        // Determine which AMM token is the pair (the one that's not token_in)
        let token_pair = if amm_token_a == token_in {
            amm_token_b.clone()
        } else {
            amm_token_a.clone()
        };

        // Query AMM reserves
        let token_in_client_r = token::Client::new(&env, &token_in);
        let token_pair_client_r = token::Client::new(&env, &token_pair);
        let reserve_in = token_in_client_r.balance(&amm_address);
        let reserve_out = token_pair_client_r.balance(&amm_address);

        // Calculate optimal split ratio (RAW$ AMM fee = 4 bps)
        let (amount_to_keep, amount_to_swap) =
            calc_split_ratio(&env, reserve_in, reserve_out, amount_in, 4);

        assert!(amount_to_swap > 0 && amount_to_keep > 0, "InvalidSplitRatio");
        assert!(
            amount_to_swap + amount_to_keep == amount_in,
            "SplitAmountMismatch"
        );

        // C2C Call 1: Swap half on AMM exchange()
        let min_swap_out = calc_min_out(amount_to_swap);
        let swap_result: i128 = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "exchange"),
            soroban_sdk::vec![
                &env,
                vault_addr.clone().into_val(&env),
                token_in.clone().into_val(&env),
                amount_to_swap.into_val(&env),
                min_swap_out.into_val(&env),
            ],
        );

        assert!(swap_result >= min_swap_out, "SafeMode: SwapSlippageExceeded");

        // C2C Call 2: Add liquidity with both sides balanced
        let (desired_a, desired_b) = if token_in == amm_token_a {
            (amount_to_keep, swap_result)
        } else {
            (swap_result, amount_to_keep)
        };

        let lp_shares_received: i128 = env.invoke_contract(
            &amm_address,
            &Symbol::new(&env, "add_liquidity"),
            soroban_sdk::vec![
                &env,
                vault_addr.into_val(&env),
                desired_a.into_val(&env),
                desired_b.into_val(&env),
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

        let position = LPPosition {
            pool_id: amm_address.clone(),
            lp_tokens: existing_lp + lp_shares_received,
            entry_price_ratio: if desired_a > 0 {
                desired_b * SCALE_FACTOR / desired_a
            } else {
                0
            },
            entry_timestamp: env.ledger().timestamp(),
            token_a: amm_token_a,
            token_b: amm_token_b.clone(),
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

    pub fn version(_env: Env) -> u32 {
        1
    }
}
