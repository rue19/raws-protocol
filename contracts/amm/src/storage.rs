use soroban_sdk::{Address, Env, Vec};

use crate::types::{PoolConfig, StorageKey};

pub fn get_pool_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::PoolAdmin)
        .expect("pool admin not initialized")
}

pub fn set_pool_admin(env: &Env, admin: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::PoolAdmin, admin);
}

pub fn get_pool_config(env: &Env) -> PoolConfig {
    env.storage()
        .instance()
        .get::<StorageKey, PoolConfig>(&StorageKey::PoolConfig)
        .expect("pool not initialized")
}

pub fn get_pool_config_option(env: &Env) -> Option<PoolConfig> {
    env.storage()
        .instance()
        .get::<StorageKey, PoolConfig>(&StorageKey::PoolConfig)
}

pub fn set_pool_config(env: &Env, config: &PoolConfig) {
    env.storage()
        .instance()
        .set(&StorageKey::PoolConfig, config);
}

pub fn get_total_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get::<StorageKey, i128>(&StorageKey::TotalSupply)
        .unwrap_or(0)
}

pub fn set_total_supply(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StorageKey::TotalSupply, &amount);
}

pub fn get_balance(env: &Env, token: &Address) -> i128 {
    env.storage()
        .instance()
        .get::<StorageKey, i128>(&StorageKey::Balance(token.clone()))
        .unwrap_or(0)
}

pub fn set_balance(env: &Env, token: &Address, amount: i128) {
    env.storage()
        .instance()
        .set(&StorageKey::Balance(token.clone()), &amount);
}

pub fn get_user_shares(env: &Env, user: &Address) -> i128 {
    env.storage()
        .instance()
        .get::<StorageKey, i128>(&StorageKey::UserShares(user.clone()))
        .unwrap_or(0)
}

pub fn set_user_shares(env: &Env, user: &Address, amount: i128) {
    env.storage()
        .instance()
        .set(&StorageKey::UserShares(user.clone()), &amount);
}

pub fn get_token_a(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::TokenA)
        .expect("token_a not set")
}

pub fn set_token_a(env: &Env, token: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::TokenA, token);
}

pub fn get_token_b(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::TokenB)
        .expect("token_b not set")
}

pub fn set_token_b(env: &Env, token: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::TokenB, token);
}

pub fn get_all_pools(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get::<StorageKey, Vec<Address>>(&StorageKey::FactoryPools)
        .unwrap_or(soroban_sdk::vec![&env])
}

pub fn set_all_pools(env: &Env, pools: &Vec<Address>) {
    env.storage()
        .instance()
        .set(&StorageKey::FactoryPools, pools);
}
