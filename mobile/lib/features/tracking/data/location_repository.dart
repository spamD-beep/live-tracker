import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';

import '../../../core/network/api_client.dart';
import '../models/location_payload.dart';
import 'location_queue_repository.dart';

final locationQueueProvider = Provider<LocationQueueRepository>((_) {
  return LocationQueueRepository(Hive.box<String>('location_queue'));
});

final locationRepositoryProvider = Provider<LocationRepository>((ref) {
  return LocationRepository(
      ref.watch(dioProvider), ref.watch(locationQueueProvider));
});

class LocationRepository {
  LocationRepository(this._dio, this._queue);
  final Dio _dio;
  final LocationQueueRepository _queue;

  Future<void> sendOrQueue(LocationPayload payload) async {
    try {
      await _dio.post('/api/locations', data: payload.toJson());
    } catch (_) {
      await _queue.enqueue(payload);
    }
  }

  Future<void> syncQueue() async {
    final pending = _queue.pending();
    if (pending.isEmpty) return;
    await _dio.post('/api/locations/batch',
        data: pending.map((e) => e.toJson()).toList());
    await _queue.markSynced(pending.map((e) => e.id));
  }
}
