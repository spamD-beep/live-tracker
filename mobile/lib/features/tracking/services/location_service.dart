import 'dart:async';

import 'package:battery_plus/battery_plus.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/config/app_config.dart';
import '../../../core/storage/secure_store.dart';
import '../models/location_payload.dart';

class LocationService {
  LocationService(this._config, this._store);
  final AppConfig _config;
  final SecureStore _store;
  final _battery = Battery();

  Stream<Position> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: AndroidSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: _config.distanceFilterMeters.round(),
        intervalDuration: _config.foregroundInterval,
        foregroundNotificationConfig: const ForegroundNotificationConfig(
          notificationTitle: 'LiveTrack is active',
          notificationText: 'Your location is being shared with your consent.',
          enableWakeLock: true,
        ),
      ),
    );
  }

  Future<void> ensureReady() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) throw StateError('GPS is disabled');
    final permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is not granted');
    }
  }

  Future<LocationPayload> currentPayload(String deviceName) async {
    await ensureReady();
    final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.bestForNavigation);
    return payloadFromPosition(position, deviceName);
  }

  Future<LocationPayload> payloadFromPosition(
      Position position, String deviceName) async {
    final batteryLevel = await _battery.batteryLevel;
    final batteryState = await _battery.batteryState;
    final registeredDeviceId = await _store.readRegisteredDeviceId();
    return LocationPayload(
      deviceId: registeredDeviceId ?? await _store.getOrCreateDeviceId(),
      deviceName: deviceName,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      speed: position.speed,
      heading: position.heading,
      batteryLevel: batteryLevel,
      isCharging: batteryState == BatteryState.charging ||
          batteryState == BatteryState.full,
      recordedAt: position.timestamp,
    );
  }
}
