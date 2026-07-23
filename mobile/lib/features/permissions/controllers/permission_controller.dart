import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

final permissionControllerProvider =
    StateNotifierProvider<PermissionController, PermissionSnapshot>((_) {
  return PermissionController();
});

class PermissionSnapshot {
  const PermissionSnapshot({
    this.location = LocationPermission.denied,
    this.gpsEnabled = false,
    this.notificationGranted = false,
  });

  final LocationPermission location;
  final bool gpsEnabled;
  final bool notificationGranted;
  bool get ready =>
      gpsEnabled &&
      (location == LocationPermission.always ||
          location == LocationPermission.whileInUse);
}

class PermissionController extends StateNotifier<PermissionSnapshot> {
  PermissionController() : super(const PermissionSnapshot());

  Future<void> refresh() async {
    state = PermissionSnapshot(
      location: await Geolocator.checkPermission(),
      gpsEnabled: await Geolocator.isLocationServiceEnabled(),
      notificationGranted: await ph.Permission.notification.status.isGranted,
    );
  }

  Future<PermissionSnapshot> requestLocation() async {
    var permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.whileInUse) {
      permission = await Geolocator.requestPermission();
    }
    await ph.Permission.notification.request();
    state = PermissionSnapshot(
      location: permission,
      gpsEnabled: await Geolocator.isLocationServiceEnabled(),
      notificationGranted: await ph.Permission.notification.status.isGranted,
    );
    return state;
  }

  Future<void> openSettings() => ph.openAppSettings();
}
