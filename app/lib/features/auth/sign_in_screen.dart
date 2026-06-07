import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:otp_autofill/otp_autofill.dart';
import 'package:sms_autofill/sms_autofill.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/env.dart';
import '../../core/data/profile_repository.dart';
import '../../core/debug/app_log.dart';
import '../../design_system/design_system.dart';
import '../../shared/widgets/muh_primary_button.dart';
import '../../shared/widgets/orbital_backdrop.dart';

enum _AuthPhase {
  pickPhone,
  phoneManual,
  sendingCode,
  awaitingOtp,
  verifying,
}

/// Phone OTP (Supabase + Twilio). Android uses SMS User Consent + Retriever;
/// iOS uses native one-time-code autofill. Phone hint is requested on open.
class PhoneAuthScreen extends StatefulWidget {
  const PhoneAuthScreen({super.key});

  @override
  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();
}

class _PhoneAuthScreenState extends State<PhoneAuthScreen> {
  static const int _otpLength = 6;

  final _phone = TextEditingController();
  late final OTPInteractor _otpInteractor;
  late final OTPTextEditController _otpController;

  var _phase = _AuthPhase.pickPhone;
  var _busy = false;
  var _phoneHintAttempted = false;
  var _otpListenGeneration = 0;

  /// E.164 number used for the active OTP request.
  String _phoneSent = '';
  String _androidAppHash = '';

  @override
  void initState() {
    super.initState();
    _otpInteractor = OTPInteractor();
    _otpController = OTPTextEditController(
      codeLength: _otpLength,
      otpInteractor: _otpInteractor,
      onCodeReceive: (code) {
        if (!mounted || _busy || _phoneSent.isEmpty) return;
        unawaited(_verify(code));
      },
      onTimeOutException: () {
        if (mounted && _phase == _AuthPhase.awaitingOtp) {
          unawaited(_startOtpCapture());
        }
      },
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrapAuth());
  }

  @override
  void dispose() {
    _otpListenGeneration++;
    unawaited(_otpController.stopListen());
    _phone.dispose();
    _otpController.dispose();
    super.dispose();
  }

  String _extractOtp(String? message) {
    final m = RegExp(r'(\d{$_otpLength})').firstMatch(message ?? '');
    return m?.group(1) ?? '';
  }

  Future<void> _bootstrapAuth() async {
    if (!mounted || _phoneHintAttempted) return;
    _phoneHintAttempted = true;

    if (defaultTargetPlatform == TargetPlatform.android) {
      try {
        _androidAppHash = (await _otpInteractor.getAppSignature())?.trim() ?? '';
        if (kDebugMode && _androidAppHash.isNotEmpty) {
          debugPrint(
            'Android SMS Retriever hash (append to OTP SMS for silent read): $_androidAppHash',
          );
        }
      } catch (e, st) {
        appLog('auth: app signature failed', name: 'auth', error: e, stackTrace: st);
      }
    }

    await _offerPhoneHint();
  }

  Future<void> _offerPhoneHint() async {
    if (!mounted || _phase != _AuthPhase.pickPhone) return;

    final hint = await _requestPhoneHint();
    if (!mounted) return;

    if (hint == null || hint.trim().isEmpty) {
      setState(() => _phase = _AuthPhase.phoneManual);
      return;
    }

    final phone = _normalizePhone(hint);
    _phone.text = phone;
    if (_validE164(phone)) {
      await _sendCode();
      return;
    }

    setState(() => _phase = _AuthPhase.phoneManual);
  }

  Future<String?> _requestPhoneHint() async {
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return _otpInteractor.hint;
      }
      if (defaultTargetPlatform == TargetPlatform.iOS) {
        return SmsAutoFill().hint;
      }
    } catch (e, st) {
      appLog('auth: phone hint failed', name: 'auth', error: e, stackTrace: st);
    }
    return null;
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

  Future<void> _startOtpCapture() async {
    if (!mounted || _phase != _AuthPhase.awaitingOtp) return;

    final generation = ++_otpListenGeneration;
    await _otpController.stopListen();

    if (defaultTargetPlatform != TargetPlatform.android) return;

    final parse = _extractOtp;

    // Retriever is silent when SMS includes the 11-char app hash (Send SMS hook).
    if (_androidAppHash.isNotEmpty) {
      unawaited(
        _otpInteractor.startListenRetriever().then((message) {
          if (!mounted || generation != _otpListenGeneration) return;
          final code = parse(message);
          if (code.length == _otpLength) {
            _otpController.text = code;
            unawaited(_otpInteractor.stopListenForCode());
          }
        }).catchError((_) {}),
      );
    }

    unawaited(
      _otpController.startListenUserConsent(parse).catchError((Object error) {
        if (!mounted || generation != _otpListenGeneration) return;
        appLog('auth: OTP listen error', name: 'auth', error: error);
      }),
    );
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
      setState(() => _phase = _AuthPhase.phoneManual);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.errorGeneric)),
      );
      return;
    }

    setState(() {
      _busy = true;
      _phase = _AuthPhase.sendingCode;
    });

    appLog('auth: signInWithOtp request (${_maskPhone(phone)})', name: 'auth');
    try {
      final metadata = <String, dynamic>{};
      if (_androidAppHash.isNotEmpty) {
        metadata['android_app_hash'] = _androidAppHash;
      }

      await Supabase.instance.client.auth.signInWithOtp(
        phone: phone,
        data: metadata.isEmpty ? null : metadata,
      );
      if (!mounted) return;

      appLog('auth: OTP SMS dispatched', name: 'auth');
      _otpController.clear();
      setState(() {
        _phoneSent = phone;
        _phase = _AuthPhase.awaitingOtp;
      });
      unawaited(_startOtpCapture());
    } on AuthException catch (e) {
      if (mounted) {
        appLog('auth: signInWithOtp failed: ${e.message}', name: 'auth');
        setState(() => _phase = _AuthPhase.phoneManual);
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
        setState(() => _phase = _AuthPhase.phoneManual);
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

    _otpListenGeneration++;
    await _otpController.stopListen();

    setState(() {
      _busy = true;
      _phase = _AuthPhase.verifying;
    });

    appLog('auth: verifyOTP submit (${_maskPhone(_phoneSent)})', name: 'auth');
    try {
      await Supabase.instance.client.auth.verifyOTP(
        phone: _phoneSent,
        token: code,
        type: OtpType.sms,
      );
      final repo = ProfileRepository(Supabase.instance.client);
      await repo.ensureSignedInProfile();
      final target = await repo.initialSignedInRoute();
      if (!mounted) return;
      appLog('auth: verifyOTP success -> $target', name: 'auth');
      switch (target) {
        case 'home':
          context.go('/home');
          break;
        case 'onboarding':
          context.go('/onboarding/birth-basics');
          break;
        default:
          context.go('/welcome');
      }
    } on AuthException catch (e) {
      if (mounted) {
        appLog('auth: verifyOTP failed: ${e.message}', name: 'auth');
        setState(() => _phase = _AuthPhase.awaitingOtp);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.message)),
        );
        unawaited(_startOtpCapture());
      }
    } catch (e, st) {
      if (mounted) {
        appLog(
          'auth: verifyOTP error',
          name: 'auth',
          error: e,
          stackTrace: st,
        );
        setState(() => _phase = _AuthPhase.awaitingOtp);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.errorGeneric)),
        );
        unawaited(_startOtpCapture());
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _backToPhone() {
    _otpListenGeneration++;
    unawaited(_otpController.stopListen());
    _otpController.clear();
    setState(() {
      _awaitingCodeReset();
      _phase = _AuthPhase.phoneManual;
    });
  }

  void _awaitingCodeReset() {
    _phoneSent = '';
  }

  String _statusMessage(AppLocalizations l10n) {
    return switch (_phase) {
      _AuthPhase.pickPhone => l10n.authPickingNumber,
      _AuthPhase.sendingCode => l10n.authSendingCode,
      _AuthPhase.awaitingOtp => l10n.authWaitingForSms,
      _AuthPhase.verifying => l10n.authVerifying,
      _ => '',
    };
  }

  bool get _showStatusSpinner =>
      _phase == _AuthPhase.pickPhone ||
      _phase == _AuthPhase.sendingCode ||
      _phase == _AuthPhase.awaitingOtp ||
      _phase == _AuthPhase.verifying;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final pinLine = MuhColors.creamMuted.withValues(alpha: 0.5);
    final showPhoneForm = _phase == _AuthPhase.phoneManual;
    final showOtpForm =
        _phase == _AuthPhase.awaitingOtp || _phase == _AuthPhase.verifying;

    return OrbitalBackdrop(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            onPressed: () {
              if (showOtpForm) {
                _backToPhone();
              } else {
                context.pop();
              }
            },
          ),
        ),
        body: SafeArea(
          child: AutofillGroup(
            child: SingleChildScrollView(
              key: ValueKey<String>(showOtpForm ? 'otp' : 'phone'),
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
                  if (_showStatusSpinner) ...[
                    _AuthStatusRow(message: _statusMessage(l10n)),
                    const SizedBox(height: MuhSpace.lg),
                  ],
                  if (showPhoneForm) ...[
                      TextField(
                        controller: _phone,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.done,
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s]')),
                        ],
                        decoration: InputDecoration(
                          labelText: l10n.authPhone,
                          hintText: l10n.authPhoneHint,
                        ),
                        onSubmitted: (_) {
                          if (!_busy) unawaited(_sendCode());
                        },
                      ),
                      const SizedBox(height: MuhSpace.xl),
                      MuhPrimaryButton(
                        label: l10n.authSendCode,
                        onPressed: _busy ? null : _sendCode,
                      ),
                  ],
                  if (showOtpForm) ...[
                    Text(
                      l10n.authOtpLabel,
                      style: theme.textTheme.titleSmall?.copyWith(
                        color: MuhColors.creamMuted,
                      ),
                    ),
                    const SizedBox(height: MuhSpace.md),
                    PinInputTextField(
                      pinLength: _otpLength,
                      controller: _otpController,
                      autoFocus: false,
                      enabled: !_busy,
                      enableInteractiveSelection: !_busy,
                      autofillHints: const [AutofillHints.oneTimeCode],
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(_otpLength),
                      ],
                      decoration: UnderlineDecoration(
                        textStyle: theme.textTheme.headlineSmall?.copyWith(
                          color: MuhColors.cream,
                        ),
                        colorBuilder: FixedColorBuilder(pinLine),
                      ),
                      onSubmit: _busy ? null : _verify,
                    ),
                    if (_phase == _AuthPhase.awaitingOtp) ...[
                      const SizedBox(height: MuhSpace.lg),
                      Text(
                        l10n.authOtpAutoHint,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: MuhColors.creamMuted,
                          height: 1.4,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: MuhSpace.lg),
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
      ),
    );
  }
}

class _AuthStatusRow extends StatelessWidget {
  const _AuthStatusRow({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        const SizedBox(
          width: 22,
          height: 22,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        const SizedBox(width: MuhSpace.md),
        Expanded(
          child: Text(
            message,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: MuhColors.creamMuted,
            ),
          ),
        ),
      ],
    );
  }
}
