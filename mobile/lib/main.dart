import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:workmanager/workmanager.dart';

import 'app/app.dart';
import 'app/bootstrap.dart';
import 'features/tracking/services/background_tracking.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox<String>('location_queue');
  await Workmanager().initialize(backgroundDispatcher);
  final container = await createAppContainer();
  runApp(UncontrolledProviderScope(
      container: container, child: const LiveTrackApp()));
}
