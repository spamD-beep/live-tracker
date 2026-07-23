import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:workmanager/workmanager.dart';

import '../../../core/config/app_config.dart';
import '../../../core/storage/secure_store.dart';
import '../../devices/data/device_repository.dart';
import '../data/location_repository.dart';
import '../services/background_tracking.dart';
import '../services/location_service.dart';
import '../services/notification_service.dart';
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
    ref.watch(deviceRepositoryProvider),
    ref.watch(appConfigProvider),
  );
});

class TrackingController extends StateNotifier<TrackingState> {
  TrackingController(this._location, this._repo, this._deviceRepo, this._config)
      : super(const TrackingState());
  final LocationService _location;
  final LocationRepository _repo;
  final DeviceRepository _deviceRepo;
  final AppConfig _config;
  final _notifications = NotificationService();
  StreamSubscription? _sub;
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
        state = state.copyWith(
            current: payload, lastSync: DateTime.now(), error: null);
      }, onError: (Object e) {
        state = state.copyWith(error: e.toString());
      });
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
    await Workmanager().cancelByUniqueName(backgroundTrackingTask);
    await _notifications.stopTrackingNotification();
    await _deviceRepo.setTracking(false);
    state = state.copyWith(isTracking: false);
  }

  Future<void> refresh() async {
    try {
      final payload = await _location.currentPayload(_deviceName);
      await _repo.sendOrQueue(payload);
      state = state.copyWith(
          current: payload, lastSync: DateTime.now(), error: null);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> syncQueue() => _repo.syncQueue();

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

extension on String {
  bool get isBlank => trim().isEmpty;
}
