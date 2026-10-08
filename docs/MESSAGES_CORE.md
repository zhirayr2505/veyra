# Messages Core — stage 1

Completed 2026-10-08. Scope: chat UI, message API, additive migration 006, moderation transcript export and focused chat tests. Previous registration reset is unchanged and must not be rerun.

## Delivered

- Dedicated mobile-first dark chat interface with vector controls, grouped bubbles, date/unread separators, contextual actions and confirmation sheets.
- Header profile preview, presence, throttled typing, search, block/unblock and contextual reports. Existing mutual Telegram exchange/unmatch remain available.
- Right-swipe/long-press replies and navigation to the original message, including paginated old history. Deleted/hidden originals are unavailable in quotes.
- One Unicode reaction per participant: counts, replacement/removal and full native emoji picker with recent/category/search/skin-tone support. Picker is lazy-loaded; no Apple emoji images are shipped or requested.
- Own-message editing with original text and history retained. Delete-for-me and delete-for-everyone are soft flags; public history/search/list previews omit hidden text. Owner transcript export includes original text, edits and deletion timestamps.
- Optimistic sending, sent/delivered/read/failed states, session-scoped outbox and explicit retries using the same client_id. Read acknowledgements concern visible incoming messages only; fetching a page marks delivery.
- Latest 50 messages, exact timestamp/UUID pagination, bounded search and around-message navigation. Scroll position is preserved on prepend; updates do not pull readers away from old messages. Latest-message button shows new arrivals.
- Additive SQL migration preserves all existing message IDs/text/timestamps. Membership/ownership, same-match replies and idempotency are validated server-side. Block and send use consistent transaction locks. Reports store server-generated chat context.

## Transport and practical limits

Visible-chat changes/presence poll every 3 seconds, not WebSockets. Typing writes at most once per 3.2 seconds while active, stops after 4.5 seconds of inactivity and expires server-side after 7 seconds. Hidden documents suspend polling. Presence is an activity estimate, not a guaranteed device connection.

The picker uses device-native Unicode rendering. Headless Linux lacks some emoji glyphs; this is independent of iOS/Android system emoji. Browser checks emulate 390×844, 320×568 and a 390×440 keyboard-sized viewport; actual Telegram WebView/physical keyboard acceptance remains a device check.

The existing account-deletion privacy policy is unchanged. This stage's message delete operations never physically delete message content. There are no voice, camera, media, GIF, sticker, file, call, expiring-message or location features.

## Verification

- 15 targeted chat/API checks passed (`node --test --test-concurrency=1 tests/chat.test.js tests/api.test.js`).
- Four archive tests passed; the added fifth retention test passed after correcting its synthetic UUID fixture. It verifies owner access to original content/history after edit and soft-delete.
- Production build passed. Emoji picker loads separately (~147 kB gzip).
- `tests/chat.playwright.config.js`: the complete two-member Messages Core scenario passed in 35.1 seconds. Covers actual UI send/read/typing, swipe reply, reactions, edit and refreshed quotes, native picker, long press, profile, history/search, failed send surviving reload/retry, both deletion scopes, report, block/unblock and mobile layouts. No page JavaScript errors.
- Initial browser assertions selected text inside a quoted message and a quote button instead of the target message body; selectors were corrected. No full application suite or GitHub Actions was run.
- Existing full-app tests are not this stage's acceptance gate. Use the focused chat config; tests are isolated from production accounts/providers.

Stop at stage 1. Do not start stage 2 or repeat completed verification without a concrete regression.
