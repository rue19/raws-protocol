use soroban_sdk::{symbol_short, Address, Env, Symbol};

pub fn emit_deposit(env: &Env, from: &Address, lp_token: &Address, amount: i128, df_tokens: i128) {
    let topics = (symbol_short!("deposit"), from.clone(), lp_token.clone());
    env.events().publish(topics, (amount, df_tokens));
}

pub fn emit_withdraw(
    env: &Env,
    from: &Address,
    lp_token: &Address,
    lp_out: i128,
    df_token_amount: i128,
) {
    let topics = (symbol_short!("withdraw"), from.clone(), lp_token.clone());
    env.events().publish(topics, (lp_out, df_token_amount));
}

pub fn emit_harvest(
    env: &Env,
    caller: &Address,
    lp_token: &Address,
    reward_amount: i128,
) {
    let timestamp = env.ledger().timestamp();
    let topics = (symbol_short!("harvest"), caller.clone(), lp_token.clone());
    env.events().publish(topics, (reward_amount, timestamp));
}

pub fn emit_deposit_single_asset(
    env: &Env,
    caller: &Address,
    token_in: &Address,
    amount_in: i128,
    lp_tokens_received: i128,
    df_tokens_minted: i128,
) {
    let topics = (Symbol::new(&env, "deposit_sa"), caller.clone());
    env.events().publish(
        topics,
        (token_in.clone(), amount_in, lp_tokens_received, df_tokens_minted),
    );
}
