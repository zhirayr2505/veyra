# Next concrete work

Live deployment: https://veyra-3806.onrender.com. Verified healthy on 2026-10-07; six public checks and both frontend assets pass. Deployed revision at verification: e726df09da870c4fb6ee3043b70a9e49e358d9f7.

1. Ask the owner to open VEYRA with the menu button in @VeyraAppBot. Give only this action first. Actual Telegram identity/WebView cannot be substituted with CI fixtures.
2. Verify that the actual user reaches onboarding or their existing profile. Then test real photo submission and owner approval via @VeyraAdminBot, one action at a time.
3. Verify bot menu/webhook behavior for both bots. AUTO_SETUP_BOTS=true configures them on startup, but current webhook settings were not directly inspected because no management credentials are available here.
4. Complete actual Android Telegram acceptance. Real Stars purchase/refund requires explicit approval or Telegram's test environment; payments remain disabled in the live config.

Do not create a second hosting project, change providers, request the already-known URL again or ask for secret values in chat. Never describe CI/mocked-provider tests as proof of actual Telegram acceptance.
