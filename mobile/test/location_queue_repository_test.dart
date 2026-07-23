import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:livetrack_mobile/features/tracking/data/location_queue_repository.dart';
import 'package:livetrack_mobile/features/tracking/models/location_payload.dart';

void main() {
  late Directory dir;

  setUp(() async {
    dir = await Directory.systemTemp.createTemp('livetrack_queue_test');
    Hive.init(dir.path);
  });

  tearDown(() async {
    await Hive.close();
    await dir.delete(recursive: true);
  });

  test('queues and removes synced locations', () async {
    final box = await Hive.openBox<String>('queue');
    final repo = LocationQueueRepository(box);
    final payload = LocationPayload(
      id: 'point-1',
      deviceId: 'device-1',
      deviceName: 'Test phone',
      latitude: 1,
      longitude: 2,
      accuracy: 3,
      altitude: 4,
      speed: 5,
      heading: 6,
      batteryLevel: 90,
      isCharging: true,
      recordedAt: DateTime.utc(2026, 7, 23),
    );

    await repo.enqueue(payload);
    expect(repo.pending(), hasLength(1));

    await repo.markSynced(['point-1']);
    expect(repo.pending(), isEmpty);
  });
}
