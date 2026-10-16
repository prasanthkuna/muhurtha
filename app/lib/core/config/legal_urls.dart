/// Public legal / marketing URLs (compile-time override via [LEGAL_SITE_URL]).
abstract final class LegalUrls {
  static const siteBase = String.fromEnvironment(
    'LEGAL_SITE_URL',
    defaultValue: 'https://muhurta-legal.vercel.app',
  );

  static const supportEmail = String.fromEnvironment(
    'SUPPORT_EMAIL',
    defaultValue: 'prasanthkuna@gmail.com',
  );

  static String get privacy => '$siteBase/privacy';
  static String get terms => '$siteBase/terms';
  static String get deleteAccount => '$siteBase/delete-account';
  static String get home => siteBase;

  static Uri accountDeletionMailto({String? phoneHint}) {
    final body = StringBuffer()
      ..writeln('Please delete my Muhūrta account and associated data.')
      ..writeln()
      ..writeln('Phone on account: ${phoneHint ?? '(your number)'}')
      ..writeln('Requested on: ${DateTime.now().toUtc().toIso8601String()}');
    return Uri(
      scheme: 'mailto',
      path: supportEmail,
      queryParameters: {
        'subject': 'Muhūrta account deletion request',
        'body': body.toString(),
      },
    );
  }
}
