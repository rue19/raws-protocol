use soroban_sdk::{Address, Env};

use crate::types::{StorageKey, VaultMode};

pub fn get_shares_supply(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get::<StorageKey, i128>(&StorageKey::SharesSupply)
        .unwrap_or(0)
}

pub fn set_shares_supply(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StorageKey::SharesSupply, &amount);
}

pub fn get_total_lp(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get::<StorageKey, i128>(&StorageKey::TotalLp)
        .unwrap_or(0)
}

pub fn set_total_lp(env: &Env, amount: i128) {
    env.storage()
        .instance()
        .set(&StorageKey::TotalLp, &amount);
}

#[allow(dead_code)]
pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::Admin)
        .expect("admin not initialized")
}

pub fn set_admin(env: &Env, admin: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::Admin, admin);
}

pub fn get_keeper(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::Keeper)
        .expect("keeper not initialized")
}

pub fn set_keeper(env: &Env, keeper: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::Keeper, keeper);
}

pub fn get_mode(env: &Env) -> VaultMode {
    env.storage()
        .instance()
        .get::<StorageKey, VaultMode>(&StorageKey::Mode)
        .unwrap_or(VaultMode::YieldMode)
}

pub fn set_mode(env: &Env, mode: &VaultMode) {
    env.storage()
        .instance()
        .set(&StorageKey::Mode, mode);
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

pub fn is_initialized(env: &Env) -> bool {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::Admin)
        .is_some()
}

pub fn get_soroswap_router(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::SoroswapRouter)
        .expect("soroswap router not initialized")
}

pub fn set_soroswap_router(env: &Env, router: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::SoroswapRouter, router);
}

pub fn get_position(env: &Env, pool_id: &Address) -> Option<crate::types::LPPosition> {
    env.storage()
        .instance()
        .get::<StorageKey, crate::types::LPPosition>(&StorageKey::Positions(pool_id.clone()))
}

pub fn set_position(env: &Env, pool_id: &Address, position: &crate::types::LPPosition) {
    env.storage()
        .instance()
        .set(&StorageKey::Positions(pool_id.clone()), position);
}

pub fn get_amm_address(env: &Env) -> Option<Address> {
    env.storage()
        .instance()
        .get::<StorageKey, Address>(&StorageKey::RawsAmmAddress)
}

pub fn set_amm_address(env: &Env, amm: &Address) {
    env.storage()
        .instance()
        .set(&StorageKey::RawsAmmAddress, amm);
}
