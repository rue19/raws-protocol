use soroban_sdk::{contracttype, Address};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    TokenA,
    TokenB,
    Admin,
    Initialized,
    Balances,
    TotalShares,
    Shares(Address),
}
