import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../auth/controllers/auth_controller.dart';
import '../../permissions/controllers/permission_controller.dart';
import '../controllers/tracking_controller.dart';

final autoStartTrackingOnHomeProvider = Provider<bool>((_) => true);

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _checkedStartupPermissions = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _requestPermissionAndStart());
  }

  Future<void> _requestPermissionAndStart() async {
    if (_checkedStartupPermissions ||
        !mounted ||
        !ref.read(autoStartTrackingOnHomeProvider)) {
      return;
    }
    _checkedStartupPermissions = true;

    final permissionController =
        ref.read(permissionControllerProvider.notifier);
    await permissionController.refresh();
    var permissions = ref.read(permissionControllerProvider);
    if (permissions.location == LocationPermission.denied) {
      permissions = await permissionController.requestLocation();
    }

    final locationAllowed = permissions.location == LocationPermission.always ||
        permissions.location == LocationPermission.whileInUse;
    final tracking = ref.read(trackingControllerProvider);
    if (locationAllowed && permissions.gpsEnabled && !tracking.isTracking) {
      await ref
          .read(trackingControllerProvider.notifier)
          .start(tracking.current?.deviceName ?? 'Mobile device');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final permissions = ref.watch(permissionControllerProvider);
    final tracking = ref.watch(trackingControllerProvider);
    final user = auth.user;
    final point = tracking.current;
    final hasPermissionIssue = !permissions.ready;
    final statusColor = hasPermissionIssue
        ? Colors.orange
        : tracking.isTracking
            ? Colors.green
            : Colors.red;
    return Scaffold(
      appBar: AppBar(
        title: const Text('LiveTrack Mobile'),
        actions: [
          IconButton(
              onPressed: () => context.go('/permissions'),
              icon: const Icon(Icons.settings),
              tooltip: 'Settings')
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(trackingControllerProvider.notifier).refresh(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              color: statusColor.withValues(alpha: .12),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Icon(
                            hasPermissionIssue
                                ? Icons.warning_amber
                                : tracking.isTracking
                                    ? Icons.gps_fixed
                                    : Icons.gps_off,
                            color: statusColor,
                            size: 36),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text(
                                hasPermissionIssue
                                    ? 'Permission or GPS needed'
                                    : tracking.isTracking
                                        ? 'Tracking active'
                                        : 'Tracking stopped',
                                style:
                                    Theme.of(context).textTheme.headlineSmall)),
                      ]),
                      const SizedBox(height: 8),
                      Text('User: ${user?.name ?? '-'}'),
                      Text('Device: ${point?.deviceName ?? 'Mobile device'}'),
                    ]),
              ),
            ),
            const SizedBox(height: 12),
            _MetricGrid(metrics: [
              _Metric('GPS permission', permissions.location.name,
                  Icons.location_on_outlined, const Color(0xff3478dc)),
              _Metric('Latitude', point?.latitude.toStringAsFixed(6) ?? '-',
                  Icons.my_location, const Color(0xff26b99a)),
              _Metric('Longitude', point?.longitude.toStringAsFixed(6) ?? '-',
                  Icons.explore_outlined, const Color(0xff26b99a)),
              _Metric(
                  'Accuracy',
                  point == null
                      ? '-'
                      : '${point.accuracy.toStringAsFixed(1)} m',
                  Icons.gps_fixed,
                  const Color(0xfff0a431)),
              _Metric('Battery', point == null ? '-' : '${point.batteryLevel}%',
                  Icons.battery_charging_full, const Color(0xff8b5cf6)),
              _Metric(
                  'Last sync',
                  tracking.lastSync == null
                      ? '-'
                      : DateFormat.Hms().format(tracking.lastSync!),
                  Icons.sync,
                  const Color(0xff3478dc)),
              _Metric('Network', tracking.isOnline ? 'Online' : 'Offline',
                  Icons.wifi, const Color(0xff26b99a)),
              _Metric('Queued', tracking.queueCount.toString(),
                  Icons.outbox_outlined, const Color(0xff71819a)),
            ]),
            if (tracking.error != null)
              Padding(
                  padding: const EdgeInsets.all(8),
                  child: Text(tracking.error!,
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.error))),
            const SizedBox(height: 16),
            Wrap(spacing: 12, runSpacing: 12, children: [
              FilledButton.icon(
                onPressed: tracking.isTracking
                    ? null
                    : () => ref
                        .read(trackingControllerProvider.notifier)
                        .start(point?.deviceName ?? 'Mobile device'),
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start Tracking'),
              ),
              FilledButton.tonalIcon(
                onPressed: tracking.isTracking
                    ? () => _confirm(
                        context,
                        'Stop tracking?',
                        () => ref
                            .read(trackingControllerProvider.notifier)
                            .stop())
                    : null,
                icon: const Icon(Icons.stop),
                label: const Text('Stop Tracking'),
              ),
              OutlinedButton.icon(
                  onPressed: () =>
                      ref.read(trackingControllerProvider.notifier).refresh(),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Refresh Location')),
              OutlinedButton.icon(
                  onPressed: () => context.go('/permissions'),
                  icon: const Icon(Icons.settings),
                  label: const Text('Open Settings')),
              OutlinedButton.icon(
                onPressed: () =>
                    _confirm(context, 'Logout and stop tracking?', () async {
                  await ref.read(trackingControllerProvider.notifier).stop();
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go('/login');
                }),
                icon: const Icon(Icons.logout),
                label: const Text('Logout'),
              ),
            ]),
          ],
        ),
      ),
    );
  }

  Future<void> _confirm(BuildContext context, String title,
      Future<void> Function() action) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => _ConfirmDialog(title: title),
    );
    if (ok == true) {
      await action();
    }
  }
}

class _Metric {
  const _Metric(this.label, this.value, this.icon, this.color);
  final String label;
  final String value;
  final IconData icon;
  final Color color;
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid({required this.metrics});
  final List<_Metric> metrics;

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: MediaQuery.sizeOf(context).width > 700 ? 4 : 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.28,
      children: metrics.map((metric) => _MetricTile(metric: metric)).toList(),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric});
  final _Metric metric;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final line = isDark ? const Color(0xff203b60) : const Color(0xffdbe5f2);
    final shadowColor = isDark ? Colors.black : const Color(0xff234b83);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: line),
        boxShadow: [
          BoxShadow(
            color: shadowColor.withValues(alpha: isDark ? .28 : .06),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: metric.color.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(metric.icon, color: metric.color, size: 18),
              ),
              const Spacer(),
              Container(
                width: 6,
                height: 6,
                decoration:
                    BoxDecoration(color: metric.color, shape: BoxShape.circle),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(metric.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: isDark
                            ? const Color(0xff8ca4c3)
                            : const Color(0xff71819a),
                        fontWeight: FontWeight.w800,
                      )),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(metric.value,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: scheme.onSurface,
                          fontWeight: FontWeight.w800,
                          letterSpacing: .1,
                        )),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ConfirmDialog extends StatelessWidget {
  const _ConfirmDialog({required this.title});
  final String title;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final isLogout = title.toLowerCase().contains('logout');
    final icon = isLogout ? Icons.logout : Icons.pause_circle_outline;
    final accent = isLogout ? const Color(0xffe2555c) : scheme.primary;
    final message = isLogout
        ? 'This will stop live tracking and sign you out from this device.'
        : 'Live location sharing will pause until you start tracking again.';

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(icon, color: accent, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                            height: 1.15,
                          )),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xff71819a),
                      height: 1.45,
                    )),
            const SizedBox(height: 22),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: FilledButton.styleFrom(
                      backgroundColor: accent,
                    ),
                    child: const Text('Confirm'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
