use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum VaultMode {
    SafeMode,
    YieldMode,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct LPPosition {
    pub pool_id: Address,
    pub lp_tokens: i128,
    pub entry_price_ratio: i128,
    pub entry_timestamp: u64,
    pub token_a: Address,
    pub token_b: Address,
}

#[derive(Clone, Debug, PartialEq)]
#[contracttype]
pub enum StorageKey {
    SharesSupply,
    Admin,
    Keeper,
    Mode,
    TotalLp,
    UserShares(Address),
    SoroswapRouter,
    Positions(Address),
}

#[contracterror]
#[derive(Clone, Debug, Copy, PartialEq, Eq)]
#[repr(u32)]
pub enum VaultError {
    ZeroAmount = 1,
    InsufficientShares = 2,
    InsufficientLp = 3,
    Unauthorized = 4,
    AlreadyInitialized = 5,
    MathOverflow = 6,
}
