import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../controllers/permission_controller.dart';

class PermissionScreen extends ConsumerStatefulWidget {
  const PermissionScreen({super.key});

  @override
  ConsumerState<PermissionScreen> createState() => _PermissionScreenState();
}

class _PermissionScreenState extends ConsumerState<PermissionScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(permissionControllerProvider.notifier).refresh());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(permissionControllerProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Permissions')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.privacy_tip_outlined,
                          color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 10),
                      Text('Consent and privacy',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'LiveTrack shares this device location only after you grant permission and tracking is active. Office Wi-Fi scans are used only for room estimation, and scans outside the office are not retained.',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _Tile(
              title: 'GPS',
              value: state.gpsEnabled ? 'Enabled' : 'Disabled',
              ok: state.gpsEnabled),
          _Tile(
              title: 'Location',
              value: state.location.name,
              ok: state.location == LocationPermission.always ||
                  state.location == LocationPermission.whileInUse),
          _Tile(
              title: 'Notifications',
              value: state.notificationGranted ? 'Allowed' : 'Not allowed',
              ok: state.notificationGranted),
          const SizedBox(height: 16),
          FilledButton.icon(
              onPressed: () => ref
                  .read(permissionControllerProvider.notifier)
                  .requestLocation(),
              icon: const Icon(Icons.location_on),
              label: const Text('Request permissions')),
          OutlinedButton.icon(
              onPressed: () => ref
                  .read(permissionControllerProvider.notifier)
                  .openSettings(),
              icon: const Icon(Icons.settings),
              label: const Text('Open system settings')),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.title, required this.value, required this.ok});
  final String title;
  final String value;
  final bool ok;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(ok ? Icons.check_circle : Icons.warning_amber,
          color: ok ? Colors.green : Colors.orange),
      title: Text(title),
      subtitle: Text(value),
    );
  }
}
