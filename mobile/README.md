# LiveTrack Mobile

Production-oriented Flutter source for consent-based live location sharing. The app only tracks after a logged-in user grants permissions and presses Start Tracking.

## Setup

1. Install Flutter SDK.
2. If Android/iOS wrapper files are missing on your machine, run `flutter create --platforms=android,ios .` from this folder, then keep the provided `AndroidManifest.xml` and `Info.plist` permission settings.
3. Run `flutter pub get`.
4. Configure environment values with `--dart-define`:

```powershell
flutter run --dart-define=API_BASE_URL=https://your-api.example.com
```

## Features

- Secure JWT storage with `flutter_secure_storage`
- Dio Bearer-token interceptor
- Register, login, logout, and session restore
- Device UUID generation and backend registration
- Consent-based foreground tracking
- Android persistent notification while tracking
- Location payload includes coordinates, accuracy, altitude, speed, heading, timestamp, battery level, and charging state
- Minimum distance filter defaults to 10 meters
- Offline queue in Hive with batch sync endpoint support
- Material 3 light and dark themes
- Permission screen for location, background location, notifications, GPS disabled, and system settings

## Environment

See `.env.example`. Flutter consumes these values through `--dart-define`; do not commit real secrets.

## Platform notes

Android requires foreground-service and background-location permissions. The app shows an ongoing notification while active tracking is running. Android 13+ also requires notification permission.

iOS background location depends on Apple review rules and user permission. The app declares location background mode and permission descriptions, but iOS may throttle background work. Keep the dashboard tolerant of delayed updates.

## Desktop integration

The mobile app writes locations to the backend. The desktop app should read from the backend by device or user. See `docs/api-integration.md` for the exact request contract.

## Important safety boundary

No hidden tracking, stealth mode, permission bypass, password storage, hardware identifier scraping, or silent background startup is implemented. Tracking stops on logout.

## Verification

This workspace did not have Flutter or Dart installed, so I could not run `flutter pub get`, `flutter analyze`, or tests locally. After installing Flutter, run:

```powershell
flutter pub get
flutter analyze
flutter test
```
