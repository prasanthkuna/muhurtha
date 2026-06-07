import 'dart:io';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../data/muhurtha_engine_api.dart';
import '../locale/locale_provider.dart';

final muhurthaNotificationServiceProvider =
    Provider<MuhurthaNotificationService>((ref) {
  return MuhurthaNotificationService(ref);
});

class MuhurthaNotificationService {
  MuhurthaNotificationService(this._ref);

  final Ref _ref;
  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  Future<void> syncNextWeek() async {
    final api = _ref.read(muhurthaEngineApiProvider);
    if (api == null) return;
    await _ensureInitialized();
    final locale = _ref.read(localeProvider).languageCode;
    final rows = await api.notificationScheduleGet(locale: locale);
    for (final row in rows) {
      if (row.title.trim().isEmpty || row.body.trim().isEmpty) continue;
      if (row.scheduledAt
          .isBefore(DateTime.now().add(const Duration(minutes: 1)))) {
        continue;
      }
      await _plugin.zonedSchedule(
        id: row.key.hashCode & 0x7fffffff,
        title: row.title,
        body: row.body,
        scheduledDate: tz.TZDateTime.from(row.scheduledAt.toLocal(), tz.local),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'muhurta_timing',
            'Muhurta timing',
            channelDescription:
                'Daily card, good time, and caution time alerts',
            importance: Importance.high,
            priority: Priority.high,
          ),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        payload: row.deepLink,
      );
    }
  }

  Future<void> _ensureInitialized() async {
    if (_initialized) return;
    tzdata.initializeTimeZones();
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      ),
    );
    if (Platform.isAndroid) {
      await _plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    }
    _initialized = true;
  }
}
