use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum PoolStatus {
    Active,
    Paused,
    Disabled,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolConfig {
    pub token_a: Address,
    pub token_b: Address,
    pub amp_factor: i128,
    pub future_amp_factor: i128,
    pub initial_amp_time: u64,
    pub future_amp_time: u64,
    pub fee: i128,
    pub admin_fee: i128,
    pub admin: Address,
    pub status: PoolStatus,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum StorageKey {
    PoolAdmin,
    PoolConfig,
    TotalSupply,
    Balance(Address),
    UserShares(Address),
    TokenA,
    TokenB,
    FactoryPools,
}

#[derive(Clone, Debug, Copy, PartialEq, Eq)]
#[contracterror]
#[repr(u32)]
pub enum AmmError {
    ZeroAmount = 1,
    InsufficientBalance = 2,
    InsufficientLiquidity = 3,
    SlippageExceeded = 4,
    Unauthorized = 5,
    AlreadyInitialized = 6,
    MathOverflow = 7,
    PoolDisabled = 8,
    InvalidToken = 9,
    RampTooFast = 10,
    AmplificationTooHigh = 11,
    SameToken = 12,
}
