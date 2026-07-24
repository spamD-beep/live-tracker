import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/wifi_reading.dart';

final wifiScanServiceProvider =
    Provider<WifiScanService>((_) => WifiScanService());

class WifiScanService {
  static const _channel = MethodChannel('livetrack/wifi_scan');

  Future<List<WifiReading>> scan() async {
    try {
      final raw = await _channel.invokeMethod<List<dynamic>>('scanWifi');
      return (raw ?? [])
          .whereType<Map>()
          .map((item) => WifiReading(
                bssid: item['bssid']?.toString().toLowerCase() ?? '',
                ssid: item['ssid']?.toString(),
                rssi: int.tryParse(item['rssi']?.toString() ?? '') ?? -120,
                frequencyMhz:
                    int.tryParse(item['frequencyMhz']?.toString() ?? ''),
              ))
          .where((reading) => reading.bssid.isNotEmpty)
          .toList();
    } catch (_) {
      return const [];
    }
  }
}
