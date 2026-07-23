class UserProfile {
  const UserProfile(
      {required this.id, required this.name, required this.email});
  final String id;
  final String name;
  final String email;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? json['fullName']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
      );
}
