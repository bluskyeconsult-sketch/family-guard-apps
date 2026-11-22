# Family Guard apps

Two Expo apps. Build them with EAS (free) — on your laptop, or entirely in the
browser with GitHub Codespaces (no local install). See the chat instructions.

- `parent/` — the parent app. Paste your Supabase **publishable** key into
  `parent/eas.json` (the URL is already filled), then:
  `cd parent && npm install && eas build -p android --profile preview`
- `child/` — the child app (location, filter, launcher, hard stop). Its API
  address is already filled in `child/eas.json`. Then:
  `cd child && npm install && eas build -p android --profile preview`

One-time in the Codespace terminal first:
`npm install -g eas-cli && eas login`
