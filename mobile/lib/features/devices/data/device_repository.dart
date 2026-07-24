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
    final existingId = await _store.readRegisteredDeviceId();
    if (existingId != null && existingId.isNotEmpty) {
      return DeviceProfile(id: existingId, name: deviceName);
    }
    return _registerForCurrentUser(deviceName);
  }

  Future<DeviceProfile> _registerForCurrentUser(String deviceName,
      {bool resetIdentity = false}) async {
    final deviceUuid = resetIdentity
        ? await _store.resetDeviceIdentity()
        : await _store.getOrCreateDeviceId();
    try {
      final existing = await _dio.get<Map<String, dynamic>>('/api/devices/me');
      final device = DeviceProfile.fromJson(Map<String, dynamic>.from(
          existing.data?['device'] as Map? ?? existing.data ?? {}));
      await _store.saveRegisteredDeviceId(device.id);
      return device;
    } catch (_) {}

    try {
      final created = await _postRegistration(deviceUuid, deviceName);
      final device = DeviceProfile.fromJson(Map<String, dynamic>.from(
          created.data?['device'] as Map? ?? created.data ?? {}));
      await _store.saveRegisteredDeviceId(device.id);
      return device;
    } on DioException catch (error) {
      if (!resetIdentity && error.response?.statusCode == 403) {
        return _registerForCurrentUser(deviceName, resetIdentity: true);
      }
      rethrow;
    }
  }

  Future<Response<Map<String, dynamic>>> _postRegistration(
      String deviceUuid, String deviceName) {
    return _dio.post<Map<String, dynamic>>('/api/devices/register', data: {
      'deviceUuid': deviceUuid,
      'deviceName': deviceName,
      'platform': 'ANDROID'
    });
  }

  Future<void> setTracking(bool isTracking) async {
    var id = await _store.readRegisteredDeviceId();
    if (id == null || id.isEmpty) return;
    try {
      await _dio.post('/api/devices/$id/${isTracking ? 'start' : 'stop'}');
    } on DioException catch (error) {
      if (error.response?.statusCode != 403 &&
          error.response?.statusCode != 404) {
        rethrow;
      }
      await _store.clearRegisteredDeviceId();
      final device =
          await _registerForCurrentUser('Mobile device', resetIdentity: true);
      id = device.id;
      await _dio.post('/api/devices/$id/${isTracking ? 'start' : 'stop'}');
    }
  }
}
