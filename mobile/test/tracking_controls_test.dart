import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livetrack_mobile/core/config/app_config.dart';
import 'package:livetrack_mobile/features/auth/controllers/auth_controller.dart';
import 'package:livetrack_mobile/features/auth/data/auth_repository.dart';
import 'package:livetrack_mobile/features/devices/data/device_repository.dart';
import 'package:livetrack_mobile/features/tracking/data/location_repository.dart';
import 'package:livetrack_mobile/features/tracking/data/wifi_observation_repository.dart';
import 'package:livetrack_mobile/features/tracking/controllers/tracking_controller.dart';
import 'package:livetrack_mobile/features/tracking/presentation/home_screen.dart';
import 'package:livetrack_mobile/features/tracking/services/location_service.dart';
import 'package:livetrack_mobile/features/tracking/services/wifi_scan_service.dart';
import 'package:mocktail/mocktail.dart';

class MockLocationService extends Mock implements LocationService {}

class MockLocationRepository extends Mock implements LocationRepository {}

class MockWifiObservationRepository extends Mock
    implements WifiObservationRepository {}

class MockDeviceRepository extends Mock implements DeviceRepository {}

class MockAuthRepository extends Mock implements AuthRepository {}

class MockWifiScanService extends Mock implements WifiScanService {}

void main() {
  testWidgets('home screen exposes tracking controls', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider
              .overrideWith((ref) => AuthController(MockAuthRepository())),
          autoStartTrackingOnHomeProvider.overrideWithValue(false),
          trackingControllerProvider.overrideWith(
            (ref) => TrackingController(
              MockLocationService(),
              MockLocationRepository(),
              MockWifiObservationRepository(),
              MockDeviceRepository(),
              MockWifiScanService(),
              const AppConfig(
                apiBaseUrl: 'https://api.example.com',
                foregroundInterval: Duration(seconds: 15),
                backgroundInterval: Duration(minutes: 15),
                distanceFilterMeters: 10,
                requestTimeout: Duration(seconds: 20),
              ),
            ),
          ),
        ],
        child: const MaterialApp(home: HomeScreen()),
      ),
    );

    expect(find.text('Start Tracking'), findsOneWidget);
    expect(find.text('Stop Tracking'), findsOneWidget);
    expect(find.text('Refresh Location'), findsOneWidget);
  });
}
