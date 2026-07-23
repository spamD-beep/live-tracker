import 'package:flutter_riverpod/flutter_riverpod.dart';

final appConfigProvider =
    Provider<AppConfig>((_) => AppConfig.fromEnvironment());

class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.foregroundInterval,
    required this.backgroundInterval,
    required this.distanceFilterMeters,
    required this.requestTimeout,
  });

  final String apiBaseUrl;
  final Duration foregroundInterval;
  final Duration backgroundInterval;
  final double distanceFilterMeters;
  final Duration requestTimeout;

  factory AppConfig.fromEnvironment() {
    const distanceFilter = int.fromEnvironment(
        'LOCATION_DISTANCE_FILTER_METERS',
        defaultValue: 10);
    return AppConfig(
      apiBaseUrl: const String.fromEnvironment('API_BASE_URL',
          defaultValue: 'https://api.example.com'),
      foregroundInterval: const Duration(
          seconds: int.fromEnvironment('LOCATION_FOREGROUND_INTERVAL_SECONDS',
              defaultValue: 15)),
      backgroundInterval: const Duration(
          minutes: int.fromEnvironment('LOCATION_BACKGROUND_INTERVAL_MINUTES',
              defaultValue: 15)),
      distanceFilterMeters: distanceFilter.toDouble(),
      requestTimeout: const Duration(
          seconds:
              int.fromEnvironment('REQUEST_TIMEOUT_SECONDS', defaultValue: 20)),
    );
  }
}
