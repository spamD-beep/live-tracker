import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store.dart';
import '../models/user_profile.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider), ref.watch(secureStoreProvider));
});

class AuthRepository {
  AuthRepository(this._dio, this._store);
  final Dio _dio;
  final SecureStore _store;

  Future<UserProfile> login(String email, String password) async {
    final response = await _dio.post<Map<String, dynamic>>('/api/auth/login',
        data: {'email': email, 'password': password});
    final data = response.data ?? {};
    await _store.saveToken(
        data['accessToken']?.toString() ?? data['token']?.toString() ?? '');
    final refreshToken = data['refreshToken']?.toString();
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _store.saveRefreshToken(refreshToken);
    }
    return UserProfile.fromJson(
        Map<String, dynamic>.from(data['user'] as Map? ?? data));
  }

  Future<UserProfile> register({
    required String fullName,
    required String email,
    required String password,
    required String deviceName,
  }) async {
    await _dio.post<Map<String, dynamic>>('/api/auth/register', data: {
      'fullName': fullName,
      'email': email,
      'password': password,
    });
    return login(email, password);
  }

  Future<UserProfile?> me() async {
    final token = await _store.readToken();
    if (token == null || token.isEmpty) {
      return null;
    }
    final response = await _dio.get<Map<String, dynamic>>('/api/auth/me');
    return UserProfile.fromJson(Map<String, dynamic>.from(
        response.data?['user'] as Map? ?? response.data ?? {}));
  }

  Future<void> logout() async {
    try {
      final refreshToken = await _store.readRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _dio
            .post('/api/auth/logout', data: {'refreshToken': refreshToken});
      }
    } catch (_) {}
    await _store.clearSessionKeepingDevice();
  }
}
