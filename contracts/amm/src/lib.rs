#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct AmmContract;

#[contractimpl]
impl AmmContract {
    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn test_version() {
        let env = Env::default();
        let contract_id = env.register(AmmContract, ());
        let client = AmmContractClient::new(&env, &contract_id);
        assert_eq!(client.version(), 1);
    }
}
