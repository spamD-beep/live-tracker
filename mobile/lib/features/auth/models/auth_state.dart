import 'user_profile.dart';

class AuthState {
  const AuthState(
      {this.user, this.loading = false, this.error, this.isRestored = false});
  final UserProfile? user;
  final bool loading;
  final String? error;
  final bool isRestored;
  bool get isAuthenticated => user != null;

  AuthState copyWith(
      {UserProfile? user,
      bool? loading,
      String? error,
      bool? isRestored,
      bool clearUser = false}) {
    return AuthState(
      user: clearUser ? null : user ?? this.user,
      loading: loading ?? this.loading,
      error: error,
      isRestored: isRestored ?? this.isRestored,
    );
  }
}
