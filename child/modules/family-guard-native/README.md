# family-guard-native

A local Expo native module (Android, Kotlin) that gives the child app the
controls a web app cannot do:

- `isDeviceOwner()` — is Family Guard the device owner of this phone
- `setPrivateDns(host)` — enforce the family content-filter Private DNS (device owner)
- `setLockTaskPackages(pkgs)` / `startLockTask()` / `stopLockTask()` — kiosk / hard stop
- `launchApp(pkg)` — open an approved app from the launcher
- `getDeviceStatus()` — battery, charging, screen, Private DNS host, VPN active, OS, boot time
- `getUsageToday()` — per-app foreground minutes today (needs Usage access)
- `startLocationService()` / `stopLocationService()` — the battery-light foreground
  location service that posts fixes straight to the Family Guard API
- `setAsHomeLauncher()` — make this the default HOME (device owner)

It is autolinked by Expo because it lives under `modules/`. It is compiled by an
**Expo EAS build**; it does not run in Expo Go and cannot be compiled without the
Android SDK. Device-owner setup is a one-time `adb` step — see `INSTALL-GUIDE.md`.

Every method is defensive: without device owner, the control methods no-op or
return false, so location, status and usage still work.
