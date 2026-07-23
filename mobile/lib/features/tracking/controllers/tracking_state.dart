import '../models/location_payload.dart';

class TrackingState {
  const TrackingState({
    this.isTracking = false,
    this.isOnline = true,
    this.current,
    this.lastSync,
    this.queueCount = 0,
    this.error,
  });

  final bool isTracking;
  final bool isOnline;
  final LocationPayload? current;
  final DateTime? lastSync;
  final int queueCount;
  final String? error;

  TrackingState copyWith({
    bool? isTracking,
    bool? isOnline,
    LocationPayload? current,
    DateTime? lastSync,
    int? queueCount,
    String? error,
  }) {
    return TrackingState(
      isTracking: isTracking ?? this.isTracking,
      isOnline: isOnline ?? this.isOnline,
      current: current ?? this.current,
      lastSync: lastSync ?? this.lastSync,
      queueCount: queueCount ?? this.queueCount,
      error: error,
    );
  }
}
