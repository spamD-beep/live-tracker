import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_store.dart';
import '../models/location_payload.dart';
import '../models/wifi_reading.dart';

final wifiObservationRepositoryProvider =
    Provider<WifiObservationRepository>((ref) {
  return WifiObservationRepository(
      ref.watch(dioProvider), ref.watch(secureStoreProvider));
});

class WifiObservationRepository {
  WifiObservationRepository(this._dio, this._store);
  final Dio _dio;
  final SecureStore _store;

  Future<void> send(List<WifiReading> readings,
      {LocationPayload? location}) async {
    final deviceId = await _store.readRegisteredDeviceId();
    if (deviceId == null || deviceId.isEmpty || readings.isEmpty) return;
    try {
      await _dio.post('/api/offices/observations', data: {
        'deviceId': deviceId,
        'officeStatus': 'UNKNOWN',
        if (location != null) 'latitude': location.latitude,
        if (location != null) 'longitude': location.longitude,
        if (location?.accuracy != null) 'accuracy': location!.accuracy,
        'rawScan': {
          'accessPoints': readings.map((reading) => reading.toJson()).toList()
        },
        'capturedAt': DateTime.now().toUtc().toIso8601String(),
      });
    } catch (_) {
      // Wi-Fi observations are best-effort; GPS tracking remains the primary fallback.
    }
  }
}
