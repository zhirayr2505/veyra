# Supabase database CA

Public root certificate downloaded over verified HTTPS on 2026-10-06 from:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

The URL is published by Supabase Studio in `apps/studio/hooks/custom-content/custom-content.json` in the official `supabase/supabase` repository.

SHA-256 certificate fingerprint:
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

Expires 2031-04-26. This is a public CA certificate, not a private key or credential. It is added only to PostgreSQL connections to Supabase hosts. Server certificate and hostname verification remain enabled. Update this file from the official provider when Supabase rotates its CA.
