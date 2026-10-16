import 'dart:async';

import 'package:flutter/foundation.dart';

/// Notifies [GoRouter] when auth state changes so `/auth` → `/home` works reliably.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    _subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
