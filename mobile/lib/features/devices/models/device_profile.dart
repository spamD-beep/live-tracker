class DeviceProfile {
  const DeviceProfile({required this.id, required this.name});
  final String id;
  final String name;

  factory DeviceProfile.fromJson(Map<String, dynamic> json) => DeviceProfile(
        id: json['id']?.toString() ?? json['deviceId']?.toString() ?? '',
        name: json['name']?.toString() ?? json['deviceName']?.toString() ?? '',
      );
}
