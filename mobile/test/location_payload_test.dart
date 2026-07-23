import 'package:flutter_test/flutter_test.dart';
import 'package:livetrack_mobile/features/tracking/models/location_payload.dart';

void main() {
  test('serializes required location payload fields', () {
    final payload = LocationPayload(
      id: 'point-1',
      deviceId: 'device-uuid',
      deviceName: 'Ali Phone',
      latitude: 31.5204,
      longitude: 74.3587,
      accuracy: 12.4,
      altitude: 217,
      speed: 2.5,
      heading: 90,
      batteryLevel: 76,
      isCharging: false,
      recordedAt: DateTime.parse('2026-07-23T18:30:00+05:00'),
    );

    final json = payload.toJson();

    expect(json['deviceId'], 'device-uuid');
    expect(json['latitude'], 31.5204);
    expect(json['batteryLevel'], 76);
    expect(json['recordedAt'], contains('2026'));
  });
}
