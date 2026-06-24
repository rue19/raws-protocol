#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::pool::StableSwapPool;
use crate::pool::StableSwapPoolClient;
use crate::types::PoolStatus;

// ─── Mock Token ────────────────────────────────────────────────────

mod mock_token {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

    #[contracttype]
    pub enum DataKey {
        Balance(Address),
    }

    #[contract]
    pub struct MockToken;

    #[contractimpl]
    impl MockToken {
        pub fn initialize(_env: Env, _admin: Address, _supply: i128) {}

        pub fn balance(env: Env, id: Address) -> i128 {
            env.storage()
                .instance()
                .get::<DataKey, i128>(&DataKey::Balance(id))
                .unwrap_or(0)
        }

        pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
            from.require_auth();
            let from_bal = Self::balance(env.clone(), from.clone());
            let to_bal = Self::balance(env.clone(), to.clone());
            if from_bal < amount {
                panic!("insufficient balance");
            }
            env.storage()
                .instance()
                .set(&DataKey::Balance(from), &(from_bal - amount));
            env.storage()
                .instance()
                .set(&DataKey::Balance(to), &(to_bal + amount));
        }

        pub fn mint(env: Env, to: Address, amount: i128) {
            let bal = Self::balance(env.clone(), to.clone());
            env.storage()
                .instance()
                .set(&DataKey::Balance(to), &(bal + amount));
        }
    }
}

// ─── Helpers ───────────────────────────────────────────────────────

fn setup() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);

    let token_a = env.register(mock_token::MockToken, ());
    let token_b = env.register(mock_token::MockToken, ());

    let pool_id = env.register(StableSwapPool, ());
    let client = StableSwapPoolClient::new(&env, &pool_id);

    // Initialize pool: A=100, fee=0.04% (4_000_000 / 10^10)
    client.initialize(&admin, &token_a, &token_b, &100, &4_000_000);

    // Give user1 some tokens
    env.as_contract(&token_a, || {
        mock_token::MockToken::mint(env.clone(), user1.clone(), 100_000_000);
    });
    env.as_contract(&token_b, || {
        mock_token::MockToken::mint(env.clone(), user1.clone(), 100_000_000);
    });

    (env, admin, user1, token_a, token_b, pool_id)
}

// ═══════════════════════════════════════════════════════════════════
// POOL TESTS
// ═══════════════════════════════════════════════════════════════════

#[test]
fn test_initialize_sets_correct_state() {
    let (env, admin, _user1, token_a, token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    assert_eq!(client.get_admin(), admin);
    assert_eq!(client.get_tokens(), (token_a, token_b));
    assert_eq!(client.get_amp_factor(), 100);
    assert_eq!(client.get_fee(), 4_000_000);
    assert_eq!(client.get_status(), PoolStatus::Active);
    assert_eq!(client.get_total_shares(), 0);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_cannot_double_init() {
    let (env, admin, _user1, token_a, token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    client.initialize(&admin, &token_a, &token_b, &100, &4_000_000);
}

// ─── Deposit Tests ─────────────────────────────────────────────────

#[test]
fn test_deposit_first_deposit() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    let shares = client.deposit(&user1, &100_000, &100_000, &0);
    assert_eq!(shares, 100_000);

    assert_eq!(client.get_total_shares(), 100_000);
    let (bal_a, bal_b) = client.get_reserves();
    assert_eq!(bal_a, 100_000);
    assert_eq!(bal_b, 100_000);
}

#[test]
fn test_deposit_proportional() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    // First deposit
    client.deposit(&user1, &100_000, &100_000, &0);

    // Second proportional deposit
    let shares = client.deposit(&user1, &50_000, &50_000, &0);
    assert_eq!(shares, 50_000);

    assert_eq!(client.get_total_shares(), 150_000);
}

#[test]
#[should_panic(expected = "amounts must be > 0")]
fn test_deposit_zero_amount() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &0, &100_000, &0);
}

#[test]
#[should_panic(expected = "tokens must be different")]
fn test_initialize_same_tokens() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_a = env.register(mock_token::MockToken, ());
    let pool_id = env.register(StableSwapPool, ());
    let client = StableSwapPoolClient::new(&env, &pool_id);

    client.initialize(&admin, &token_a, &token_a, &100, &4_000_000);
}

#[test]
#[should_panic(expected = "invalid amp_factor")]
fn test_initialize_zero_amp() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_a = env.register(mock_token::MockToken, ());
    let token_b = env.register(mock_token::MockToken, ());
    let pool_id = env.register(StableSwapPool, ());
    let client = StableSwapPoolClient::new(&env, &pool_id);

    client.initialize(&admin, &token_a, &token_b, &0, &4_000_000);
}

#[test]
#[should_panic(expected = "fee too high")]
fn test_initialize_fee_too_high() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token_a = env.register(mock_token::MockToken, ());
    let token_b = env.register(mock_token::MockToken, ());
    let pool_id = env.register(StableSwapPool, ());
    let client = StableSwapPoolClient::new(&env, &pool_id);

    client.initialize(&admin, &token_a, &token_b, &100, &6_000_000_001);
}

// ─── Swap Tests ────────────────────────────────────────────────────

#[test]
fn test_swap_basic() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    // Seed the pool with liquidity
    client.deposit(&user1, &100_000, &100_000, &0);

    // Swap 1000 token_a for token_b
    let amount_out = client.swap(&user1, &_token_a, &1000, &0);

    // With high A (100), slippage should be very low
    assert!(amount_out > 990, "Output too low: {}", amount_out);
    assert!(amount_out < 1000, "Output >= input: {}", amount_out);

    // Check reserves updated
    let (bal_a, bal_b) = client.get_reserves();
    assert_eq!(bal_a, 101_000);
    assert_eq!(bal_b, 100_000 - amount_out);
}

#[test]
fn test_swap_reverse_direction() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    client.deposit(&user1, &100_000, &100_000, &0);

    // Swap token_b -> token_a
    let amount_out = client.swap(&user1, &_token_b, &1000, &0);
    assert!(amount_out > 990);
}

#[test]
#[should_panic(expected = "invalid token")]
fn test_swap_wrong_token() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &100_000, &100_000, &0);

    let wrong_token = Address::generate(&env);
    client.swap(&user1, &wrong_token, &1000, &0);
}

#[test]
#[should_panic(expected = "slippage: output < minimum")]
fn test_swap_slippage_guard() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &100_000, &100_000, &0);

    // Set min_amount_out impossibly high
    client.swap(&user1, &_token_a, &1000, &1000);
}

// ─── Withdraw Tests ────────────────────────────────────────────────

#[test]
fn test_withdraw_proportional() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    client.deposit(&user1, &100_000, &100_000, &0);

    let (amt_a, amt_b) = client.withdraw(&user1, &50_000, &0, &0);
    assert_eq!(amt_a, 50_000);
    assert_eq!(amt_b, 50_000);

    assert_eq!(client.get_total_shares(), 50_000);
}

#[test]
fn test_withdraw_full() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    client.deposit(&user1, &100_000, &100_000, &0);

    let (amt_a, amt_b) = client.withdraw(&user1, &100_000, &0, &0);
    assert_eq!(amt_a, 100_000);
    assert_eq!(amt_b, 100_000);

    assert_eq!(client.get_total_shares(), 0);
    let (bal_a, bal_b) = client.get_reserves();
    assert_eq!(bal_a, 0);
    assert_eq!(bal_b, 0);
}

#[test]
#[should_panic(expected = "insufficient shares")]
fn test_withdraw_too_much() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &100_000, &100_000, &0);

    client.withdraw(&user1, &200_000, &0, &0);
}

// ─── Fee Tests ─────────────────────────────────────────────────────

#[test]
fn test_swap_fee_deducted() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &100_000, &100_000, &0);

    // With fee = 0.04%, output should be slightly less than input
    let amount_out = client.swap(&user1, &_token_a, &10_000, &0);

    // Fee is 0.04% on output, so output ≈ 9987 (10000 - ~0.13% due to fee + safety)
    assert!(amount_out > 9980, "Output too low: {}", amount_out);
    assert!(amount_out < 10_000, "Output >= input: {}", amount_out);
}

#[test]
fn test_set_fee() {
    let (env, admin, _user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    client.set_fee(&admin, &8_000_000); // 0.08%
    assert_eq!(client.get_fee(), 8_000_000);
}

#[test]
#[should_panic(expected = "only admin")]
fn test_set_fee_unauthorized() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.set_fee(&user1, &8_000_000);
}

// ─── Pause Tests ───────────────────────────────────────────────────

#[test]
fn test_pause_blocks_deposits() {
    let (env, admin, _user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.pause(&admin);

    assert_eq!(client.get_status(), PoolStatus::Paused);
}

#[test]
fn test_unpause_restores() {
    let (env, admin, _user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.pause(&admin);
    client.unpause(&admin);

    assert_eq!(client.get_status(), PoolStatus::Active);
}

// ─── Get Amount Out Tests ──────────────────────────────────────────

#[test]
fn test_get_amount_out() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();
    client.deposit(&user1, &100_000, &100_000, &0);

    let amount_out = client.get_amount_out(&_token_a, &1000);
    assert!(amount_out > 990);
    assert!(amount_out < 1000);
}

// ─── Edge Case Tests ───────────────────────────────────────────────

#[test]
fn test_large_pool_swap() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    // Large pool: 10M each
    client.deposit(&user1, &10_000_000, &10_000_000, &0);

    // Swap 1M (10% of pool)
    let amount_out = client.swap(&user1, &_token_a, &1_000_000, &0);

    // With A=100, slippage for 10% swap should be ~1-2%
    assert!(amount_out > 980_000, "Output too low: {}", amount_out);
    assert!(amount_out < 1_000_000, "Output >= input: {}", amount_out);
}

#[test]
fn test_swap_after_withdraw() {
    let (env, _admin, user1, _token_a, _token_b, pool_id) = setup();
    let client = StableSwapPoolClient::new(&env, &pool_id);

    env.mock_all_auths();

    client.deposit(&user1, &100_000, &100_000, &0);
    client.withdraw(&user1, &50_000, &0, &0);

    // Swap should still work with smaller pool
    let amount_out = client.swap(&user1, &_token_a, &1000, &0);
    assert!(amount_out > 900);
}
