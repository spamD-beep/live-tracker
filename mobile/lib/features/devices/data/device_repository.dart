import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store.dart';
import '../models/device_profile.dart';

final deviceRepositoryProvider = Provider<DeviceRepository>((ref) {
  return DeviceRepository(
      ref.watch(dioProvider), ref.watch(secureStoreProvider));
});

class DeviceRepository {
  DeviceRepository(this._dio, this._store);
  final Dio _dio;
  final SecureStore _store;

  Future<DeviceProfile> getOrRegister(String deviceName) async {
    final deviceUuid = await _store.getOrCreateDeviceId();
    try {
      final existing = await _dio.get<Map<String, dynamic>>('/api/devices/me');
      final device = DeviceProfile.fromJson(Map<String, dynamic>.from(
          existing.data?['device'] as Map? ?? existing.data ?? {}));
      await _store.saveRegisteredDeviceId(device.id);
      return device;
    } catch (_) {
      final created = await _dio
          .post<Map<String, dynamic>>('/api/devices/register', data: {
        'deviceUuid': deviceUuid,
        'deviceName': deviceName,
        'platform': 'ANDROID'
      });
      final device = DeviceProfile.fromJson(Map<String, dynamic>.from(
          created.data?['device'] as Map? ?? created.data ?? {}));
      await _store.saveRegisteredDeviceId(device.id);
      return device;
    }
  }

  Future<void> setTracking(bool isTracking) async {
    final id = await _store.readRegisteredDeviceId();
    if (id == null || id.isEmpty) return;
    await _dio.post('/api/devices/$id/${isTracking ? 'start' : 'stop'}');
  }
}
