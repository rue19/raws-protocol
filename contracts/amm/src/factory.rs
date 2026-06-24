use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

use crate::storage::{get_all_pools, set_all_pools};
use crate::types::StorageKey;

#[contract]
pub struct Factory;

#[contractimpl]
impl Factory {
    /// Initialize the factory.
    pub fn factory_init(env: Env, admin: Address) {
        env.storage()
            .instance()
            .set(&StorageKey::PoolAdmin, &admin);
    }

    /// Register a pool address.
    pub fn factory_register_pool(
        env: Env,
        caller: Address,
        pool_address: Address,
    ) {
        caller.require_auth();

        let admin: Address = env
            .storage()
            .instance()
            .get(&StorageKey::PoolAdmin)
            .expect("factory not initialized");

        if caller != admin {
            panic!("only admin");
        }

        let mut pools = get_all_pools(&env);
        pools.push_back(pool_address);
        set_all_pools(&env, &pools);
    }

    /// Get all registered pools.
    pub fn factory_get_pools(env: Env) -> Vec<Address> {
        get_all_pools(&env)
    }

    /// Get pool count.
    pub fn factory_pool_count(env: Env) -> u32 {
        get_all_pools(&env).len()
    }
}
