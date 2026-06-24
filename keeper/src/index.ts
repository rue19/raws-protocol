import dotenv from 'dotenv';
dotenv.config();

console.log('RAW$ Keeper starting...');
console.log(`Network: ${process.env.STELLAR_NETWORK}`);
console.log(`Vault: ${process.env.VAULT_CONTRACT_ID}`);

// Watchdog and harvester will be wired in Step 5
