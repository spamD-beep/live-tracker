import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

final secureStoreProvider = Provider<SecureStore>((_) => const SecureStore());

class SecureStore {
  const SecureStore();

  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  Future<void> saveToken(String token) =>
      _storage.write(key: 'access_token', value: token);
  Future<String?> readToken() => _storage.read(key: 'access_token');
  Future<void> clearToken() => _storage.delete(key: 'access_token');
  Future<void> saveRefreshToken(String token) =>
      _storage.write(key: 'refresh_token', value: token);
  Future<String?> readRefreshToken() => _storage.read(key: 'refresh_token');
  Future<void> clearRefreshToken() => _storage.delete(key: 'refresh_token');

  Future<void> saveRegisteredDeviceId(String id) =>
      _storage.write(key: 'registered_device_id', value: id);
  Future<String?> readRegisteredDeviceId() =>
      _storage.read(key: 'registered_device_id');
  Future<void> clearRegisteredDeviceId() =>
      _storage.delete(key: 'registered_device_id');

  Future<String> getOrCreateDeviceId() async {
    final existing = await _storage.read(key: 'device_id');
    if (existing != null) return existing;
    final id = const Uuid().v4();
    await _storage.write(key: 'device_id', value: id);
    return id;
  }

  Future<String> resetDeviceIdentity() async {
    await clearRegisteredDeviceId();
    final id = const Uuid().v4();
    await _storage.write(key: 'device_id', value: id);
    return id;
  }

  Future<void> clearSessionKeepingDevice() async {
    await clearToken();
    await clearRefreshToken();
    await clearRegisteredDeviceId();
  }
}
