import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final _plugin = FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    await _plugin
        .initialize(const InitializationSettings(android: android, iOS: ios));
  }

  Future<void> showTrackingNotification() async {
    const details = NotificationDetails(
      android: AndroidNotificationDetails(
        'livetrack_tracking',
        'LiveTrack tracking',
        channelDescription:
            'Shows when consent-based location tracking is active.',
        importance: Importance.low,
        priority: Priority.low,
        ongoing: true,
      ),
    );
    await _plugin.show(1001, 'LiveTrack is active',
        'Your location is being shared with your consent.', details);
  }

  Future<void> stopTrackingNotification() => _plugin.cancel(1001);
}
