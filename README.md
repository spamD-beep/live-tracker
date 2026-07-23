# Live Tracker

This repository is organized as a multi-app workspace.

- `mobile/` contains the Flutter LiveTrack Mobile app.
- Desktop/backend code can be added beside `mobile/` without mixing project files.

Run mobile app commands from the `mobile/` folder:

```powershell
cd C:\Users\Zubair\WebstormProjects\live-tracker\mobile
flutter analyze
flutter test
flutter run -d 082653725I004083 --dart-define=API_BASE_URL=http://192.168.1.6:4000
```
