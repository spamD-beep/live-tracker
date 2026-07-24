import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workmanager/workmanager.dart';

import '../../../core/config/app_config.dart';
import '../../../core/storage/secure_store.dart';
import '../../devices/data/device_repository.dart';
import '../data/location_repository.dart';
import '../data/wifi_observation_repository.dart';
import '../models/location_payload.dart';
import '../services/background_tracking.dart';
import '../services/location_service.dart';
import '../services/notification_service.dart';
import '../services/wifi_scan_service.dart';
import 'tracking_state.dart';

final locationServiceProvider = Provider<LocationService>((ref) {
  return LocationService(
      ref.watch(appConfigProvider), ref.watch(secureStoreProvider));
});

final trackingControllerProvider =
    StateNotifierProvider<TrackingController, TrackingState>((ref) {
  return TrackingController(
    ref.watch(locationServiceProvider),
    ref.watch(locationRepositoryProvider),
    ref.watch(wifiObservationRepositoryProvider),
    ref.watch(deviceRepositoryProvider),
    ref.watch(wifiScanServiceProvider),
    ref.watch(appConfigProvider),
  );
});

class TrackingController extends StateNotifier<TrackingState> {
  TrackingController(this._location, this._repo, this._observations,
      this._deviceRepo, this._wifi, this._config)
      : super(const TrackingState());
  final LocationService _location;
  final LocationRepository _repo;
  final WifiObservationRepository _observations;
  final DeviceRepository _deviceRepo;
  final WifiScanService _wifi;
  final AppConfig _config;
  final _notifications = NotificationService();
  StreamSubscription? _sub;
  Timer? _foregroundRefreshTimer;
  bool _refreshInFlight = false;
  String _deviceName = 'Mobile device';

  Future<void> start(String deviceName) async {
    _deviceName = deviceName.isBlank ? 'Mobile device' : deviceName;
    try {
      await _location.ensureReady();
      await _deviceRepo.getOrRegister(_deviceName);
      await _deviceRepo.setTracking(true);
      await _repo.syncQueue();
      await _notifications.init();
      await _notifications.showTrackingNotification();
      await Workmanager().registerPeriodicTask(
        backgroundTrackingTask,
        backgroundTrackingTask,
        frequency: _config.backgroundInterval,
        constraints: Constraints(networkType: NetworkType.connected),
        existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
      );
      state = state.copyWith(isTracking: true, error: null);
      _sub?.cancel();
      _sub = _location.positionStream().listen((position) async {
        final payload =
            await _location.payloadFromPosition(position, _deviceName);
        await _repo.sendOrQueue(payload);
        unawaited(_sendWifiObservation(payload));
        state = state.copyWith(
            current: payload, lastSync: DateTime.now(), error: null);
      }, onError: (Object e) {
        state = state.copyWith(error: e.toString());
      });
      _startForegroundRefreshTimer();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> stop() async {
    _foregroundRefreshTimer?.cancel();
    _foregroundRefreshTimer = null;
    await _sub?.cancel();
    _sub = null;
    await Workmanager().cancelByUniqueName(backgroundTrackingTask);
    await _notifications.stopTrackingNotification();
    await _deviceRepo.setTracking(false);
    state = state.copyWith(isTracking: false);
  }

  Future<void> refresh() async {
    if (_refreshInFlight) return;
    _refreshInFlight = true;
    try {
      final payload = await _location.currentPayload(_deviceName);
      await _repo.sendOrQueue(payload);
      await _sendWifiObservation(payload);
      state = state.copyWith(
          current: payload, lastSync: DateTime.now(), error: null);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      _refreshInFlight = false;
    }
  }

  Future<void> syncQueue() => _repo.syncQueue();

  Future<void> _sendWifiObservation(LocationPayload payload) async {
    final readings = await _wifi.scan();
    await _observations.send(readings, location: payload);
  }

  void _startForegroundRefreshTimer() {
    _foregroundRefreshTimer?.cancel();
    _foregroundRefreshTimer = Timer.periodic(_config.foregroundInterval, (_) {
      if (state.isTracking) unawaited(refresh());
    });
  }

  @override
  void dispose() {
    _foregroundRefreshTimer?.cancel();
    _sub?.cancel();
    super.dispose();
  }
}

extension on String {
  bool get isBlank => trim().isEmpty;
}
