/// Curve StableSwap math — pure functions for D, get_y, and amplification ramping.
///
/// Reference: https://curve.fi/files/stableswap-paper.pdf
/// Reference: https://docs.curve.finance/developer/resources/derivations

// ─── Constants ─────────────────────────────────────────────────────

/// Number of coins in a pool (2-coin pools only for now).
pub const N_COINS: i128 = 2;

/// A_PRECISION — amplification parameter stored with 2 decimal places.
pub const A_PRECISION: i128 = 100;

/// Maximum amplification parameter (1,000,000).
pub const MAX_A: i128 = 1_000_000;

/// Maximum A change factor per ramp (10x).
pub const MAX_A_CHANGE: i128 = 10;

/// Minimum ramp time in seconds (1 day).
pub const MIN_RAMP_TIME: u64 = 86_400;

/// Maximum Newton iterations.
pub const MAX_ITERS: usize = 255;

/// Convergence threshold (|new - prev| <= 1).
pub const CONVERGENCE_THRESHOLD: i128 = 1;

// ─── Pure Math Functions ───────────────────────────────────────────

/// Compute D (the StableSwap invariant) given reserves and amplification.
///
/// Uses Newton's method: D_0 = S (sum of reserves), converges in <10 iterations.
///
/// # Arguments
/// * `xp` - reserves [x0, x1] (must be > 0)
/// * `ann` - A * n^(n-1) = A * 2 for 2-coin pool
///
/// # Returns
/// D invariant (<= sum of reserves, = sum when all reserves equal)
pub fn compute_d(xp: [i128; 2], ann: i128) -> i128 {
    let s = xp[0] + xp[1];
    if s == 0 {
        return 0;
    }

    let mut d = s; // Initial guess: D_0 = S

    for _ in 0..MAX_ITERS {
        // Build D_P = D^(n+1) / (n^n * prod(x_i))
        // For n=2: D_P = D^3 / (4 * x0 * x1)
        let mut d_p = d;
        d_p = d_p * d / (xp[0] * N_COINS);
        d_p = d_p * d / (xp[1] * N_COINS);

        let prev = d;

        // Newton step:
        // D_new = (ann * S + D_P * n) * D / ((ann - 1) * D + (n + 1) * D_P)
        let num = (ann * s + d_p * N_COINS) * d;
        let den = (ann - 1) * d + (N_COINS + 1) * d_p;
        d = num / den;

        // Convergence check
        if d > prev {
            if d - prev <= CONVERGENCE_THRESHOLD {
                break;
            }
        } else {
            if prev - d <= CONVERGENCE_THRESHOLD {
                break;
            }
        }
    }

    d
}

/// Compute y (new balance of token j) given a change to token i.
///
/// Given D is fixed during a swap, solve for y that preserves the invariant.
///
/// # Arguments
/// * `i` - index of input token (0 or 1)
/// * `j` - index of output token (0 or 1, j != i)
/// * `x` - new balance of token i (after swap)
/// * `xp` - current reserves [x0, x1]
/// * `d` - the D invariant
/// * `ann` - A * n^(n-1)
///
/// # Returns
/// new balance of token j (before fee)
pub fn get_y(i: usize, j: usize, x: i128, xp: [i128; 2], d: i128, ann: i128) -> i128 {
    debug_assert!(i != j);
    debug_assert!(i < 2 && j < 2);
    debug_assert!(d > 0);

    // S' = sum of all balances except j, with token i replaced by x
    let mut s: i128 = 0;
    // c = D^(n+1) / (n^n * Ann * prod(x_k for k != j))
    let mut c = d;

    for k in 0..2 {
        let x_k = if k == i { x } else { xp[k] };
        if k != j {
            s += x_k;
            c = c * d / (x_k * N_COINS);
        }
    }
    c = c * d / (ann * N_COINS);

    // b = S' + D / Ann
    let b = s + d / ann;

    // Newton iteration: y_new = (y^2 + c) / (2y + b - D)
    let mut y = d; // initial guess

    for _ in 0..MAX_ITERS {
        let y_prev = y;
        y = (y * y + c) / (2 * y + b - d);

        if y > y_prev {
            if y - y_prev <= CONVERGENCE_THRESHOLD {
                break;
            }
        } else {
            if y_prev - y <= CONVERGENCE_THRESHOLD {
                break;
            }
        }
    }

    y
}

/// Get current amplification parameter with linear ramping.
///
/// # Arguments
/// * `initial_a` - A at ramp start
/// * `future_a` - target A
/// * `initial_time` - timestamp when ramp started
/// * `future_time` - timestamp when ramp ends
/// * `now` - current ledger timestamp
///
/// # Returns
/// current A value
pub fn get_current_a(
    initial_a: i128,
    future_a: i128,
    initial_time: u64,
    future_time: u64,
    now: u64,
) -> i128 {
    if future_time == 0 || now >= future_time {
        return future_a;
    }

    let elapsed = (now - initial_time) as i128;
    let duration = (future_time - initial_time) as i128;

    if duration == 0 {
        return future_a;
    }

    if future_a > initial_a {
        initial_a + (future_a - initial_a) * elapsed / duration
    } else {
        initial_a - (initial_a - future_a) * elapsed / duration
    }
}

// ─── Tests ─────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ─── compute_d tests ────────────────────────────────────────

    #[test]
    fn test_compute_d_balanced_pool() {
        let xp = [1000i128, 1000i128];
        let ann = 200; // A=100, n=2, ann = A * 2 = 200
        let d = compute_d(xp, ann);
        assert!(d >= 1999 && d <= 2001, "D = {}", d);
    }

    #[test]
    fn test_compute_d_imbalanced_pool() {
        let xp = [900i128, 1100i128];
        let ann = 200;
        let d = compute_d(xp, ann);
        assert!(d > 1900, "D too low: {}", d);
        assert!(d <= 2001, "D too high: {}", d);
    }

    #[test]
    fn test_compute_d_very_imbalanced() {
        let xp = [100i128, 1900i128];
        let ann = 200;
        let d = compute_d(xp, ann);
        assert!(d > 0, "D = 0");
        assert!(d < 2000, "D should be < sum: {}", d);
    }

    #[test]
    fn test_compute_d_zero_reserves() {
        let xp = [0i128, 0i128];
        let d = compute_d(xp, 200);
        assert_eq!(d, 0);
    }

    #[test]
    fn test_compute_d_high_amp() {
        let xp = [900i128, 1100i128];
        let ann_high = 2_000_000; // A = 1,000,000
        let d = compute_d(xp, ann_high);
        assert!(d >= 1999, "High A: D = {}", d);
    }

    #[test]
    fn test_compute_d_low_amp() {
        let xp = [900i128, 1100i128];
        let ann_low = 2; // A = 1
        let d = compute_d(xp, ann_low);
        assert!(d < 2000, "Low A: D = {}", d);
        assert!(d > 1800, "Low A: D too low: {}", d);
    }

    // ─── get_y tests ────────────────────────────────────────────

    #[test]
    fn test_get_y_balanced_swap() {
        let xp = [1000i128, 1000i128];
        let ann = 200;
        let d = compute_d(xp, ann);

        let new_x0 = 1010i128;
        let y = get_y(0, 1, new_x0, xp, d, ann);

        assert!(y < 1000, "y should be < 1000: {}", y);
        assert!(y > 989, "y should be > 989 (slippage < 1%): {}", y);
    }

    #[test]
    fn test_get_y_symmetric() {
        let xp = [1000i128, 1000i128];
        let ann = 200;
        let d = compute_d(xp, ann);

        let y1 = get_y(0, 1, 1050, xp, d, ann);
        let y0 = get_y(1, 0, 1050, xp, d, ann);

        assert_eq!(y1, y0);
    }

    #[test]
    fn test_get_y_preserves_invariant() {
        let xp = [1000i128, 1000i128];
        let ann = 200;
        let d = compute_d(xp, ann);

        let new_x0 = 1100i128;
        let y = get_y(0, 1, new_x0, xp, d, ann);

        let new_xp = [new_x0, y];
        let d_new = compute_d(new_xp, ann);

        let diff = if d > d_new { d - d_new } else { d_new - d };
        assert!(diff <= 2, "D drifted: {} vs {}", d, d_new);
    }

    #[test]
    fn test_get_y_large_swap() {
        let xp = [1_000_000i128, 1_000_000i128];
        let ann = 2000; // A = 1000
        let d = compute_d(xp, ann);

        let new_x0 = 1_100_000i128;
        let y = get_y(0, 1, new_x0, xp, d, ann);
        let output = xp[1] - y;

        assert!(output > 90_000, "Output too low: {}", output);
        assert!(output < 100_000, "Output > input: {}", output);
    }

    // ─── get_current_a tests ────────────────────────────────────

    #[test]
    fn test_get_current_a_no_ramp() {
        let a = get_current_a(100, 100, 0, 0, 1000);
        assert_eq!(a, 100);
    }

    #[test]
    fn test_get_current_a_ramp_up_midpoint() {
        let a = get_current_a(100, 200, 1000, 2000, 1500);
        assert_eq!(a, 150);
    }

    #[test]
    fn test_get_current_a_ramp_down_midpoint() {
        let a = get_current_a(200, 100, 1000, 2000, 1500);
        assert_eq!(a, 150);
    }

    #[test]
    fn test_get_current_a_ramp_complete() {
        let a = get_current_a(100, 200, 1000, 2000, 2000);
        assert_eq!(a, 200);
    }

    #[test]
    fn test_get_current_a_ramp_past() {
        let a = get_current_a(100, 200, 1000, 2000, 3000);
        assert_eq!(a, 200);
    }

    // ─── Edge case tests ────────────────────────────────────────

    #[test]
    fn test_compute_d_convergence_speed() {
        let xp = [1_000_000i128, 1_000_000i128];
        let ann = 2000;
        let d = compute_d(xp, ann);
        assert!(d > 0);
    }

    #[test]
    fn test_get_y_extreme_imbalance() {
        let xp = [1_000_000i128, 1_000i128];
        let ann = 200;
        let d = compute_d(xp, ann);

        let new_x0 = 1_000_100i128;
        let y = get_y(0, 1, new_x0, xp, d, ann);

        let output = xp[1] - y;
        assert!(output < 100, "Output should be tiny: {}", output);
    }
}
