use soroban_sdk::{symbol_short, Address, Env};

pub fn emit_swap(env: &Env, caller: &Address, token_in: &Address, amount_in: i128, token_out: &Address, amount_out: i128, fee: i128) {
    env.events().publish(
        (symbol_short!("swap"), caller.clone()),
        (token_in.clone(), amount_in, token_out.clone(), amount_out, fee),
    );
}

pub fn emit_add_liq(env: &Env, caller: &Address, desired_a: i128, desired_b: i128, shares_minted: i128) {
    env.events().publish(
        (symbol_short!("add_liq"), caller.clone()),
        (desired_a, desired_b, shares_minted),
    );
}

pub fn emit_remove_liq(env: &Env, caller: &Address, shares_burned: i128, amount_a: i128, amount_b: i128) {
    env.events().publish(
        (symbol_short!("rem_liq"), caller.clone()),
        (shares_burned, amount_a, amount_b),
    );
}

pub fn emit_init(env: &Env, token_a: &Address, token_b: &Address, initial_a: i128, initial_b: i128, initial_d: i128) {
    env.events().publish(
        (symbol_short!("init"),),
        (token_a.clone(), token_b.clone(), initial_a, initial_b, initial_d),
    );
}
