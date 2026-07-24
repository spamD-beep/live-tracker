class WifiReading {
  const WifiReading({
    required this.bssid,
    this.ssid,
    required this.rssi,
    this.frequencyMhz,
  });

  final String bssid;
  final String? ssid;
  final int rssi;
  final int? frequencyMhz;

  Map<String, dynamic> toJson() => {
        'bssid': bssid,
        if (ssid != null && ssid!.isNotEmpty) 'ssid': ssid,
        'rssi': rssi,
        if (frequencyMhz != null) 'frequencyMhz': frequencyMhz,
      };
}
