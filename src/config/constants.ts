import path from 'path';

export const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE || '', '.aicommit');
export const MAX_DIFF_LENGTH = 15000; // Maximum characters for the diff
export const CHUNK_THRESHOLD = 50000; // Threshold for chunked processing
export const FREE_ACCOUNT_COOLDOWN = 60000; // 60 seconds cooldown for free accounts
export const MAX_CONCURRENT_REQUESTS = 5; // Maximum number of concurrent requests 