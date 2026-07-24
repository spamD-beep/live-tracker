import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/auth_repository.dart';
import '../models/auth_state.dart';

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repo) : super(const AuthState());
  final AuthRepository _repo;

  Future<void> restoreSession() async {
    state = state.copyWith(loading: true);
    try {
      state = state.copyWith(
          user: await _repo.me(), loading: false, isRestored: true);
    } catch (_) {
      state = state.copyWith(loading: false, isRestored: true, clearUser: true);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(loading: true);
    try {
      state = state.copyWith(
          user: await _repo.login(email, password), loading: false);
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: authErrorMessage(e));
      return false;
    }
  }

  Future<bool> register(
      String fullName, String email, String password, String deviceName) async {
    state = state.copyWith(loading: true);
    try {
      state = state.copyWith(
          user: await _repo.register(
              fullName: fullName,
              email: email,
              password: password,
              deviceName: deviceName),
          loading: false);
      return true;
    } catch (e) {
      state = state.copyWith(loading: false, error: authErrorMessage(e));
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = state.copyWith(clearUser: true);
  }
}
