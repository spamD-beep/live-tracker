import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:livetrack_mobile/features/auth/controllers/auth_controller.dart';
import 'package:livetrack_mobile/features/auth/data/auth_repository.dart';
import 'package:livetrack_mobile/features/auth/presentation/login_screen.dart';
import 'package:mocktail/mocktail.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

void main() {
  testWidgets('login screen shows email password and login controls', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authControllerProvider.overrideWith((ref) => AuthController(MockAuthRepository())),
        ],
        child: const MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.text('Log in'), findsWidgets);
    expect(find.byType(TextFormField), findsNWidgets(2));
    expect(find.text('Sign up'), findsOneWidget);
  });
}
