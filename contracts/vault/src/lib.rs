#![no_std]
use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol, String};

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Store a greeting message on-chain (smoke test only — replaced in Step 2)
    pub fn hello(env: Env, to: String) -> String {
        env.storage()
            .instance()
            .set(&symbol_short!("msg"), &to);
        env.storage()
            .instance()
            .get::<Symbol, String>(&symbol_short!("msg"))
            .expect("No message stored")
    }

    /// Return the RAW$ protocol version
    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_hello() {
        let env = Env::default();
        let contract_id = env.register(VaultContract, ());
        let client = VaultContractClient::new(&env, &contract_id);
        let msg = client.hello(&String::from_str(&env, "RAW$"));
        assert_eq!(msg, String::from_str(&env, "RAW$"));
    }

    #[test]
    fn test_version() {
        let env = Env::default();
        let contract_id = env.register(VaultContract, ());
        let client = VaultContractClient::new(&env, &contract_id);
        assert_eq!(client.version(), 1);
    }
}
