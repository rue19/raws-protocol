use soroban_sdk::{Address, Env};

use crate::DataKey;

pub fn get_token_a(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::TokenA)
        .unwrap()
}

pub fn get_token_b(env: &Env) -> Address {
    env.storage()
        .instance()
        .get::<DataKey, Address>(&DataKey::TokenB)
        .unwrap()
}

pub fn get_balances(env: &Env) -> (i128, i128) {
    env.storage()
        .instance()
        .get::<DataKey, (i128, i128)>(&DataKey::Balances)
        .unwrap()
}

pub fn set_balances(env: &Env, balances: &(i128, i128)) {
    env.storage()
        .instance()
        .set(&DataKey::Balances, balances);
}

pub fn get_total_shares(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get::<DataKey, i128>(&DataKey::TotalShares)
        .unwrap_or(0)
}

pub fn set_total_shares(env: &Env, total: i128) {
    env.storage().instance().set(&DataKey::TotalShares, &total);
}

pub fn get_shares(env: &Env, user: &Address) -> i128 {
    env.storage()
        .persistent()
        .get::<DataKey, i128>(&DataKey::Shares(user.clone()))
        .unwrap_or(0)
}

pub fn set_shares(env: &Env, user: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::Shares(user.clone()), &amount);
}
