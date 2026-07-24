import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livetrack_mobile/core/storage/secure_store.dart';
import 'package:livetrack_mobile/features/auth/data/auth_repository.dart';
import 'package:mocktail/mocktail.dart';

class MockDio extends Mock implements Dio {}

class MockSecureStore extends Mock implements SecureStore {}

void main() {
  test('login stores backend access and refresh tokens', () async {
    final dio = MockDio();
    final store = MockSecureStore();
    when(() => store.saveToken(any())).thenAnswer((_) async {});
    when(() => store.saveRefreshToken(any())).thenAnswer((_) async {});
    when(() => dio.post<Map<String, dynamic>>('/api/auth/login',
        data: any(named: 'data'))).thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/api/auth/login'),
        data: {
          'accessToken': 'access-token',
          'refreshToken': 'refresh-token',
          'user': {
            'id': 'user-1',
            'fullName': 'Real User',
            'email': 'real@example.com'
          },
        },
      ),
    );
    final repo = AuthRepository(
      dio,
      store,
    );

    final user = await repo.login('real@example.com', 'password123');

    expect(user.name, 'Real User');
    verify(() => store.saveToken('access-token')).called(1);
    verify(() => store.saveRefreshToken('refresh-token')).called(1);
  });
}
