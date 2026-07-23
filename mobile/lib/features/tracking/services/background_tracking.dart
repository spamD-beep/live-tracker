import 'package:workmanager/workmanager.dart';

const backgroundTrackingTask = 'livetrack.background.location.sync';

@pragma('vm:entry-point')
void backgroundDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    return true;
  });
}
