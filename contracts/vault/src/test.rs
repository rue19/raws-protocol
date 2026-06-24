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
