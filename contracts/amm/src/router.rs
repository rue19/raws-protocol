use soroban_sdk::{contract, contractimpl, token, Address, Env};

use crate::pool::StableSwapPoolClient;

#[contract]
pub struct Router;

#[contractimpl]
impl Router {
    /// Add liquidity to a pool via the router.
    pub fn router_add_liquidity(
        env: Env,
        caller: Address,
        pool: Address,
        amount_a: i128,
        amount_b: i128,
        min_shares: i128,
    ) -> i128 {
        caller.require_auth();

        let client = StableSwapPoolClient::new(&env, &pool);

        // Pull tokens from caller to pool
        let (token_a, token_b) = client.get_tokens();
        let token_a_client = token::Client::new(&env, &token_a);
        let token_b_client = token::Client::new(&env, &token_b);

        token_a_client.transfer(&caller, &pool, &amount_a);
        token_b_client.transfer(&caller, &pool, &amount_b);

        client.deposit(&caller, &amount_a, &amount_b, &min_shares)
    }

    /// Remove liquidity from a pool via the router.
    pub fn router_remove_liquidity(
        env: Env,
        caller: Address,
        pool: Address,
        share_amount: i128,
        min_amount_a: i128,
        min_amount_b: i128,
    ) -> (i128, i128) {
        caller.require_auth();

        let client = StableSwapPoolClient::new(&env, &pool);
        client.withdraw(&caller, &share_amount, &min_amount_a, &min_amount_b)
    }

    /// Swap tokens through a pool via the router.
    pub fn router_swap(
        env: Env,
        caller: Address,
        pool: Address,
        token_in: Address,
        amount_in: i128,
        min_amount_out: i128,
    ) -> i128 {
        caller.require_auth();

        let client = StableSwapPoolClient::new(&env, &pool);

        // Pull token_in from caller to pool
        let token_in_client = token::Client::new(&env, &token_in);
        token_in_client.transfer(&caller, &pool, &amount_in);

        client.swap(&caller, &token_in, &amount_in, &min_amount_out)
    }

    /// Get expected output for a swap (read-only, via pool).
    pub fn router_quote_swap(env: Env, pool: Address, token_in: Address, amount_in: i128) -> i128 {
        let client = StableSwapPoolClient::new(&env, &pool);
        client.get_amount_out(&token_in, &amount_in)
    }

    /// Get reserves for a pool (read-only, via pool).
    pub fn router_get_reserves(env: Env, pool: Address) -> (i128, i128) {
        let client = StableSwapPoolClient::new(&env, &pool);
        client.get_reserves()
    }
}
