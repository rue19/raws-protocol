use soroban_sdk::{symbol_short, Address, Env, Symbol};

pub fn emit_swap(
    env: &Env,
    caller: &Address,
    token_in: &Address,
    token_out: &Address,
    amount_in: i128,
    amount_out: i128,
) {
    let topics = (
        symbol_short!("swap"),
        caller.clone(),
        token_in.clone(),
        token_out.clone(),
    );
    env.events().publish(topics, (amount_in, amount_out));
}

pub fn emit_add_liquidity(
    env: &Env,
    caller: &Address,
    amount_a: i128,
    amount_b: i128,
    shares: i128,
) {
    let topics = (symbol_short!("add_liq"), caller.clone());
    env.events().publish(topics, (amount_a, amount_b, shares));
}

pub fn emit_remove_liquidity(
    env: &Env,
    caller: &Address,
    share_amount: i128,
    amount_a: i128,
    amount_b: i128,
) {
    let topics = (symbol_short!("rm_liq"), caller.clone());
    env.events()
        .publish(topics, (share_amount, amount_a, amount_b));
}

pub fn emit_ramp_a(
    env: &Env,
    caller: &Address,
    old_a: u128,
    new_a: u128,
    future_time: u64,
) {
    let topics = (Symbol::new(&env, "ramp_a"), caller.clone());
    env.events().publish(topics, (old_a, new_a, future_time));
}

pub fn emit_stop_ramp_a(env: &Env, caller: &Address, current_a: u128) {
    let topics = (Symbol::new(&env, "stop_ramp"), caller.clone());
    env.events().publish(topics, current_a);
}

pub fn emit_set_fee(env: &Env, caller: &Address, old_fee: u128, new_fee: u128) {
    let topics = (symbol_short!("set_fee"), caller.clone());
    env.events().publish(topics, (old_fee, new_fee));
}
