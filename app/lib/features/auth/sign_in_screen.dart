import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:sms_autofill/sms_autofill.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/env.dart';
import '../../core/debug/app_log.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

/// Phone OTP only (Supabase + Twilio). Uses [PhoneFieldHint] for number hint and
/// [PinFieldAutoFill] for SMS / iOS one-time-code autofill.
class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({super.key});

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  static const int _otpLength = 6;

  final _phone = TextEditingController();
  final _otpController = TextEditingController();
  var _awaitingCode = false;
  var _busy = false;
  /// E.164 number used for the active OTP request.
  String _phoneSent = '';

  @override
  void dispose() {
    _phone.dispose();
    _otpController.dispose();
    super.dispose();
  }

  bool _validE164(String raw) {
    final t = raw.replaceAll(RegExp(r'\s'), '');
    return RegExp(r'^\+\d{10,15}$').hasMatch(t);
  }

  String _normalizePhone(String raw) => raw.replaceAll(RegExp(r'\s'), '');

  String _maskPhone(String p) {
    if (p.length <= 6) return '(short)';
    return '${p.substring(0, 4)}…${p.substring(p.length - 2)}';
  }

  Future<void> _sendCode() async {
    final l10n = AppLocalizations.of(context)!;
    if (!Env.hasSupabase) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorNeedSupabase)),
      );
      return;
    }

    final phone = _normalizePhone(_phone.text);
    if (!_validE164(phone)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
      return;
    }

    if (kDebugMode) {
      final sig = await SmsAutoFill().getAppSignature;
      debugPrint(
        'Android SMS Retriever hash (append to SMS body for auto-read): $sig',
      );
    }

    setState(() => _busy = true);
    appLog('auth: signInWithOtp request (${_maskPhone(phone)})', name: 'auth');
    try {
      await Supabase.instance.client.auth.signInWithOtp(phone: phone);
      if (!mounted) return;
      appLog('auth: OTP SMS dispatched', name: 'auth');
      setState(() {
        _phoneSent = phone;
        _awaitingCode = true;
      });
      _otpController.clear();
    } on AuthException catch (e) {
      if (mounted) {
        appLog('auth: signInWithOtp failed: ${e.message}', name: 'auth');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e, st) {
      if (mounted) {
        appLog(
          'auth: signInWithOtp error',
          name: 'auth',
          error: e,
          stackTrace: st,
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric)),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify(String token) async {
    final l10n = AppLocalizations.of(context)!;
    final code = token.trim();
    if (_busy ||
        _phoneSent.isEmpty ||
        code.length != _otpLength ||
        !RegExp('^\\d{$_otpLength}\$').hasMatch(code)) {
      return;
    }
    setState(() => _busy = true);
    appLog('auth: verifyOTP submit (${_maskPhone(_phoneSent)})', name: 'auth');
    try {
      await Supabase.instance.client.auth.verifyOTP(
        phone: _phoneSent,
        token: code,
        type: OtpType.sms,
      );
      if (!mounted) return;
      appLog('auth: verifyOTP success → onboarding', name: 'auth');
      context.go('/onboarding/birth-basics');
    } on AuthException catch (e) {
      if (mounted) {
        appLog('auth: verifyOTP failed: ${e.message}', name: 'auth');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
      }
    } catch (e, st) {
      if (mounted) {
        appLog(
          'auth: verifyOTP error',
          name: 'auth',
          error: e,
          stackTrace: st,
        );
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric)),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _backToPhone() {
    _otpController.clear();
    setState(() {
      _awaitingCode = false;
      _phoneSent = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final pinLine = MuhColors.creamMuted.withValues(alpha: 0.5);

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            onPressed: () {
              if (_awaitingCode) {
                _backToPhone();
              } else {
                context.pop();
              }
            },
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            key: ValueKey<String>(_awaitingCode ? 'otp' : 'phone'),
            padding: const EdgeInsets.all(MuhSpace.page),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.authTitle,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: MuhSpace.sm),
                Text(
                  l10n.authSubtitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: MuhColors.creamMuted,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: MuhSpace.xl),
                if (!_awaitingCode) ...[
                  PhoneFieldHint(
                    controller: _phone,
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s]')),
                    ],
                    decoration: InputDecoration(
                      labelText: l10n.authPhone,
                      hintText: l10n.authPhoneHint,
                    ),
                  ),
                  const SizedBox(height: MuhSpace.xl),
                  MuhPrimaryButton(
                    label: l10n.authSendCode,
                    onPressed: _busy ? null : _sendCode,
                  ),
                ] else ...[
                  Text(
                    l10n.authOtpLabel,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: MuhColors.creamMuted,
                    ),
                  ),
                  const SizedBox(height: MuhSpace.md),
                  PinFieldAutoFill(
                    controller: _otpController,
                    autoFocus: true,
                    codeLength: _otpLength,
                    smsCodeRegexPattern: '\\d{$_otpLength}',
                    decoration: UnderlineDecoration(
                      textStyle: theme.textTheme.headlineSmall?.copyWith(
                        color: MuhColors.cream,
                      ),
                      colorBuilder: FixedColorBuilder(pinLine),
                    ),
                    onCodeSubmitted: _busy ? null : _verify,
                    onCodeChanged: (code) {
                      // PinFieldAutoFill invokes this from initState → avoid setState during build.
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (!mounted) return;
                        setState(() {});
                        if (code != null &&
                            code.length == _otpLength &&
                            !_busy &&
                            _phoneSent.isNotEmpty) {
                          _verify(code);
                        }
                      });
                    },
                  ),
                  const SizedBox(height: MuhSpace.lg),
                  MuhPrimaryButton(
                    label: l10n.authVerify,
                    onPressed: _busy ||
                            _otpController.text.trim().length != _otpLength
                        ? null
                        : () => _verify(_otpController.text),
                  ),
                  TextButton(
                    onPressed: _busy ? null : _sendCode,
                    child: Text(l10n.authResendCode),
                  ),
                  TextButton(
                    onPressed: _busy ? null : _backToPhone,
                    child: Text(l10n.authChangeNumber),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
