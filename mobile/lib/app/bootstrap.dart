import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../features/auth/controllers/auth_controller.dart';

Future<ProviderContainer> createAppContainer() async {
  final container = ProviderContainer(overrides: [
    appConfigProvider.overrideWithValue(AppConfig.fromEnvironment()),
  ]);
  await container.read(authControllerProvider.notifier).restoreSession();
  return container;
}
