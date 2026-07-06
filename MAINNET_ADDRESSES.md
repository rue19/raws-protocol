# RAW$ Mainnet Contract Addresses

Network: Stellar Mainnet (Public Global Stellar Network ; September 2015)

## Deployed Contracts

| Contract | Address | Status |
|----------|---------|--------|
| Vault | `<MAINNET_VAULT_CONTRACT_ID>` | Pending deployment |
| AMM | `<MAINNET_AMM_CONTRACT_ID>` | Pending deployment |
| Deployer | `GDD6ZI7SPQWJH5CCDFTUQU7SFWJHQ6GMGENS56DN6J2USPSJLT7FGLDM` | Active |

## External Dependencies

| Contract | Mainnet Address |
|----------|----------------|
| Soroswap Router | `CAG5LRYQ5JVEUI5TEID72EYOVX44TTUJT5BQR2J6J77FH65PCCFAJDDH` |
| Soroswap Factory | `CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2` |
| AQUA Token | `CAUIKL3IYGMERDRUN6YSCLWVAKIFG5Q4YJHUKM4S4NJZQIA3BAS6OJPK` |
| XLM (wrapped) | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| USDC (Circle) | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` |

## Post-Deployment Steps

1. Deploy Vault and AMM contracts to mainnet
2. Fill in the contract addresses above
3. Set `SOROSWAP_ROUTER_ADDRESS` and `AQUA_TOKEN_ADDRESS` in `keeper/.env`
4. Call `vault.set_soroswap_router(admin, SOROSWAP_ROUTER_ADDRESS)` (one-time, immutable)
5. Call `vault.set_amm_address(admin, AMM_CONTRACT_ID)` (one-time, immutable)
6. Update `frontend/.env.local` with `NEXT_PUBLIC_VAULT_CONTRACT_ID` and `NEXT_PUBLIC_AMM_CONTRACT_ID`
7. Update `README.md` with the actual contract addresses

## Stellar Expert Links

- Vault: https://stellar.expert/explorer/public/contract/<MAINNET_VAULT_CONTRACT_ID>
- AMM: https://stellar.expert/explorer/public/contract/<MAINNET_AMM_CONTRACT_ID>
