import 'package:uuid/uuid.dart';

class LocationPayload {
  LocationPayload({
    String? id,
    required this.deviceId,
    required this.deviceName,
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.altitude,
    required this.speed,
    required this.heading,
    required this.batteryLevel,
    required this.isCharging,
    required this.recordedAt,
    this.synced = false,
  }) : id = id ?? const Uuid().v4();

  final String id;
  final String deviceId;
  final String deviceName;
  final double latitude;
  final double longitude;
  final double accuracy;
  final double altitude;
  final double speed;
  final double heading;
  final int batteryLevel;
  final bool isCharging;
  final DateTime recordedAt;
  final bool synced;

  Map<String, dynamic> toJson() => {
        'clientLocationId': id,
        'deviceId': deviceId,
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'altitude': altitude,
        'speed': speed,
        'heading': heading,
        'batteryLevel': batteryLevel,
        'isCharging': isCharging,
        'recordedAt': recordedAt.toUtc().toIso8601String(),
      };

  factory LocationPayload.fromJson(Map<String, dynamic> json) =>
      LocationPayload(
        id: json['clientLocationId']?.toString() ?? json['id']?.toString(),
        deviceId: json['deviceId']?.toString() ?? '',
        deviceName: json['deviceName']?.toString() ?? '',
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
        altitude: (json['altitude'] as num?)?.toDouble() ?? 0,
        speed: (json['speed'] as num?)?.toDouble() ?? 0,
        heading: (json['heading'] as num?)?.toDouble() ?? 0,
        batteryLevel: (json['batteryLevel'] as num?)?.toInt() ?? 0,
        isCharging: json['isCharging'] == true,
        recordedAt: DateTime.parse(json['recordedAt'].toString()),
        synced: json['synced'] == true,
      );
}
