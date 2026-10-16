import 'package:flutter_test/flutter_test.dart';

import 'package:muhurta/app/muh_app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('App builds successfully', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MuhApp()));
    await tester.pumpAndSettle();

    expect(find.text('Begin'), findsOneWidget);
    expect(find.textContaining('First check your past'), findsOneWidget);
  });
}
