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

import '../../core/debug/auth_telemetry.dart';

import '../../design_system/design_system.dart';

import '../../shared/widgets/muh_primary_button.dart';

import '../../shared/widgets/orbital_backdrop.dart';



enum _AuthPhase {

  choosePhone,

  sendingCode,

  awaitingOtp,

  verifying,

}



/// Phone OTP: type number or pick from SIM, then Continue → auto-verify OTP.

class PhoneAuthScreen extends StatefulWidget {

  const PhoneAuthScreen({super.key});



  @override

  State<PhoneAuthScreen> createState() => _PhoneAuthScreenState();

}



class _PhoneAuthScreenState extends State<PhoneAuthScreen> {

  static const int _otpLength = 6;

  static const Duration _busyWatchdog = Duration(seconds: 35);



  final _phone = TextEditingController();

  late final OTPInteractor _otpInteractor;

  late final OTPTextEditController _otpController;



  var _phase = _AuthPhase.choosePhone;

  var _busy = false;

  var _otpListenGeneration = 0;

  Timer? _watchdog;



  String _phoneSent = '';

  String _androidAppHash = '';

  String? _verifyInFlightCode;



  @override

  void initState() {

    super.initState();

    authLog('screen_open', context: {'hasSupabase': Env.hasSupabase});

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

    _otpController.addListener(_onOtpTextChanged);

    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrapAuth());

  }



  void _onOtpTextChanged() {

    if (_busy || _phase != _AuthPhase.awaitingOtp) return;

    final text = _otpController.text.trim();

    if (text.length == _otpLength) {

      unawaited(_verify(text));

    }

  }



  @override

  void dispose() {

    _disarmWatchdog();

    _otpListenGeneration++;

    _otpController.removeListener(_onOtpTextChanged);

    unawaited(_otpController.stopListen());

    _phone.dispose();

    _otpController.dispose();

    super.dispose();

  }



  void _armWatchdog() {

    _disarmWatchdog();

    _watchdog = Timer(_busyWatchdog, () {

      if (!mounted || !_busy) return;

      authLog('watchdog_stuck', level: 'warn', context: {'phase': _phase.name});

      setState(() {

        _busy = false;

        _phase = _phoneSent.isEmpty

            ? _AuthPhase.choosePhone

            : _AuthPhase.awaitingOtp;

      });

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(AppLocalizations.of(context)!.authStuckRetry)),

      );

    });

  }



  void _disarmWatchdog() {

    _watchdog?.cancel();

    _watchdog = null;

  }



  String _extractOtp(String? message) {

    final m = RegExp(r'(\d{6})').firstMatch(message ?? '');

    return m?.group(1) ?? '';

  }



  Future<void> _bootstrapAuth() async {

    if (!mounted) return;

    if (defaultTargetPlatform == TargetPlatform.android) {

      try {

        _androidAppHash = (await _otpInteractor.getAppSignature())?.trim() ?? '';

        authLog(

          'bootstrap_ok',

          context: {'hasAppHash': _androidAppHash.isNotEmpty},

        );

      } catch (e, st) {

        authLog('bootstrap_failed', level: 'error', error: e, stackTrace: st);

      }

    } else {

      authLog('bootstrap_ok', context: {'hasAppHash': false});

    }

  }



  Future<void> _pickPhoneAndSend() async {

    final l10n = AppLocalizations.of(context)!;

    if (_busy) return;



    authLog('picker_open');

    String? hint;

    try {

      hint = await _requestPhoneHint().timeout(

        const Duration(seconds: 45),

        onTimeout: () {

          authLog('picker_timeout', level: 'warn');

          return null;

        },

      );

    } catch (e, st) {

      authLog('picker_error', level: 'error', error: e, stackTrace: st);

    }

    if (!mounted) return;



    if (hint == null || hint.trim().isEmpty) {

      authLog('picker_cancelled');

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(l10n.authPickerCancelled)),

      );

      return;

    }



    final phone = _normalizePhone(hint);

    _phone.text = phone;

    setState(() {});

    authLog('picker_selected', context: {'masked': _maskPhone(phone)});



    if (!_validE164(phone)) {

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(l10n.authPhoneHint)),

      );

      return;

    }



    await _sendCode();

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

      authLog('picker_hint_error', level: 'error', error: e, stackTrace: st);

    }

    return null;

  }



  bool _validE164(String raw) {

    final t = raw.replaceAll(RegExp(r'\s'), '');

    return RegExp(r'^\+\d{10,15}$').hasMatch(t);

  }



  String _normalizePhone(String raw) {

    var t = raw.replaceAll(RegExp(r'[\s\-()]'), '');

    if (t.startsWith('00')) {

      t = '+${t.substring(2)}';

    }

    if (!t.startsWith('+') && t.length == 10 && RegExp(r'^[6-9]').hasMatch(t)) {

      t = '+91$t';

    }

    if (!t.startsWith('+') && t.startsWith('91') && t.length == 12) {

      t = '+$t';

    }

    return t;

  }



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



    if (_androidAppHash.isNotEmpty) {

      unawaited(

        _otpInteractor.startListenRetriever().then((message) {

          if (!mounted || generation != _otpListenGeneration) return;

          final code = parse(message);

          if (code.length == _otpLength) {

            _otpController.text = code;

            unawaited(_otpInteractor.stopListenForCode());

            unawaited(_verify(code));

          }

        }).catchError((_) {}),

      );

    }



    unawaited(

      _otpController.startListenUserConsent(parse).catchError((Object error) {

        if (!mounted || generation != _otpListenGeneration) return;

        authLog('otp_listen_error', level: 'warn', error: error);

      }),

    );

  }



  Future<void> _sendCode() async {

    final l10n = AppLocalizations.of(context)!;

    if (!Env.hasSupabase) {

      authLog('send_blocked_no_supabase', level: 'error');

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(l10n.errorNeedSupabase)),

      );

      return;

    }



    final phone = _normalizePhone(_phone.text);

    if (!_validE164(phone)) {

      authLog('send_invalid_phone', context: {'rawLen': _phone.text.length});

      ScaffoldMessenger.of(context).showSnackBar(

        SnackBar(content: Text(l10n.authPhoneHint)),

      );

      return;

    }



    setState(() {

      _busy = true;

      _phase = _AuthPhase.sendingCode;

    });

    _armWatchdog();



    authLog('send_start', context: {'masked': _maskPhone(phone)});

    try {

      final metadata = <String, dynamic>{};

      if (_androidAppHash.isNotEmpty) {

        metadata['android_app_hash'] = _androidAppHash;

      }



      await Supabase.instance.client.auth

          .signInWithOtp(

            phone: phone,

            data: metadata.isEmpty ? null : metadata,

          )

          .timeout(const Duration(seconds: 30));

      if (!mounted) return;



      authLog('send_ok', context: {'masked': _maskPhone(phone)});

      _otpController.clear();

      setState(() {

        _phoneSent = phone;

        _phase = _AuthPhase.awaitingOtp;

      });

      unawaited(_startOtpCapture());

    } on TimeoutException {

      if (mounted) {

        authLog('send_timeout', level: 'warn');

        setState(() => _phase = _AuthPhase.choosePhone);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(l10n.errorGeneric)),

        );

      }

    } on AuthException catch (e) {

      if (mounted) {

        authLog('send_auth_error', level: 'error', error: e);

        setState(() => _phase = _AuthPhase.choosePhone);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(e.message)),

        );

      }

    } catch (e, st) {

      if (mounted) {

        authLog('send_error', level: 'error', error: e, stackTrace: st);

        setState(() => _phase = _AuthPhase.choosePhone);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(l10n.errorGeneric)),

        );

      }

    } finally {

      _disarmWatchdog();

      if (mounted) setState(() => _busy = false);

    }

  }



  Future<void> _verify(String token) async {

    final l10n = AppLocalizations.of(context)!;

    final code = token.trim();

    if (_busy ||

        _phoneSent.isEmpty ||

        code.length != _otpLength ||

        !RegExp(r'^\d{6}$').hasMatch(code)) {

      return;

    }



    if (_verifyInFlightCode == code) return;

    _verifyInFlightCode = code;



    _otpListenGeneration++;

    await _otpController.stopListen();



    setState(() {

      _busy = true;

      _phase = _AuthPhase.verifying;

    });

    _armWatchdog();



    authLog('verify_start', context: {'masked': _maskPhone(_phoneSent)});

    try {

      await Supabase.instance.client.auth

          .verifyOTP(

            phone: _phoneSent,

            token: code,

            type: OtpType.sms,

          )

          .timeout(const Duration(seconds: 30));

      final repo = ProfileRepository(Supabase.instance.client);

      await repo.ensureSignedInProfile();

      final target = await repo.initialSignedInRoute();

      if (!mounted) return;

      authLog('verify_ok', context: {'route': target});

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

    } on TimeoutException {

      if (mounted) {

        authLog('verify_timeout', level: 'warn');

        setState(() => _phase = _AuthPhase.awaitingOtp);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(l10n.errorGeneric)),

        );

        unawaited(_startOtpCapture());

      }

    } on AuthException catch (e) {

      if (Supabase.instance.client.auth.currentSession != null) {

        authLog('verify_ok_race', context: {'note': 'session_already_active'});

        final repo = ProfileRepository(Supabase.instance.client);

        await repo.ensureSignedInProfile();

        final target = await repo.initialSignedInRoute();

        if (!mounted) return;

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

        return;

      }

      if (mounted) {

        authLog('verify_auth_error', level: 'error', error: e);

        setState(() => _phase = _AuthPhase.awaitingOtp);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(e.message)),

        );

        unawaited(_startOtpCapture());

      }

    } catch (e, st) {

      if (mounted) {

        authLog('verify_error', level: 'error', error: e, stackTrace: st);

        setState(() => _phase = _AuthPhase.awaitingOtp);

        ScaffoldMessenger.of(context).showSnackBar(

          SnackBar(content: Text(l10n.errorGeneric)),

        );

        unawaited(_startOtpCapture());

      }

    } finally {

      _disarmWatchdog();

      if (mounted) {

        setState(() => _busy = false);

        if (_verifyInFlightCode == code) _verifyInFlightCode = null;

      }

    }

  }



  void _backToPhone() {

    _otpListenGeneration++;

    unawaited(_otpController.stopListen());

    _otpController.clear();

    authLog('back_to_phone');

    setState(() {

      _phoneSent = '';

      _phase = _AuthPhase.choosePhone;

    });

  }



  String _statusMessage(AppLocalizations l10n) {

    return switch (_phase) {

      _AuthPhase.sendingCode => l10n.authSendingCode,

      _AuthPhase.awaitingOtp => l10n.authWaitingForSms,

      _AuthPhase.verifying => l10n.authVerifying,

      _ => '',

    };

  }



  bool get _showProgress =>

      _phase == _AuthPhase.sendingCode ||

      _phase == _AuthPhase.awaitingOtp ||

      _phase == _AuthPhase.verifying;



  @override

  Widget build(BuildContext context) {

    final l10n = AppLocalizations.of(context)!;

    final theme = Theme.of(context);

    final showChoosePhone = _phase == _AuthPhase.choosePhone && !_showProgress;



    return OrbitalBackdrop(

      child: Scaffold(

        backgroundColor: Colors.transparent,

        appBar: AppBar(

          leading: IconButton(

            icon: const Icon(Icons.arrow_back_ios_new_rounded),

            onPressed: _busy

                ? null

                : () {

                    if (_phase == _AuthPhase.awaitingOtp ||

                        _phase == _AuthPhase.verifying) {

                      _backToPhone();

                    } else {

                      context.pop();

                    }

                  },

          ),

        ),

        body: SafeArea(

          child: SingleChildScrollView(

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

                if (_showProgress) ...[

                  _AuthStatusRow(message: _statusMessage(l10n)),

                  if (_phoneSent.isNotEmpty) ...[

                    const SizedBox(height: MuhSpace.md),

                    Text(

                      _phoneSent,

                      textAlign: TextAlign.center,

                      style: theme.textTheme.bodyMedium?.copyWith(

                        color: MuhColors.goldSoft,

                      ),

                    ),

                  ],

                  const SizedBox(height: MuhSpace.lg),

                  Text(

                    l10n.authOtpAutoHint,

                    style: theme.textTheme.bodySmall?.copyWith(

                      color: MuhColors.creamMuted,

                      height: 1.4,

                    ),

                    textAlign: TextAlign.center,

                  ),

                  Offstage(

                    child: PinInputTextField(

                      pinLength: _otpLength,

                      controller: _otpController,

                      autofillHints: const [AutofillHints.oneTimeCode],

                      decoration: UnderlineDecoration(

                        textStyle: theme.textTheme.headlineSmall,

                        colorBuilder: FixedColorBuilder(

                          MuhColors.creamMuted.withValues(alpha: 0.3),

                        ),

                      ),

                    ),

                  ),

                  if (_phase == _AuthPhase.awaitingOtp && !_busy) ...[

                    const SizedBox(height: MuhSpace.xl),

                    TextButton(

                      onPressed: _sendCode,

                      child: Text(l10n.authResendCode),

                    ),

                    TextButton(

                      onPressed: _backToPhone,

                      child: Text(l10n.authChangeNumber),

                    ),

                  ],

                ],

                if (showChoosePhone) ...[

                  TextField(

                    controller: _phone,

                    autofocus: true,

                    autofillHints: const [AutofillHints.telephoneNumber],

                    keyboardType: TextInputType.phone,

                    textInputAction: TextInputAction.done,

                    inputFormatters: [

                      FilteringTextInputFormatter.allow(RegExp(r'[0-9+\s]')),

                    ],

                    decoration: InputDecoration(

                      labelText: l10n.authPhone,

                      hintText: l10n.authPhoneHint,

                      prefixIcon: const Icon(

                        Icons.phone_android_rounded,

                        color: MuhColors.gold,

                      ),

                    ),

                    onSubmitted: (_) {

                      if (!_busy) unawaited(_sendCode());

                    },

                  ),

                  const SizedBox(height: MuhSpace.lg),

                  MuhPrimaryButton(

                    label: l10n.authContinue,

                    onPressed: _busy ? null : () => unawaited(_sendCode()),

                  ),

                  const SizedBox(height: MuhSpace.md),

                  OutlinedButton.icon(

                    onPressed: _busy ? null : () => unawaited(_pickPhoneAndSend()),

                    icon: const Icon(Icons.sim_card_rounded, size: 20),

                    label: Text(l10n.authChooseFromSim),

                    style: OutlinedButton.styleFrom(

                      foregroundColor: MuhColors.goldSoft,

                      side: BorderSide(

                        color: MuhColors.creamMuted.withValues(alpha: 0.35),

                      ),

                      padding: const EdgeInsets.symmetric(

                        vertical: MuhSpace.md,

                        horizontal: MuhSpace.lg,

                      ),

                    ),

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


