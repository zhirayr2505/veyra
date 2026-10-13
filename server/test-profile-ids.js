// Reserved synthetic IDs; never connected to real Telegram accounts.
export const TEST_PROFILE_IDS=Array.from({length:12},(_,i)=>String(9007199254740901n+BigInt(i)));
export const isTestProfile=id=>TEST_PROFILE_IDS.includes(String(id));
