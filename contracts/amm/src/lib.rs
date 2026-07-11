#![no_std]

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, token, Address, Env};

mod math;
mod storage;
mod types;
mod events;

pub use math::*;
pub use storage::*;
pub use types::*;

pub const N_COINS: i128 = 2;
pub const A_PARAM: i128 = 100;
pub const ANN: i128 = A_PARAM * N_COINS * N_COINS;

pub const FEE_BPS: i128 = 4;
pub const BPS_BASE: i128 = 10_000;
const MIN_INITIAL_DEPOSIT: i128 = 1_000_000;

fn require_not_paused(env: &Env) {
    assert!(!is_paused(env), "Contract is paused");
}

#[contract]
pub struct RawsAMM;

#[contractimpl]
impl RawsAMM {
    pub fn init(
        env: Env,
        token_a: Address,
        token_b: Address,
        initial_a: i128,
        initial_b: i128,
        admin: Address,
    ) {
        assert!(
            !env.storage().instance().has::<DataKey>(&DataKey::Initialized),
            "AlreadyInitialized"
        );

        assert!(initial_a >= 0 && initial_b >= 0, "NegativeDeposit");

        admin.require_auth();

        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);

        if initial_a > 0 && initial_b > 0 {
            token::Client::new(&env, &token_a)
                .transfer(&admin, &env.current_contract_address(), &initial_a);
            token::Client::new(&env, &token_b)
                .transfer(&admin, &env.current_contract_address(), &initial_b);
        }

        let initial_d = get_d(&(initial_a, initial_b), ANN);
        env.storage()
            .instance()
            .set(&DataKey::Balances, &(initial_a, initial_b));
        env.storage()
            .instance()
            .set(&DataKey::TotalShares, &initial_d);

        set_shares(&env, &admin, initial_d);

        events::emit_init(&env, &token_a, &token_b, initial_a, initial_b, initial_d);
    }

    pub fn exchange(
        env: Env,
        caller: Address,
        token_in: Address,
        amount_in: i128,
        min_out: i128,
    ) -> i128 {
        require_not_paused(&env);
        caller.require_auth();
        assert!(amount_in > 0, "ZeroInput");

        let token_a = get_token_a(&env);
        let token_b = get_token_b(&env);
        let (i, j) = if token_in == token_a {
            (0usize, 1usize)
        } else if token_in == token_b {
            (1usize, 0usize)
        } else {
            panic!("InvalidToken: not in pool");
        };

        let balances = get_balances(&env);

        token::Client::new(&env, &token_in)
            .transfer(&caller, &env.current_contract_address(), &amount_in);

        let d = get_d(&balances, ANN);

        let x_new = if i == 0 { balances.0 } else { balances.1 } + amount_in;

        let y_new = get_y(x_new, d, ANN);

        let old_j = if j == 0 { balances.0 } else { balances.1 };
        let dy = old_j - y_new - 1;
        assert!(dy > 0, "NegativeOutput: pool math error");

        let fee = dy * FEE_BPS / BPS_BASE;
        let amount_out = dy - fee;

        assert!(amount_out >= min_out, "SlippageExceeded: amount_out < min_out");

        let new_balances = if i == 0 {
            (x_new, y_new + fee)
        } else {
            (y_new + fee, x_new)
        };
        set_balances(&env, &new_balances);

        let token_out = if j == 0 { token_a.clone() } else { token_b.clone() };
        token::Client::new(&env, &token_out).transfer(
            &env.current_contract_address(),
            &caller,
            &amount_out,
        );

        events::emit_swap(&env, &caller, &token_in, amount_in, &token_out, amount_out, fee);

        amount_out
    }

    pub fn add_liquidity(
        env: Env,
        caller: Address,
        desired_a: i128,
        desired_b: i128,
        min_shares: i128,
    ) -> i128 {
        require_not_paused(&env);
        caller.require_auth();
        assert!(desired_a > 0 || desired_b > 0, "ZeroDeposit");

        let token_a = get_token_a(&env);
        let token_b = get_token_b(&env);
        let balances = get_balances(&env);
        let total_shares = get_total_shares(&env);

        let d0 = if total_shares == 0 {
            0
        } else {
            get_d(&balances, ANN)
        };

        if desired_a > 0 {
            token::Client::new(&env, &token_a)
                .transfer(&caller, &env.current_contract_address(), &desired_a);
        }
        if desired_b > 0 {
            token::Client::new(&env, &token_b)
                .transfer(&caller, &env.current_contract_address(), &desired_b);
        }

        let new_balances = (balances.0 + desired_a, balances.1 + desired_b);

        let d1 = get_d(&new_balances, ANN);
        assert!(d1 > d0, "InvariantDidNotIncrease");

        let imbalance_fee_multiplier = FEE_BPS * N_COINS / (4 * (N_COINS - 1));
        let adjusted_balances = if total_shares > 0 {
            let mut adj = new_balances;
            for k in 0..2usize {
                let old_bal = if k == 0 { balances.0 } else { balances.1 };
                let new_bal = if k == 0 { new_balances.0 } else { new_balances.1 };
                let ideal = d1 * old_bal / d0;
                let diff = (new_bal - ideal).abs();
                let fee = diff * imbalance_fee_multiplier / BPS_BASE;
                let adjusted = new_bal - fee;
                if k == 0 {
                    adj.0 = adjusted;
                } else {
                    adj.1 = adjusted;
                }
            }
            adj
        } else {
            new_balances
        };

        let d2 = if total_shares > 0 {
            get_d(&adjusted_balances, ANN)
        } else {
            d1
        };

        let shares_to_mint = if total_shares == 0 {
            d1
        } else {
            total_shares * (d2 - d0) / d0
        };

        assert!(shares_to_mint >= min_shares, "InsufficientSharesMinted");
        assert!(shares_to_mint > 0, "ZeroSharesMinted");

        set_balances(&env, &new_balances);
        set_total_shares(&env, total_shares + shares_to_mint);

        let caller_shares = get_shares(&env, &caller);
        set_shares(&env, &caller, caller_shares + shares_to_mint);

        events::emit_add_liq(&env, &caller, desired_a, desired_b, shares_to_mint);

        shares_to_mint
    }

    pub fn remove_liquidity(
        env: Env,
        caller: Address,
        shares_to_burn: i128,
        min_a: i128,
        min_b: i128,
    ) -> (i128, i128) {
        require_not_paused(&env);
        caller.require_auth();
        assert!(shares_to_burn > 0, "ZeroShares");

        let caller_shares = get_shares(&env, &caller);
        assert!(caller_shares >= shares_to_burn, "InsufficientShares");

        let total_shares = get_total_shares(&env);
        let balances = get_balances(&env);

        let amount_a = balances.0 * shares_to_burn / total_shares;
        let amount_b = balances.1 * shares_to_burn / total_shares;

        assert!(amount_a >= min_a, "SlippageExceeded: token_a");
        assert!(amount_b >= min_b, "SlippageExceeded: token_b");
        assert!(amount_a > 0 && amount_b > 0, "ZeroWithdrawal");

        set_balances(&env, &(balances.0 - amount_a, balances.1 - amount_b));
        set_total_shares(&env, total_shares - shares_to_burn);
        set_shares(&env, &caller, caller_shares - shares_to_burn);

        let token_a = get_token_a(&env);
        let token_b = get_token_b(&env);
        token::Client::new(&env, &token_a)
            .transfer(&env.current_contract_address(), &caller, &amount_a);
        token::Client::new(&env, &token_b)
            .transfer(&env.current_contract_address(), &caller, &amount_b);

        events::emit_remove_liq(&env, &caller, shares_to_burn, amount_a, amount_b);

        (amount_a, amount_b)
    }

    pub fn get_balances(env: Env) -> (i128, i128) {
        storage::get_balances(&env)
    }

    pub fn get_total_shares(env: Env) -> i128 {
        storage::get_total_shares(&env)
    }

    pub fn get_user_shares(env: Env, user: Address) -> i128 {
        storage::get_shares(&env, &user)
    }

    pub fn get_token_a(env: Env) -> Address {
        storage::get_token_a(&env)
    }

    pub fn get_token_b(env: Env) -> Address {
        storage::get_token_b(&env)
    }

    pub fn get_admin(env: Env) -> Address {
        storage::get_admin(&env)
    }

    pub fn pause(env: Env, caller: Address) {
        caller.require_auth();
        let admin = storage::get_admin(&env);
        assert!(caller == admin, "OnlyAdmin");
        set_paused(&env, true);
    }

    pub fn unpause(env: Env, caller: Address) {
        caller.require_auth();
        let admin = storage::get_admin(&env);
        assert!(caller == admin, "OnlyAdmin");
        set_paused(&env, false);
    }

    pub fn is_paused(env: Env) -> bool {
        storage::is_paused(&env)
    }
}
