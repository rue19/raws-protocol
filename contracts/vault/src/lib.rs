#![cfg_attr(not(any(test, feature = "testutils")), no_std)]

#[cfg(test)]
mod test;

mod events;
mod storage;
mod types;

use soroban_sdk::{contract, contractimpl, token, Address, Env};

use crate::events::{emit_deposit, emit_harvest, emit_withdraw};
#[allow(unused_imports)]
use crate::storage::*;
use crate::types::VaultMode;

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// One-time initialization — sets admin, keeper, and vault mode.
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

    /// Deposit LP tokens into the vault and receive dfTokens (proportional shares).
    /// First deposit: 1:1 dfToken minting. Subsequent: proportional to existing shares.
    pub fn deposit(env: Env, from: Address, lp_token: Address, amount: i128) -> i128 {
        from.require_auth();

        if amount <= 0 {
            panic!("deposit: amount must be > 0");
        }

        // Transfer LP tokens from user into vault
        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&from, &env.current_contract_address(), &amount);

        // Calculate dfTokens to mint
        let shares_supply = get_shares_supply(&env);
        let total_lp = get_total_lp(&env);
        let df_tokens = if shares_supply == 0 {
            amount // 1:1 bootstrapping
        } else {
            // proportional: (amount * shares_supply) / total_lp
            // multiply before divide to avoid precision loss
            amount
                .checked_mul(shares_supply)
                .expect("math overflow")
                / total_lp
        };

        // Update state
        set_user_shares(&env, &from, get_user_shares(&env, &from) + df_tokens);
        set_shares_supply(&env, shares_supply + df_tokens);
        set_total_lp(&env, total_lp + amount);

        emit_deposit(&env, &from, &lp_token, amount, df_tokens);

        df_tokens
    }

    /// Withdraw LP tokens by burning dfTokens.
    /// Returns the proportional amount of LP tokens.
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

        // Calculate LP tokens to return: (df_token_amount * total_lp) / shares_supply
        let lp_out = df_token_amount
            .checked_mul(total_lp)
            .expect("math overflow")
            / shares_supply;

        if lp_out <= 0 {
            panic!("withdraw: lp_out must be > 0");
        }

        // Burn dfTokens
        set_user_shares(&env, &from, user_shares - df_token_amount);
        set_shares_supply(&env, shares_supply - df_token_amount);
        set_total_lp(&env, total_lp - lp_out);

        // Transfer LP tokens back to user
        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&env.current_contract_address(), &from, &lp_out);

        emit_withdraw(&env, &from, &lp_token, lp_out, df_token_amount);

        lp_out
    }

    /// Returns (df_token_balance, lp_token_equivalent) for a given user.
    /// Read-only — no auth required.
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

    /// Returns total dfTokens minted.
    pub fn get_total_supply(env: Env) -> i128 {
        get_shares_supply(&env)
    }

    /// Returns current vault mode.
    pub fn get_mode(env: Env) -> VaultMode {
        get_mode(&env)
    }

    /// Returns keeper address.
    pub fn get_keeper(env: Env) -> Address {
        get_keeper(&env)
    }

    /// Keeper-only: records harvested rewards reinvested into the vault.
    /// The keeper transfers reward LP tokens into the vault.
    /// No new dfTokens are minted — existing shares gain value.
    pub fn harvest(env: Env, caller: Address, lp_token: Address, reward_amount: i128) {
        // CRITICAL: keeper-only check — enforced FIRST before any state mutation
        let registered_keeper = get_keeper(&env);
        if caller != registered_keeper {
            panic!("harvest: unauthorized — caller is not the registered keeper");
        }

        caller.require_auth();

        if reward_amount <= 0 {
            panic!("harvest: reward_amount must be > 0");
        }

        // Transfer reward LP tokens from keeper into vault
        let token_client = token::Client::new(&env, &lp_token);
        token_client.transfer(&caller, &env.current_contract_address(), &reward_amount);

        // Increase total LP tracking — this increases value of all dfToken shares
        // No new dfTokens minted = compounding mechanism
        let total_lp = get_total_lp(&env);
        set_total_lp(&env, total_lp + reward_amount);

        emit_harvest(&env, &caller, &lp_token, reward_amount);
    }
}
