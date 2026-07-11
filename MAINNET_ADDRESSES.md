# RAW$ Mainnet Contract Addresses

Network: Stellar Mainnet (Public Global Stellar Network ; September 2015)

## Deployed Contracts

| Contract | Address | Status |
|----------|---------|--------|
| Vault | `CALAEFXRQCI4KQH7QSUAEB6ABIR62VWSJXOT3PSN4ZUQ5UKOPEIGKG5V` | Live |
| AMM | `CCYLFR7CBMKDVSE5UPIT52UIE6SEARRXMJTXJ4TFNFIMC7EBVWM6XSKV` | Live (zero liquidity, waiting for first LP) |
| Deployer / Admin | `GDD6ZI7SPQWJH5CCDFTUQU7SFWJHQ6GMGENS56DN6J2USPSJLT7FGLDM` | Active |
| Keeper | `GCOV557XW4XLD2XZIWSLSH5CIALAS56PWZRSDXL3XDWURENJITFPFEPZ` | Active |

## External Dependencies

| Contract | Mainnet Address |
|----------|----------------|
| Soroswap Router | `CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH` |
| Soroswap Factory | `CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2` |
| AQUA Token | `CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK` |
| XLM (SAC) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| USDC (Circle) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

## Deployment Details

- **Deployed:** 2026-07-11
- **Vault WASM:** 30,882 bytes (optimized)
- **AMM WASM:** 20,138 bytes (optimized, allows zero-liquidity init)
- **TTL extended:** ~30 days (535,679 ledgers)

## Transactions

| Step | TX Hash |
|------|---------|
| Deploy Vault | `f678f93282664bc838ef9eddc8fb1f41dc45ddc42628ce79700a3bc4cbc23039` |
| Deploy AMM | `a9cefdf77e29cd84324520c05daf42092e2e846faace732c1f45bb32a6c1116c` |
| Initialize Vault | `f18cfe6ec862c7ee9d65d164002420f82ca33394dcac36fae55d0493427a8ffa` |
| Set Soroswap Router (immutable) | `2f88cd5be858808a41680284ce2be2c94c4a901c7c1ff8812ee420803ef7010c` |
| Set AMM Address (immutable) | `ed1e469c460eb46d1492d9a067cd53c20c1f1c975b6baa305fd8093f12bc46a9` |
| Initialize AMM (zero liquidity) | `f24a496ce5e3d7ad70023c49d6c177d2756ad2d51ab359e8c3b64b917b2861cf` |
| Extend Vault TTL | `fec0f5540e0f4de71cec5511f8299cac83fa58667b6199160b617a3a48b99959` |
| Extend AMM TTL | `1182ba98eef9fb70a97d3729e8de695e88d18154dcec32404524de86e24744b` |

## Previous (Deprecated) Contracts

The following contracts were deployed earlier but are now superseded:
- Vault: `CCWSFO2Z2MPRE4UDDOVJ536BP2KKZRQTGGPQB3JJWW2NJAJFF3KCXBQL` (deprecated)
- AMM: `CB7WKO3MF3X4MBQRKFIH7DEVZ6FGS6AF3AFCXRTHD64LBSTPIW6YSP26` (deprecated)

## Pending Actions

1. Fund deployer with USDC and Wrapped XLM
2. Add liquidity to AMM via `add_liquidity` (first LP sets price ratio)
3. Update `frontend/.env.local` with `NEXT_PUBLIC_VAULT_CONTRACT_ID=CALAEFXRQCI4KQH7QSUAEB6ABIR62VWSJXOT3PSN4ZUQ5UKOPEIGKG5V`
4. Update `frontend/.env.local` with `NEXT_PUBLIC_AMM_CONTRACT_ID=CCYLFR7CBMKDVSE5UPIT52UIE6SEARRXMJTXJ4TFNFIMC7EBVWM6XSKV`
5. Update `keeper/.env` with same contract IDs
6. Update Vercel and Render environment variables

## Stellar Expert Links

- Vault: https://stellar.expert/explorer/public/contract/CALAEFXRQCI4KQH7QSUAEB6ABIR62VWSJXOT3PSN4ZUQ5UKOPEIGKG5V
- AMM: https://stellar.expert/explorer/public/contract/CCYLFR7CBMKDVSE5UPIT52UIE6SEARRXMJTXJ4TFNFIMC7EBVWM6XSKV
