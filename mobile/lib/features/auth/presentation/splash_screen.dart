import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../controllers/auth_controller.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!auth.isRestored) return;
      context.go(auth.isAuthenticated ? '/home' : '/login');
    });
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
