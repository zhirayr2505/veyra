# Next concrete work

1. Inspect latest GitHub CI for expanded browser acceptance; fix actual failures and inspect `browser-verification` screenshots.
2. Obtain access to existing Render service or exact public URL. Do not create a second hosting project, change providers, or request secret values in chat. Render integration was suggested but not confirmed connected.
3. Verify deployed commit, `/healthz`, `/readyz`, public page, rejection of unauthenticated `/api/me` and admin exports. Inspect startup logs if health fails. Missing-bucket startup fix is already in main.
4. Verify webhook/menu URLs for both bots. `AUTO_SETUP_BOTS=true` configures them on startup.
5. Ask for one action at a time: first open @VeyraAppBot once server is healthy; then real photo submission/admin approval. Real Stars checkout/refund requires explicit approval or use of Telegram's test environment.

Never describe CI or mocked-provider tests as proof of live deployment.
