import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../controllers/auth_controller.dart';
import 'auth_shell.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    return AuthShell(
      title: 'Consent-based tracking',
      subtitle: 'Secure access for authorized live location visibility.',
      child: Form(
        key: _formKey,
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Log in',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Enter your account details to continue.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 24),
          TextFormField(
            controller: _email,
            decoration: const InputDecoration(
                prefixIcon: Icon(Icons.mail_outline),
                labelText: 'Email address'),
            keyboardType: TextInputType.emailAddress,
            validator: _requiredEmail,
          ),
          const SizedBox(height: 14),
          TextFormField(
            controller: _password,
            decoration: const InputDecoration(
                prefixIcon: Icon(Icons.lock_outline), labelText: 'Password'),
            obscureText: true,
            validator: _requiredPassword,
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
                onPressed: () {}, child: const Text('Forgot password?')),
          ),
          if (auth.error != null)
            Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(auth.error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error))),
          FilledButton(
            onPressed: auth.loading ? null : _submit,
            child: auth.loading
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Log in'),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text("Don't have an account?",
                  style: Theme.of(context).textTheme.bodySmall),
              TextButton(
                  onPressed: () => context.go('/register'),
                  child: const Text('Sign up')),
            ],
          ),
        ]),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref
        .read(authControllerProvider.notifier)
        .login(_email.text.trim(), _password.text);
    if (ok && mounted) context.go('/home');
  }

  String? _requiredEmail(String? value) =>
      value != null && value.contains('@') ? null : 'Enter a valid email';
  String? _requiredPassword(String? value) =>
      value != null && value.length >= 8 ? null : 'Use at least 8 characters';
}
