const N_COINS: i128 = 2;

pub fn get_d(balances: &(i128, i128), ann: i128) -> i128 {
    let s: i128 = balances.0 + balances.1;
    if s == 0 {
        return 0;
    }

    let mut d = s;

    for _ in 0..255 {
        let mut d_p = d;
        d_p = d_p * d / (balances.0 * N_COINS);
        d_p = d_p * d / (balances.1 * N_COINS);

        let d_prev = d;

        d = (ann * s + d_p * N_COINS) * d / ((ann - 1) * d + (N_COINS + 1) * d_p);

        if d > d_prev {
            if d - d_prev <= 1 {
                return d;
            }
        } else {
            if d_prev - d <= 1 {
                return d;
            }
        }
    }

    panic!("get_D: did not converge");
}

pub fn get_y(x_new: i128, d: i128, ann: i128) -> i128 {
    let b: i128 = x_new + d / ann;

    let c: i128 = {
        let step1 = d * d / (x_new * N_COINS);
        step1 * d / (ann * N_COINS)
    };

    let mut y = d;

    for _ in 0..255 {
        let y_prev = y;
        y = (y * y + c) / (2 * y + b - d);

        if y > y_prev {
            if y - y_prev <= 1 {
                return y;
            }
        } else {
            if y_prev - y <= 1 {
                return y;
            }
        }
    }

    panic!("get_y: did not converge");
}
