# Next concrete work

1. Obtain the exact public URL of the existing Render service. Do not create a second hosting project, change providers, or request secret values in chat. Render integration was suggested but not confirmed connected.
2. Run `node scripts/smoke.js https://THE-EXISTING-SERVICE.onrender.com`. Verify deployed commit in `/healthz`, `/readyz`, public page, rejection of unauthenticated `/api/me` and admin exports. Inspect startup logs if health fails. Missing-bucket startup fix is already in main.
3. Verify webhook/menu URLs for both bots. `AUTO_SETUP_BOTS=true` configures them on startup.
4. Ask for one action at a time: first open @VeyraAppBot once server is healthy; then real photo submission/admin approval. Real Stars checkout/refund requires explicit approval or use of Telegram's test environment.

Never describe CI or mocked-provider tests as proof of live deployment.
