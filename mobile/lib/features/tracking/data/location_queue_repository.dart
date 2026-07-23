import 'dart:convert';

import 'package:hive/hive.dart';

import '../models/location_payload.dart';

class LocationQueueRepository {
  LocationQueueRepository(this._box);
  final Box<String> _box;

  Future<void> enqueue(LocationPayload payload) =>
      _box.put(payload.id, jsonEncode(payload.toJson()));

  List<LocationPayload> pending() {
    return _box.values
        .map((raw) =>
            LocationPayload.fromJson(jsonDecode(raw) as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.recordedAt.compareTo(b.recordedAt));
  }

  Future<void> markSynced(Iterable<String> ids) async {
    for (final id in ids) {
      await _box.delete(id);
    }
  }

  int get count => _box.length;
}
