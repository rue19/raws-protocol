#[cfg(test)]
mod tests {
    use crate::{get_d, get_y, ANN, A_PARAM, N_COINS, FEE_BPS, BPS_BASE, RawsAMM, RawsAMMClient};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{token, Address, Env};

    fn setup() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let amm_id = env.register_contract(None, RawsAMM);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        let usdc_id = env.register_stellar_asset_contract_v2(admin.clone());
        let eurc_id = env.register_stellar_asset_contract_v2(admin.clone());
        let usdc = token::StellarAssetClient::new(&env, &usdc_id.address());
        let eurc = token::StellarAssetClient::new(&env, &eurc_id.address());

        usdc.mint(&admin, &10_000_000_000);
        eurc.mint(&admin, &10_000_000_000);

        let client = RawsAMMClient::new(&env, &amm_id);
        client.init(
            &usdc_id.address(),
            &eurc_id.address(),
            &5_000_000_000,
            &5_000_000_000,
            &admin,
        );

        (
            env,
            amm_id,
            admin,
            user,
            usdc_id.address(),
            eurc_id.address(),
        )
    }

    #[test]
    fn test_get_d_balanced_pool() {
        let balances = (1_000_000_000i128, 1_000_000_000i128);
        let d = get_d(&balances, ANN);
        assert!(
            (d - 2_000_000_000i128).abs() < 1000,
            "D should be close to sum for balanced pool, got {}",
            d
        );
    }

    #[test]
    fn test_get_d_empty_pool_returns_zero() {
        let balances = (0i128, 0i128);
        let d = get_d(&balances, ANN);
        assert_eq!(d, 0);
    }

    #[test]
    fn test_invariant_preserved_across_swap() {
        let balances = (5_000_000_000i128, 5_000_000_000i128);
        let d_before = get_d(&balances, ANN);

        let x_new = balances.0 + 100_000_000i128;
        let y_new = get_y(x_new, d_before, ANN);

        let d_after = get_d(&(x_new, y_new), ANN);

        assert!(
            (d_after - d_before).abs() <= 2,
            "Invariant violated: d_before={} d_after={}",
            d_before,
            d_after
        );
    }

    #[test]
    fn test_get_y_never_exceeds_balance() {
        let balances = (5_000_000_000i128, 5_000_000_000i128);
        let d = get_d(&balances, ANN);
        let x_new = balances.0 + 100_000_000i128;
        let y_new = get_y(x_new, d, ANN);
        assert!(y_new < balances.1, "Pool would give more than it holds");
        let dy = balances.1 - y_new - 1;
        assert!(dy > 0, "Negative output computed");
        assert!(dy < 100_000_000, "Output exceeds input (impossible near peg)");
    }

    #[test]
    fn test_slippage_near_peg_a100() {
        let balances = (100_000_000_000i128, 100_000_000_000i128);
        let d = get_d(&balances, ANN);

        let swap_in = 1_000_000_000i128;
        let x_new = balances.0 + swap_in;
        let y_new = get_y(x_new, d, ANN);
        let gross_out = balances.1 - y_new - 1;
        let fee = gross_out * FEE_BPS / BPS_BASE;
        let net_out = gross_out - fee;

        let expected = swap_in * (BPS_BASE - FEE_BPS) / BPS_BASE;
        let slippage_bps = (expected - net_out).abs() * BPS_BASE / expected;
        assert!(
            slippage_bps < 10,
            "Price impact > 0.1% for 1% pool swap with A=100, slippage_bps={}",
            slippage_bps
        );
    }

    #[test]
    fn test_depeg_scenario_a100_degrades_to_cpmm() {
        let balances = (80_000_000_000i128, 20_000_000_000i128);
        let d = get_d(&balances, ANN);

        let swap_in = 1_000_000_000i128;
        let x_new = balances.0 + swap_in;
        let y_new = get_y(x_new, d, ANN);
        let gross_out = balances.1 - y_new - 1;

        assert!(
            gross_out > 0,
            "Pool returned zero on depeg - invariant failed to protect"
        );
        assert!(
            gross_out < swap_in,
            "Pool gave more out than in during depeg - impossible"
        );
        assert!(y_new > 0, "Pool drained to zero - reserve depletion bug");
    }

    #[test]
    fn test_extreme_depeg_pool_never_drains() {
        let balances = (99_000_000_000i128, 1_000_000_000i128);
        let d = get_d(&balances, ANN);

        let swap_in = 99_000_000_000i128;
        let x_new = balances.0 + swap_in;
        let y_new = get_y(x_new, d, ANN);

        assert!(
            y_new > 0,
            "CRITICAL: Pool fully drained during extreme depeg"
        );
        let gross_out = balances.1 - y_new - 1;
        assert!(
            gross_out < 1_000_000_000,
            "Gave out more EURC than in pool"
        );
    }

    #[test]
    fn test_add_liquidity_proportional_share_minting() {
        let (env, amm_id, _admin, user, usdc, eurc) = setup();

        let user_usdc = token::StellarAssetClient::new(&env, &usdc);
        let user_eurc = token::StellarAssetClient::new(&env, &eurc);

        user_usdc.mint(&user, &5_000_000_000);
        user_eurc.mint(&user, &5_000_000_000);

        let client = RawsAMMClient::new(&env, &amm_id);
        let shares_before = client.get_total_shares();
        let user_shares_before = client.get_user_shares(&user);

        let shares_minted = client.add_liquidity(&user, &5_000_000_000, &5_000_000_000, &1);

        assert!(shares_minted > 0, "Should mint shares");
        assert_eq!(
            client.get_total_shares(),
            shares_before + shares_minted,
            "Total shares should increase"
        );
        assert_eq!(
            client.get_user_shares(&user),
            user_shares_before + shares_minted,
            "User shares should increase"
        );
    }

    #[test]
    fn test_remove_liquidity_proportional() {
        let (env, amm_id, admin, _user, _usdc, _eurc) = setup();

        let client = RawsAMMClient::new(&env, &amm_id);
        let admin_shares = client.get_user_shares(&admin);
        assert!(admin_shares > 0, "Admin should have shares after init");

        let half_shares = admin_shares / 2;
        let balances = client.get_balances();
        let total = client.get_total_shares();

        let expected_a = balances.0 * half_shares / total;
        let expected_b = balances.1 * half_shares / total;

        let (amount_a, amount_b) = client.remove_liquidity(&admin, &half_shares, &0, &0);

        assert!(amount_a > 0, "Should return token_a");
        assert!(amount_b > 0, "Should return token_b");
        assert_eq!(amount_a, expected_a, "Token_a amount should be proportional");
        assert_eq!(amount_b, expected_b, "Token_b amount should be proportional");
    }

    #[test]
    fn test_fee_accrual_lp_earns_from_swaps() {
        let (env, amm_id, admin, user, usdc, _eurc) = setup();

        let user_usdc = token::StellarAssetClient::new(&env, &usdc);
        user_usdc.mint(&user, &10_000_000_000);

        let client = RawsAMMClient::new(&env, &amm_id);
        let balances_before = client.get_balances();
        let total_before = client.get_total_shares();
        let admin_shares_before = client.get_user_shares(&admin);

        for _ in 0..10 {
            client.exchange(&user, &usdc, &100_000_000, &0);
        }

        let balances_after = client.get_balances();
        let total_after = client.get_total_shares();

        assert!(
            balances_after.0 > balances_before.0,
            "USDC balance should increase from swap fees"
        );
        assert!(
            balances_after.1 < balances_before.1,
            "EURC balance should decrease from swaps"
        );
        assert_eq!(
            total_before, total_after,
            "Total shares should not change from swaps"
        );

        let admin_shares_after = client.get_user_shares(&admin);
        assert_eq!(
            admin_shares_before, admin_shares_after,
            "Admin shares should not change from swaps"
        );

        let share_value_before = balances_before.0 + balances_before.1;
        let share_value_after = balances_after.0 + balances_after.1;
        assert!(
            share_value_after > share_value_before,
            "Total pool value should increase from fee accrual"
        );
    }

    #[test]
    #[should_panic(expected = "InvalidToken")]
    fn test_exchange_invalid_token_panics() {
        let (env, amm_id, _admin, user, _usdc, _eurc) = setup();
        let client = RawsAMMClient::new(&env, &amm_id);
        let random_token = Address::generate(&env);
        client.exchange(&user, &random_token, &100_000_000, &0);
    }

    #[test]
    fn test_ann_constant_value() {
        assert_eq!(
            ANN, 400,
            "ANN constant incorrect - common bug from Certora H-04"
        );
        assert_eq!(A_PARAM, 100);
        assert_eq!(N_COINS, 2);
    }
}
