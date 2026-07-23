import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../controllers/auth_controller.dart';
import 'auth_shell.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  final _device = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    return AuthShell(
      title: 'Authorized devices only',
      subtitle: 'Create an account before sharing live location.',
      child: Form(
        key: _formKey,
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text('Sign up',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          Text('Register your profile and this device.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 24),
          TextFormField(
              controller: _name,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.person_outline),
                  labelText: 'Full name'),
              validator: _required),
          const SizedBox(height: 14),
          TextFormField(
              controller: _email,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.mail_outline),
                  labelText: 'Email address'),
              keyboardType: TextInputType.emailAddress,
              validator: (v) =>
                  v != null && v.contains('@') ? null : 'Enter a valid email'),
          const SizedBox(height: 14),
          TextFormField(
              controller: _password,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.lock_outline), labelText: 'Password'),
              obscureText: true,
              validator: (v) => v != null && v.length >= 8
                  ? null
                  : 'Use at least 8 characters'),
          const SizedBox(height: 14),
          TextFormField(
              controller: _confirm,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.verified_user_outlined),
                  labelText: 'Confirm password'),
              obscureText: true,
              validator: (v) =>
                  v == _password.text ? null : 'Passwords do not match'),
          const SizedBox(height: 14),
          TextFormField(
              controller: _device,
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.phone_android),
                  labelText: 'Device name'),
              validator: _required),
          if (auth.error != null)
            Padding(
                padding: const EdgeInsets.only(top: 12),
                child: Text(auth.error!,
                    style:
                        TextStyle(color: Theme.of(context).colorScheme.error))),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: auth.loading ? null : _submit,
            child: auth.loading
                ? const SizedBox.square(
                    dimension: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Create account'),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Already registered?',
                  style: Theme.of(context).textTheme.bodySmall),
              TextButton(
                  onPressed: () => context.go('/login'),
                  child: const Text('Log in')),
            ],
          ),
        ]),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final ok = await ref.read(authControllerProvider.notifier).register(
        _name.text.trim(),
        _email.text.trim(),
        _password.text,
        _device.text.trim());
    if (ok && mounted) context.go('/home');
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Required' : null;
}
