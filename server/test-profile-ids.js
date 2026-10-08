// Reserved synthetic IDs; no Telegram account or notifications are associated with them.
export const TEST_PROFILE_IDS=['9007199254740901','9007199254740902'];
export const isTestProfile=id=>TEST_PROFILE_IDS.includes(String(id));
