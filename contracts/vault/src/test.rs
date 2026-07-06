#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::types::VaultMode;
use crate::VaultContract;
use crate::VaultContractClient;

// ─── Mock Token Contract ───────────────────────────────────────────

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
        pub fn initialize(env: Env, admin: Address, supply: i128) {
            env.storage()
                .instance()
                .set(&DataKey::Balance(admin.clone()), &supply);
        }

        pub fn balance(env: Env, id: Address) -> i128 {
            env.storage()
                .instance()
                .get::<DataKey, i128>(&DataKey::Balance(id))
                .unwrap_or(0)
        }

        pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
            from.require_auth();

            let from_balance = Self::balance(env.clone(), from.clone());
            let to_balance = Self::balance(env.clone(), to.clone());

            if from_balance < amount {
                panic!("insufficient balance");
            }

            env.storage()
                .instance()
                .set(&DataKey::Balance(from), &(from_balance - amount));
            env.storage()
                .instance()
                .set(&DataKey::Balance(to), &(to_balance + amount));
        }
    }
}

// ─── Helpers ───────────────────────────────────────────────────────

fn setup() -> (Env, Address, Address, Address, Address) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);
    let user1 = Address::generate(&env);

    // Register mock token
    let token_contract_id = env.register(mock_token::MockToken, ());
    env.as_contract(&token_contract_id, || {
        mock_token::MockToken::initialize(env.clone(), admin.clone(), 1_000_000_000);
    });

    // Register vault
    let vault_contract_id = env.register(VaultContract, ());
    let _client = VaultContractClient::new(&env, &vault_contract_id);

    // Give user1 some LP tokens
    env.as_contract(&token_contract_id, || {
        mock_token::MockToken::initialize(env.clone(), user1.clone(), 100_000);
    });

    (env, admin, keeper, user1, token_contract_id)
}

// ─── Initialization Tests ──────────────────────────────────────────

#[test]
fn test_initialize_sets_admin_and_keeper() {
    let (env, admin, keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    assert_eq!(client.get_keeper(), keeper);
}

#[test]
fn test_initialize_sets_default_mode_as_yield_mode() {
    let (env, admin, keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    assert_eq!(client.get_mode(), VaultMode::YieldMode);
}

// ─── Deposit Tests ─────────────────────────────────────────────────

#[test]
fn test_deposit_first_deposit_mints_1_to_1() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    let df_tokens = client.deposit(&user1, &lp_token, &1000);

    assert_eq!(df_tokens, 1000);
    assert_eq!(client.get_total_supply(), 1000);
    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 1000);
    assert_eq!(lp_eq, 1000);
}

#[test]
fn test_deposit_second_deposit_mints_proportionally() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);

    let df_tokens = client.deposit(&user1, &lp_token, &500);
    assert_eq!(df_tokens, 500);
    assert_eq!(client.get_total_supply(), 1500);
}

#[test]
#[should_panic(expected = "deposit: amount must be > 0")]
fn test_deposit_zero_amount_panics() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &0);
}

#[test]
fn test_deposit_requires_auth() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    // No mock_all_auths — should fail on missing auth
    let result = client.try_deposit(&user1, &lp_token, &1000);
    assert!(result.is_err());
}

// ─── Withdraw Tests ────────────────────────────────────────────────

#[test]
fn test_withdraw_full_balance_returns_all_lp() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);
    let lp_out = client.withdraw(&user1, &lp_token, &1000);

    assert_eq!(lp_out, 1000);
    assert_eq!(client.get_total_supply(), 0);
    let (df_bal, _lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 0);
}

#[test]
fn test_withdraw_partial_balance_is_proportional() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);
    let lp_out = client.withdraw(&user1, &lp_token, &500);

    assert_eq!(lp_out, 500);
    assert_eq!(client.get_total_supply(), 500);
    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 500);
    assert_eq!(lp_eq, 500);
}

#[test]
#[should_panic(expected = "withdraw: insufficient dfTokens")]
fn test_withdraw_more_than_balance_panics() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);
    client.withdraw(&user1, &lp_token, &2000);
}

#[test]
#[should_panic(expected = "withdraw: df_token_amount must be > 0")]
fn test_withdraw_zero_amount_panics() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);
    client.withdraw(&user1, &lp_token, &0);
}

#[test]
fn test_withdraw_requires_auth() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    // Set up state manually so we don't need mock_all_auths
    env.as_contract(&vault_id, || {
        crate::storage::set_user_shares(&env, &user1, 1000);
        crate::storage::set_shares_supply(&env, 1000);
        crate::storage::set_total_lp(&env, 1000);
    });

    // No mock_all_auths — should fail on missing auth
    let result = client.try_withdraw(&user1, &lp_token, &500);
    assert!(result.is_err());
}

// ─── Balance Tests ─────────────────────────────────────────────────

#[test]
fn test_get_balance_returns_zero_for_new_user() {
    let (env, admin, keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    let new_user = Address::generate(&env);
    let (df_bal, lp_eq) = client.get_balance(&new_user);
    assert_eq!(df_bal, 0);
    assert_eq!(lp_eq, 0);
}

#[test]
fn test_get_balance_returns_correct_after_deposit() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();
    client.deposit(&user1, &lp_token, &1000);

    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 1000);
    assert_eq!(lp_eq, 1000);
}

#[test]
fn test_get_balance_returns_correct_after_partial_withdraw() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();
    client.deposit(&user1, &lp_token, &1000);
    client.withdraw(&user1, &lp_token, &400);

    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 600);
    assert_eq!(lp_eq, 600);
}

// ─── Harvest Tests ─────────────────────────────────────────────────

#[test]
fn test_harvest_increases_lp_per_share() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);

    // Give keeper LP tokens to transfer as reward
    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), keeper.clone(), 500);
    });

    client.harvest(&keeper, &lp_token, &200);

    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 1000);
    assert_eq!(lp_eq, 1200);
}

#[test]
#[should_panic(expected = "harvest: unauthorized")]
fn test_harvest_unauthorized_caller_panics() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();
    client.deposit(&user1, &lp_token, &1000);

    client.harvest(&user1, &lp_token, &200);
}

#[test]
#[should_panic(expected = "harvest: reward_amount must be > 0")]
fn test_harvest_zero_amount_panics() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();
    client.deposit(&user1, &lp_token, &1000);

    client.harvest(&keeper, &lp_token, &0);
}

#[test]
fn test_harvest_does_not_mint_new_dftokens() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);

    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), keeper.clone(), 500);
    });

    let supply_before = client.get_total_supply();
    client.harvest(&keeper, &lp_token, &300);
    let supply_after = client.get_total_supply();

    assert_eq!(supply_before, supply_after);
}

// ─── Integration Tests ─────────────────────────────────────────────

#[test]
fn test_full_lifecycle_deposit_harvest_withdraw() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    let df = client.deposit(&user1, &lp_token, &1000);
    assert_eq!(df, 1000);

    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), keeper.clone(), 500);
    });

    client.harvest(&keeper, &lp_token, &200);

    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 1000);
    assert_eq!(lp_eq, 1200);

    let lp_out = client.withdraw(&user1, &lp_token, &1000);
    assert_eq!(lp_out, 1200);

    assert_eq!(client.get_total_supply(), 0);
    let (df_bal, lp_eq) = client.get_balance(&user1);
    assert_eq!(df_bal, 0);
    assert_eq!(lp_eq, 0);
}

#[test]
fn test_two_users_proportional_shares() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    let user2 = Address::generate(&env);

    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), user2.clone(), 100_000);
    });

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);
    client.deposit(&user2, &lp_token, &3000);

    assert_eq!(client.get_total_supply(), 4000);

    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), keeper.clone(), 1000);
    });

    client.harvest(&keeper, &lp_token, &1000);

    let (df1, lp1) = client.get_balance(&user1);
    assert_eq!(df1, 1000);
    assert_eq!(lp1, 1250);

    let (df2, lp2) = client.get_balance(&user2);
    assert_eq!(df2, 3000);
    assert_eq!(lp2, 3750);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 TESTS
// ═══════════════════════════════════════════════════════════════════

// ─── Mock Soroswap Router ──────────────────────────────────────────

mod mock_router {
    use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

    #[contract]
    pub struct MockRouter;

    #[contractimpl]
    impl MockRouter {
        pub fn get_amounts_out(_env: Env, amount_in: i128, path: Vec<Address>) -> Vec<i128> {
            let mut out = Vec::new(&_env);
            out.push_back(amount_in);
            if path.len() == 2 {
                out.push_back(amount_in);
            }
            out
        }

        pub fn swap_exact_(
            env: Env,
            amount_in: i128,
            _amount_out_min: i128,
            _path: Vec<Address>,
            _to: Address,
            _deadline: u64,
        ) -> Vec<i128> {
            let mut amounts = Vec::new(&env);
            amounts.push_back(amount_in);
            amounts.push_back(amount_in);
            amounts
        }

        pub fn add_liquidity(
            _env: Env,
            _token_a: Address,
            _token_b: Address,
            amount_a: i128,
            amount_b: i128,
            _amount_a_min: i128,
            _amount_b_min: i128,
            _to: Address,
            _deadline: u64,
        ) -> (i128, i128, i128) {
            let lp = if amount_a < amount_b { amount_a } else { amount_b };
            (amount_a, amount_b, lp)
        }
    }
}

// ─── Mock Soroswap Pair Pool ────────────────────────────────────────

mod mock_pool {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

    #[contracttype]
    pub enum DataKey {
        Token0,
        Token1,
    }

    #[contract]
    pub struct MockPool;

    #[contractimpl]
    impl MockPool {
        pub fn init(env: Env, token_0: Address, token_1: Address) {
            env.storage().instance().set(&DataKey::Token0, &token_0);
            env.storage().instance().set(&DataKey::Token1, &token_1);
        }

        pub fn token_0(env: Env) -> Address {
            env.storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::Token0)
                .expect("token_0 not set")
        }

        pub fn token_1(env: Env) -> Address {
            env.storage()
                .instance()
                .get::<DataKey, Address>(&DataKey::Token1)
                .expect("token_1 not set")
        }
    }
}

// ─── Mock Token with Mint ──────────────────────────────────────────

mod mock_token_mint {
    use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

    #[contracttype]
    pub enum DataKey {
        Balance(Address),
    }

    #[contract]
    pub struct MockTokenMint;

    #[contractimpl]
    impl MockTokenMint {
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

// ─── Phase 3 Helpers ────────────────────────────────────────────────

fn setup_phase3() -> (
    Env,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);
    let user1 = Address::generate(&env);

    // Register mock tokens
    let token_a_id = env.register(mock_token_mint::MockTokenMint, ());
    let token_b_id = env.register(mock_token_mint::MockTokenMint, ());
    // Register mock router
    let router_id = env.register(mock_router::MockRouter, ());
    // Register vault
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    // Initialize vault
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    // Set soroswap router
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    // Give user1 some token_a
    env.as_contract(&token_a_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), user1.clone(), 100_000);
    });

    // Give vault some token_b for router swaps (to simulate receiving swapped tokens)
    env.as_contract(&token_b_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), vault_id.clone(), 1_000_000);
    });

    // Give router some token_b for swaps
    env.as_contract(&token_b_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), router_id.clone(), 1_000_000);
    });

    (
        env,
        admin,
        keeper,
        user1,
        token_a_id,
        token_b_id,
        router_id,
    )
}

// ─── Phase 3 Unit Tests ─────────────────────────────────────────────

#[test]
fn test_calc_split_ratio_balanced_pool() {
    let env = Env::default();
    let reserve_in = 100_000;
    let reserve_out = 100_000;
    let amount_in = 10_000;
    let fee_bps = 30;

    let (keep, swap) = crate::calc_split_ratio(&env, reserve_in, reserve_out, amount_in, fee_bps);

    assert!(swap > 0, "should swap some");
    assert!(keep > 0, "should keep some");
    assert_eq!(keep + swap, amount_in);

    // For a balanced pool, optimal split should be roughly 50/50
    let half = amount_in / 2;
    let diff = (swap - half).abs();
    assert!(
        diff < amount_in / 20,
        "swap amount ({}) should be close to half ({})",
        swap,
        half
    );
}

#[test]
fn test_calc_split_ratio_odd_amount() {
    let env = Env::default();
    let (keep, swap) = crate::calc_split_ratio(&env, 100_000, 100_000, 1001, 30);
    assert_eq!(keep + swap, 1001);
}

#[test]
fn test_calc_min_out() {
    let min = crate::calc_min_out(1000);
    assert_eq!(min, 995); // 1000 * 9950 / 10000 = 995
}

#[test]
fn test_calc_min_out_small_amount() {
    let min = crate::calc_min_out(100);
    assert_eq!(min, 99); // 100 * 9950 / 10000 = 99.5 → truncated to 99
}

#[test]
fn test_set_get_soroswap_router() {
    let (env, admin, _keeper, _user1, _token_a, _token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &Address::generate(&env), &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);
    assert_eq!(client.get_soroswap_router(), router_id);
}

#[test]
#[should_panic(expected = "set_soroswap_router: only admin")]
fn test_set_soroswap_router_unauthorized() {
    let (env, _admin, _keeper, user1, _token_a, _token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    let admin = Address::generate(&env);
    client.initialize(&admin, &Address::generate(&env), &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&user1, &router_id); // user1 is not admin
}

#[test]
#[should_panic(expected = "deposit_single_asset: amount_in must be > 0")]
fn test_deposit_single_asset_zero_amount() {
    let (env, admin, keeper, user1, token_a, token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    // Create and initialize a mock pool
    let pool_id = env.register(mock_pool::MockPool, ());
    env.as_contract(&pool_id, || {
        mock_pool::MockPool::init(env.clone(), token_a.clone(), token_b.clone());
    });

    client.deposit_single_asset(&user1, &token_a, &0, &pool_id, &0);
}

#[test]
fn test_deposit_single_asset_success() {
    let (env, admin, keeper, user1, token_a, token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    // Create and initialize a mock pool
    let pool_id = env.register(mock_pool::MockPool, ());
    env.as_contract(&pool_id, || {
        mock_pool::MockPool::init(env.clone(), token_a.clone(), token_b.clone());
    });

    // Deposit: 1000 token_a → 500 kept, 500 swapped 1:1 → ~500 LP tokens minted
    let df_tokens = client.deposit_single_asset(&user1, &token_a, &1000, &pool_id, &0);
    assert!(df_tokens > 0);

    // Check user got dfTokens
    let (df_bal, _lp_eq) = client.get_balance(&user1);
    assert!(df_bal > 0);
}

#[test]
fn test_deposit_single_asset_stores_position() {
    let (env, admin, keeper, user1, token_a, token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    let pool_id = env.register(mock_pool::MockPool, ());
    env.as_contract(&pool_id, || {
        mock_pool::MockPool::init(env.clone(), token_a.clone(), token_b.clone());
    });

    client.deposit_single_asset(&user1, &token_a, &1000, &pool_id, &0);

    // Verify position was stored (must read as contract)
    let pos = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &pool_id)
    });
    assert!(pos.is_some());
    let pos = pos.unwrap();
    assert!(pos.lp_tokens > 0);
    assert_eq!(pos.token_a, token_a);
    assert_eq!(pos.token_b, token_b);
}

#[test]
fn test_deposit_single_asset_multiple_deposits_accumulate() {
    let (env, admin, keeper, user1, token_a, token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    let pool_id = env.register(mock_pool::MockPool, ());
    env.as_contract(&pool_id, || {
        mock_pool::MockPool::init(env.clone(), token_a.clone(), token_b.clone());
    });

    client.deposit_single_asset(&user1, &token_a, &1000, &pool_id, &0);
    let pos1 = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &pool_id)
    }).unwrap();

    // Give user more tokens for second deposit
    env.as_contract(&token_a, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), user1.clone(), 100_000);
    });

    client.deposit_single_asset(&user1, &token_a, &2000, &pool_id, &0);
    let pos2 = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &pool_id)
    }).unwrap();

    // LP tokens should accumulate
    assert!(pos2.lp_tokens > pos1.lp_tokens);
}

#[test]
fn test_deposit_single_asset_increases_total_supply() {
    let (env, admin, keeper, user1, token_a, token_b, router_id) = setup_phase3();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    env.mock_all_auths();
    client.set_soroswap_router(&admin, &router_id);

    let supply_before = client.get_total_supply();
    let pool_id = env.register(mock_pool::MockPool, ());
    env.as_contract(&pool_id, || {
        mock_pool::MockPool::init(env.clone(), token_a.clone(), token_b.clone());
    });

    client.deposit_single_asset(&user1, &token_a, &1000, &pool_id, &0);

    let supply_after = client.get_total_supply();
    assert!(supply_after > supply_before);
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 4 TESTS — SafeMode deposit via RAW$ AMM
// ═══════════════════════════════════════════════════════════════════

use raws_amm::RawsAMM;

fn setup_phase4() -> (
    Env,
    Address,
    Address,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    let keeper = Address::generate(&env);
    let user1 = Address::generate(&env);

    // Register mock tokens
    let token_a_id = env.register(mock_token_mint::MockTokenMint, ());
    let token_b_id = env.register(mock_token_mint::MockTokenMint, ());

    // Register the real RAW$ AMM contract
    let amm_id = env.register_contract(None, RawsAMM);

    // Register vault
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    // Initialize vault in SafeMode
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);

    // Set the AMM address on the vault
    client.set_amm_address(&admin, &amm_id);

    // Initialize the AMM with 5M of each token (admin provides initial liquidity)
    env.as_contract(&token_a_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), admin.clone(), 10_000_000);
    });
    env.as_contract(&token_b_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), admin.clone(), 10_000_000);
    });

    let amm_client = raws_amm::RawsAMMClient::new(&env, &amm_id);
    amm_client.init(
        &token_a_id,
        &token_b_id,
        &5_000_000,
        &5_000_000,
        &admin,
    );

    // Give user1 some token_a for depositing
    env.as_contract(&token_a_id, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), user1.clone(), 100_000);
    });

    (
        env,
        admin,
        keeper,
        user1,
        token_a_id,
        token_b_id,
        amm_id,
    )
}

#[test]
fn test_set_get_amm_address() {
    let (env, admin, _keeper, _user1, _token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &Address::generate(&env), &VaultMode::SafeMode);

    client.set_amm_address(&admin, &amm_id);
    assert_eq!(client.get_amm_address(), amm_id);
}

#[test]
#[should_panic(expected = "set_amm_address: only admin")]
fn test_set_amm_address_unauthorized() {
    let (env, _admin, _keeper, user1, _token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    let admin = Address::generate(&env);
    client.initialize(&admin, &Address::generate(&env), &VaultMode::SafeMode);

    client.set_amm_address(&user1, &amm_id); // user1 is not admin
}

#[test]
#[should_panic(expected = "deposit_safe_mode: amount_in must be > 0")]
fn test_deposit_safe_mode_zero_amount() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    client.deposit_safe_mode(&user1, &token_a, &0, &0);
}

#[test]
#[should_panic(expected = "VaultNotInSafeMode")]
fn test_deposit_safe_mode_wrong_mode() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    // Initialize in YieldMode instead of SafeMode
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);
    client.set_amm_address(&admin, &amm_id);

    client.deposit_safe_mode(&user1, &token_a, &1000, &0);
}

#[test]
fn test_deposit_safe_mode_success() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    let df_tokens = client.deposit_safe_mode(&user1, &token_a, &10_000, &0);
    assert!(df_tokens > 0, "Should mint dfTokens");

    let (df_bal, _lp_eq) = client.get_balance(&user1);
    assert!(df_bal > 0, "User should have dfToken balance");
}

#[test]
fn test_deposit_safe_mode_stores_position() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    client.deposit_safe_mode(&user1, &token_a, &10_000, &0);

    let pos = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &amm_id)
    });
    assert!(pos.is_some(), "Position should be stored");
    let pos = pos.unwrap();
    assert!(pos.lp_tokens > 0, "LP tokens should be > 0");
    assert_eq!(pos.pool_id, amm_id);
}

#[test]
fn test_deposit_safe_mode_multiple_deposits_accumulate() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    client.deposit_safe_mode(&user1, &token_a, &5_000, &0);
    let pos1 = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &amm_id)
    })
    .unwrap();

    // Give user1 more tokens for second deposit
    env.as_contract(&token_a, || {
        mock_token_mint::MockTokenMint::mint(env.clone(), user1.clone(), 100_000);
    });

    client.deposit_safe_mode(&user1, &token_a, &10_000, &0);
    let pos2 = env.as_contract(&vault_id, || {
        crate::storage::get_position(&env, &amm_id)
    })
    .unwrap();

    assert!(
        pos2.lp_tokens > pos1.lp_tokens,
        "LP tokens should accumulate across deposits"
    );
}

#[test]
fn test_deposit_safe_mode_increases_total_supply() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    let supply_before = client.get_total_supply();
    client.deposit_safe_mode(&user1, &token_a, &10_000, &0);
    let supply_after = client.get_total_supply();

    assert!(
        supply_after > supply_before,
        "Total supply should increase"
    );
}

#[test]
fn test_deposit_safe_mode_balanced_lp() {
    let (env, admin, keeper, user1, token_a, _token_b, amm_id) = setup_phase4();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);
    client.set_amm_address(&admin, &amm_id);

    let amm_client = raws_amm::RawsAMMClient::new(&env, &amm_id);
    let balances_before = amm_client.get_balances();
    let shares_before = amm_client.get_total_shares();

    client.deposit_safe_mode(&user1, &token_a, &10_000, &0);

    let balances_after = amm_client.get_balances();
    let shares_after = amm_client.get_total_shares();

    // AMM token_a balance should increase (user deposited token_a)
    assert!(
        balances_after.0 > balances_before.0,
        "AMM token_a should increase"
    );
    // AMM total shares should increase (liquidity was added)
    assert!(
        shares_after > shares_before,
        "AMM total shares should increase — liquidity added"
    );
}

// ─── Keeper Isolation Tests (Work Stream 1A) ──────────────────────

#[test]
#[should_panic(expected = "initialize: admin and keeper must be different addresses")]
fn test_initialize_rejects_admin_equals_keeper() {
    let (env, admin, _keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);

    client.initialize(&admin, &admin, &VaultMode::YieldMode);
}

#[test]
#[should_panic(expected = "Keeper cannot call user functions")]
fn test_deposit_rejects_keeper() {
    let (env, admin, keeper, _user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&keeper, &lp_token, &1000);
}

#[test]
#[should_panic(expected = "Keeper cannot call user functions")]
fn test_withdraw_rejects_keeper() {
    let (env, admin, keeper, user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    env.mock_all_auths();

    client.deposit(&user1, &lp_token, &1000);

    client.withdraw(&keeper, &lp_token, &1000);
}

#[test]
fn test_harvest_allows_keeper() {
    let (env, admin, keeper, _user1, lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    // Give keeper some LP tokens (harvest transfers from keeper to vault)
    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), keeper.clone(), 5000);
    });
    // Also seed vault so it has room to receive
    env.as_contract(&lp_token, || {
        mock_token::MockToken::initialize(env.clone(), vault_id.clone(), 5000);
    });

    env.mock_all_auths();

    client.harvest(&keeper, &lp_token, &1000);
}

// ─── One-Time-Set Guard Tests (Work Stream 1B) ────────────────────

#[test]
#[should_panic(expected = "set_soroswap_router: already set")]
fn test_set_soroswap_router_rejects_double_set() {
    let (env, admin, keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::YieldMode);

    let router1 = Address::generate(&env);
    let router2 = Address::generate(&env);

    env.mock_all_auths();

    client.set_soroswap_router(&admin, &router1);
    client.set_soroswap_router(&admin, &router2);
}

#[test]
#[should_panic(expected = "set_amm_address: already set")]
fn test_set_amm_address_rejects_double_set() {
    let (env, admin, keeper, _user1, _lp_token) = setup();
    let vault_id = env.register(VaultContract, ());
    let client = VaultContractClient::new(&env, &vault_id);
    client.initialize(&admin, &keeper, &VaultMode::SafeMode);

    let amm1 = Address::generate(&env);
    let amm2 = Address::generate(&env);

    env.mock_all_auths();

    client.set_amm_address(&admin, &amm1);
    client.set_amm_address(&admin, &amm2);
}

// ─── Optimal Split Formula Tests (Work Stream 1C) ─────────────────

#[test]
fn test_calc_split_ratio_unbalanced_pool() {
    let env = Env::default();
    // Pool is 2:1 imbalanced — token_in is abundant, token_pair is scarce
    let reserve_in = 200_000;
    let reserve_out = 100_000;
    let amount_in = 10_000;
    let fee_bps = 30;

    let (keep, swap) = crate::calc_split_ratio(&env, reserve_in, reserve_out, amount_in, fee_bps);

    assert!(swap > 0);
    assert!(keep > 0);
    assert_eq!(keep + swap, amount_in);

    // When token_in is abundant (rx > ry), each unit of token_in converts to
    // more than 1 unit of token_pair, so we swap LESS than half.
    assert!(
        swap < amount_in / 2,
        "when token_in is abundant (rx > ry), swap ({}) should be < half ({})",
        swap,
        amount_in / 2
    );
}

#[test]
fn test_calc_split_ratio_zero_reserves_fallback() {
    let env = Env::default();
    let (keep, swap) = crate::calc_split_ratio(&env, 0, 100_000, 10_000, 30);

    assert_eq!(keep + swap, 10_000);
    assert_eq!(keep, 5000);
    assert_eq!(swap, 5000);
}

#[test]
fn test_calc_split_ratio_full_fee_erosion() {
    let env = Env::default();
    let (keep, swap) = crate::calc_split_ratio(&env, 100_000, 100_000, 10_000, 10_000);

    // With 100% fee, the formula returns 50/50 fallback
    assert_eq!(keep + swap, 10_000);
}
