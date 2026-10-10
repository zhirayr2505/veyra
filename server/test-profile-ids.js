// Reserved synthetic IDs; no Telegram account or notifications are associated with them.
export const TEST_PROFILE_IDS=['9007199254740901','9007199254740902','9007199254740903','9007199254740904','9007199254740905','9007199254740906'];
export const isTestProfile=id=>TEST_PROFILE_IDS.includes(String(id));
