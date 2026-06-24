use soroban_sdk::{contract, contractimpl, token, Address, Env};

use crate::events::*;
use crate::math::*;
use crate::storage::*;
use crate::types::{PoolConfig, PoolStatus};

// ─── Fee Constants ─────────────────────────────────────────────────

const FEE_DENOM: i128 = 10_000_000_000; // 10^10
const MAX_FEE: i128 = 5_000_000_000; // 0.5%

#[contract]
pub struct StableSwapPool;

#[contractimpl]
impl StableSwapPool {
    // ─── Initialization ─────────────────────────────────────────

    pub fn initialize(
        env: Env,
        admin: Address,
        token_a: Address,
        token_b: Address,
        amp_factor: i128,
        fee: i128,
    ) {
        let existing = get_pool_config_option(&env);
        if existing.is_some() {
            panic!("already initialized");
        }

        if token_a == token_b {
            panic!("tokens must be different");
        }

        if amp_factor == 0 || amp_factor > MAX_A {
            panic!("invalid amp_factor");
        }

        if fee > MAX_FEE {
            panic!("fee too high");
        }

        let config = PoolConfig {
            token_a: token_a.clone(),
            token_b: token_b.clone(),
            amp_factor,
            future_amp_factor: amp_factor,
            initial_amp_time: 0,
            future_amp_time: 0,
            fee,
            admin_fee: 0,
            admin: admin.clone(),
            status: PoolStatus::Active,
        };

        set_pool_admin(&env, &admin);
        set_pool_config(&env, &config);
        set_token_a(&env, &token_a);
        set_token_b(&env, &token_b);
        set_total_supply(&env, 0);
    }

    // ─── Liquidity ──────────────────────────────────────────────

    pub fn deposit(
        env: Env,
        caller: Address,
        amount_a: i128,
        amount_b: i128,
        min_shares: i128,
    ) -> i128 {
        caller.require_auth();

        let config = get_pool_config(&env);
        if config.status != PoolStatus::Active {
            panic!("pool not active");
        }

        if amount_a <= 0 || amount_b <= 0 {
            panic!("amounts must be > 0");
        }

        let total_supply = get_total_supply(&env);
        let balance_a = get_balance(&env, &config.token_a);
        let balance_b = get_balance(&env, &config.token_b);

        // Pull tokens from caller
        let token_a_client = token::Client::new(&env, &config.token_a);
        let token_b_client = token::Client::new(&env, &config.token_b);
        token_a_client.transfer(&caller, &env.current_contract_address(), &amount_a);
        token_b_client.transfer(&caller, &env.current_contract_address(), &amount_b);

        let shares = if total_supply == 0 {
            // First deposit: shares = min(amount_a, amount_b)
            if amount_a < amount_b {
                amount_a
            } else {
                amount_b
            }
        } else {
            // Proportional deposit: shares = min(a * total / bal_a, b * total / bal_b)
            let ideal_a = amount_a * total_supply / balance_a;
            let ideal_b = amount_b * total_supply / balance_b;
            let shares = if ideal_a < ideal_b { ideal_a } else { ideal_b };

            // Apply fee for imbalanced deposits
            let ideal_total_a = shares * balance_a / total_supply;
            let ideal_total_b = shares * balance_b / total_supply;

            let diff_a = if amount_a > ideal_total_a {
                amount_a - ideal_total_a
            } else {
                ideal_total_a - amount_a
            };
            let diff_b = if amount_b > ideal_total_b {
                amount_b - ideal_total_b
            } else {
                ideal_total_b - amount_b
            };

            let fee_rate = config.fee * N_COINS / (4 * (N_COINS - 1));
            let fee_amount =
                (diff_a * fee_rate / FEE_DENOM) + (diff_b * fee_rate / FEE_DENOM);

            shares - fee_amount
        };

        if shares <= 0 {
            panic!("shares too small");
        }

        if shares < min_shares {
            panic!("slippage: shares < min_shares");
        }

        // Update state
        set_balance(&env, &config.token_a, balance_a + amount_a);
        set_balance(&env, &config.token_b, balance_b + amount_b);
        set_total_supply(&env, total_supply + shares);
        set_user_shares(
            &env,
            &caller,
            get_user_shares(&env, &caller) + shares,
        );

        emit_add_liquidity(&env, &caller, amount_a, amount_b, shares);

        shares
    }

    pub fn withdraw(
        env: Env,
        caller: Address,
        share_amount: i128,
        min_amount_a: i128,
        min_amount_b: i128,
    ) -> (i128, i128) {
        caller.require_auth();

        let config = get_pool_config(&env);

        if share_amount <= 0 {
            panic!("share_amount must be > 0");
        }

        let user_shares = get_user_shares(&env, &caller);
        if user_shares < share_amount {
            panic!("insufficient shares");
        }

        let total_supply = get_total_supply(&env);
        let balance_a = get_balance(&env, &config.token_a);
        let balance_b = get_balance(&env, &config.token_b);

        // Proportional withdrawal
        let amount_a = share_amount * balance_a / total_supply;
        let amount_b = share_amount * balance_b / total_supply;

        if amount_a < min_amount_a || amount_b < min_amount_b {
            panic!("slippage: amounts < minimum");
        }

        // Transfer tokens back
        let token_a_client = token::Client::new(&env, &config.token_a);
        let token_b_client = token::Client::new(&env, &config.token_b);
        token_a_client.transfer(
            &env.current_contract_address(),
            &caller,
            &amount_a,
        );
        token_b_client.transfer(
            &env.current_contract_address(),
            &caller,
            &amount_b,
        );

        // Update state
        set_balance(&env, &config.token_a, balance_a - amount_a);
        set_balance(&env, &config.token_b, balance_b - amount_b);
        set_total_supply(&env, total_supply - share_amount);
        set_user_shares(&env, &caller, user_shares - share_amount);

        emit_remove_liquidity(&env, &caller, share_amount, amount_a, amount_b);

        (amount_a, amount_b)
    }

    // ─── Swap ───────────────────────────────────────────────────

    pub fn swap(
        env: Env,
        caller: Address,
        token_in: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        caller.require_auth();

        let config = get_pool_config(&env);
        if config.status != PoolStatus::Active {
            panic!("pool not active");
        }

        if amount_in <= 0 {
            panic!("amount_in must be > 0");
        }

        // Determine swap direction
        let (i, j, balance_in, balance_out) = if token_in == config.token_a {
            (
                0,
                1,
                get_balance(&env, &config.token_a),
                get_balance(&env, &config.token_b),
            )
        } else if token_in == config.token_b {
            (
                1,
                0,
                get_balance(&env, &config.token_b),
                get_balance(&env, &config.token_a),
            )
        } else {
            panic!("invalid token");
        };

        // Get current A with ramping
        let ann = get_current_a(
            config.amp_factor,
            config.future_amp_factor,
            config.initial_amp_time,
            config.future_amp_time,
            env.ledger().timestamp(),
        ) * N_COINS;

        // Compute D for current reserves
        let xp = [balance_in, balance_out];
        let d = compute_d(xp, ann);

        // Compute output amount (before fee)
        let new_balance_in = balance_in + amount_in;
        let y = get_y(i, j, new_balance_in, xp, d, ann);
        let dy = balance_out - y - 1; // -1 for safety

        // Apply fee on output
        let fee_amount = dy * config.fee / FEE_DENOM;
        let amount_out = dy - fee_amount;

        if amount_out < min_amount_out {
            panic!("slippage: output < minimum");
        }

        // Pull token_in from caller
        let token_in_client = token::Client::new(&env, &token_in);
        token_in_client.transfer(&caller, &env.current_contract_address(), &amount_in);

        // Push token_out to caller
        let token_out = if i == 0 {
            config.token_b.clone()
        } else {
            config.token_a.clone()
        };
        let token_out_client = token::Client::new(&env, &token_out);
        token_out_client.transfer(&env.current_contract_address(), &caller, &amount_out);

        // Update balances
        if i == 0 {
            set_balance(&env, &config.token_a, balance_in + amount_in);
            set_balance(&env, &config.token_b, balance_out - amount_out);
        } else {
            set_balance(&env, &config.token_b, balance_in + amount_in);
            set_balance(&env, &config.token_a, balance_out - amount_out);
        }

        emit_swap(&env, &caller, &token_in, &token_out, amount_in, amount_out);

        amount_out
    }

    // ─── View Functions ─────────────────────────────────────────

    pub fn get_reserves(env: Env) -> (i128, i128) {
        let config = get_pool_config(&env);
        (
            get_balance(&env, &config.token_a),
            get_balance(&env, &config.token_b),
        )
    }

    pub fn get_tokens(env: Env) -> (Address, Address) {
        let config = get_pool_config(&env);
        (config.token_a, config.token_b)
    }

    pub fn get_amp_factor(env: Env) -> i128 {
        let config = get_pool_config(&env);
        get_current_a(
            config.amp_factor,
            config.future_amp_factor,
            config.initial_amp_time,
            config.future_amp_time,
            env.ledger().timestamp(),
        )
    }

    pub fn get_fee(env: Env) -> i128 {
        get_pool_config(&env).fee
    }

    pub fn get_admin(env: Env) -> Address {
        get_pool_config(&env).admin
    }

    pub fn get_status(env: Env) -> PoolStatus {
        get_pool_config(&env).status
    }

    pub fn get_total_shares(env: Env) -> i128 {
        get_total_supply(&env)
    }

    pub fn get_user_shares(env: Env, user: Address) -> i128 {
        get_user_shares(&env, &user)
    }

    pub fn get_amount_out(env: Env, token_in: Address, amount_in: i128) -> i128 {
        let config = get_pool_config(&env);

        let (i, balance_in, balance_out) = if token_in == config.token_a {
            (
                0,
                get_balance(&env, &config.token_a),
                get_balance(&env, &config.token_b),
            )
        } else if token_in == config.token_b {
            (
                1,
                get_balance(&env, &config.token_b),
                get_balance(&env, &config.token_a),
            )
        } else {
            panic!("invalid token");
        };

        let j = 1 - i;

        let ann = get_current_a(
            config.amp_factor,
            config.future_amp_factor,
            config.initial_amp_time,
            config.future_amp_time,
            env.ledger().timestamp(),
        ) * N_COINS;

        let xp = [balance_in, balance_out];
        let d = compute_d(xp, ann);

        let new_balance_in = balance_in + amount_in;
        let y = get_y(i, j, new_balance_in, xp, d, ann);
        let dy = balance_out - y - 1;
        let fee_amount = dy * config.fee / FEE_DENOM;
        dy - fee_amount
    }

    // ─── Admin Functions ────────────────────────────────────────

    pub fn ramp_a(
        env: Env,
        caller: Address,
        new_future_amp: i128,
        future_time: u64,
    ) {
        caller.require_auth();

        let mut config = get_pool_config(&env);
        if caller != config.admin {
            panic!("only admin");
        }

        let current_a = get_current_a(
            config.amp_factor,
            config.future_amp_factor,
            config.initial_amp_time,
            config.future_amp_time,
            env.ledger().timestamp(),
        );

        let now = env.ledger().timestamp();

        if now < config.initial_amp_time + MIN_RAMP_TIME {
            panic!("ramp too soon");
        }
        if future_time < now + MIN_RAMP_TIME {
            panic!("future time too soon");
        }
        if new_future_amp == 0 || new_future_amp > MAX_A {
            panic!("invalid amp");
        }

        if new_future_amp > current_a {
            if new_future_amp > current_a * MAX_A_CHANGE {
                panic!("amp increase too large");
            }
        } else {
            if current_a > new_future_amp * MAX_A_CHANGE {
                panic!("amp decrease too large");
            }
        }

        let old_a = config.amp_factor;
        config.amp_factor = current_a;
        config.future_amp_factor = new_future_amp;
        config.initial_amp_time = now;
        config.future_amp_time = future_time;
        set_pool_config(&env, &config);

        emit_ramp_a(&env, &caller, old_a as u128, new_future_amp as u128, future_time);
    }

    pub fn stop_ramp_a(env: Env, caller: Address) {
        caller.require_auth();

        let mut config = get_pool_config(&env);
        if caller != config.admin {
            panic!("only admin");
        }

        let current_a = get_current_a(
            config.amp_factor,
            config.future_amp_factor,
            config.initial_amp_time,
            config.future_amp_time,
            env.ledger().timestamp(),
        );

        config.amp_factor = current_a;
        config.future_amp_factor = current_a;
        config.initial_amp_time = env.ledger().timestamp();
        config.future_amp_time = env.ledger().timestamp();
        set_pool_config(&env, &config);

        emit_stop_ramp_a(&env, &caller, current_a as u128);
    }

    pub fn set_fee(env: Env, caller: Address, new_fee: i128) {
        caller.require_auth();

        let mut config = get_pool_config(&env);
        if caller != config.admin {
            panic!("only admin");
        }

        if new_fee > MAX_FEE {
            panic!("fee too high");
        }

        let old_fee = config.fee;
        config.fee = new_fee;
        set_pool_config(&env, &config);

        emit_set_fee(&env, &caller, old_fee as u128, new_fee as u128);
    }

    pub fn pause(env: Env, caller: Address) {
        caller.require_auth();

        let mut config = get_pool_config(&env);
        if caller != config.admin {
            panic!("only admin");
        }

        config.status = PoolStatus::Paused;
        set_pool_config(&env, &config);
    }

    pub fn unpause(env: Env, caller: Address) {
        caller.require_auth();

        let mut config = get_pool_config(&env);
        if caller != config.admin {
            panic!("only admin");
        }

        config.status = PoolStatus::Active;
        set_pool_config(&env, &config);
    }
}
