# Messages media — Stage 2

Scope: extends Messages Core; one message table, composer, timeline and moderation model. No registration reset. Gifts and other sections unchanged.

## Implementation

- `text`, `voice`, `image`, `sticker` share replies, reactions, ownership checks, receipts, pagination, soft-delete and reporting. Only text and image captions are editable/searchable.
- Voice: hold/release, slide left to discard, slide up or short tap to lock, pause/resume/delete/send, live analyser waveform, optional Telegram haptics, permission sheet. Stops at approximately ten minutes. Browser selects supported MediaRecorder MIME; server probes real container/stream, decodes bounded audio, measures duration/waveform and normalizes to mono 24 kHz AAC/M4A at 48 kbps. Docker includes ffmpeg/ffprobe.
- Custom playback: seekable SVG waveform, elapsed/total time, 1×/1.5×/2×, exclusive playback, retry. No native audio controls.
- Photos: gallery and optional device camera input; one client canvas resize to 2048 px/WebP, preview/caption/Unicode emoji before sending. Server decodes and normalizes again as a security boundary, strips metadata, enforces formats/dimensions. Original aspect ratio, full-screen zoom/pinch/pan viewer.
- Eighteen original static vector stickers in three packs; preview then Send, favorites and recent use. Catalog: `shared/chat-stickers.json`; original sources/license in `public/graphics/stickers`, generator in `scripts/create-chat-stickers.py`. No Telegram scraping, private API or third-party artwork. New static packs need only assets/catalog entries; catalog format can extend to animations in a future stage.
- Upload state/progress and IndexedDB Blob outbox retain failed media across reload. Retry reuses `client_id`, with server-side idempotency (including a metadata-only recovery when upload already committed). Pending items can be discarded locally.

## Storage and authorization

Existing private Supabase `veyra-media` bucket is reused and upgraded to allow canonical `image/webp` and `audio/mp4`, maximum 12 MiB. No public URL or Base64 in messages. Client image input limit is 20 MiB before compression; server upload limit 12 MiB; decoded image cap 40 MP; duration cap 600 seconds. MIME and duration supplied by the client are not trusted.

`POST /api/matches/:id/media` checks membership/block/approval before receiving the multipart body and again under the existing pair lock before commit. Same-chat replies only. `GET /api/matches/:id/messages/:message/media` requires authenticated participant access and visibility, supports byte ranges, private/no-store responses. Owner admin-bot sessions may retrieve moderation files; retrieval is audited. Soft deletion retains original records and storage files. Reports retain file metadata and message context; owner archives include media alongside transcripts. Existing account erasure semantics remain separate.

Migration `007_chat_media.sql` is additive except widening the body constraint to permit captionless media. Old messages default to `text`. `message_media` has RLS and stores canonical metadata/key; `storage_gc.available_at` enables durable delayed orphan cleanup. Orphan cleanup is scheduled before storage upload and canceled in the successful message transaction. Failed/racing uploads are eligible for cleanup. Successful soft-deleted messages are not garbage-collected.

## Verification

Focused checks cover Messages Core regressions, media validation/idempotency/access/block/soft-delete/reporting, private bucket upgrade and owner media archives. Production build and mobile browser checks are recorded in STATUS.md when complete. No GitHub Actions/full CI or unrelated browser scenarios are needed for this stage.

Browser microphone tests use Chromium's synthetic microphone with the real MediaRecorder, actual server conversion and authenticated receiver playback. They are not a physical iOS/Android Telegram microphone/camera/keyboard test. Real device permission prompts, camera handoff and haptics remain platform-dependent. Animated stickers/TGS/WebM, video, GIF, documents and calls are intentionally outside this release.
