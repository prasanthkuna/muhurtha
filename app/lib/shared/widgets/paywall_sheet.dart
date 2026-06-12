import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:muhurta/l10n/app_localizations.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../../core/config/env.dart';
import '../../core/subscription/subscription_service.dart';
import '../../design_system/design_system.dart';
import 'muh_primary_button.dart';

class PaywallSheet extends ConsumerStatefulWidget {
  const PaywallSheet({
    super.key,
    this.headline,
    this.subline,
    this.bullets = const <String>[],
    this.cta,
    this.preferredPlan = PaywallPlan.pro,
    this.onlyIfNeeded = true,
  });

  final String? headline;
  final String? subline;
  final List<String> bullets;
  final String? cta;
  final PaywallPlan preferredPlan;
  final bool onlyIfNeeded;

  /// Shows RevenueCat's native paywall when configured; otherwise a fallback sheet.
  static Future<void> show(
    BuildContext context, {
    String? headline,
    String? subline,
    List<String> bullets = const <String>[],
    String? cta,
    PaywallPlan preferredPlan = PaywallPlan.pro,
    bool onlyIfNeeded = true,
  }) async {
    final container = ProviderScope.containerOf(context, listen: false);
    final service = container.read(subscriptionServiceProvider);

    if (service.isAvailable) {
      try {
        await service.presentPaywall(onlyIfNeeded: onlyIfNeeded);
        return;
      } on SubscriptionException catch (e) {
        if (e.code == PurchasesErrorCode.purchaseCancelledError.name) return;
      } catch (_) {
        // Fall through to custom sheet when native paywall is unavailable.
      }
    }

    if (!context.mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: MuhColors.surface,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (ctx) => PaywallSheet(
        headline: headline,
        subline: subline,
        bullets: bullets,
        cta: cta,
        preferredPlan: preferredPlan,
        onlyIfNeeded: false,
      ),
    );
  }

  @override
  ConsumerState<PaywallSheet> createState() => _PaywallSheetState();
}

class _PaywallSheetState extends ConsumerState<PaywallSheet> {
  var _busy = false;
  var _yearly = false;
  String? _error;

  Future<void> _purchase() async {
    final service = ref.read(subscriptionServiceProvider);
    if (!service.isAvailable) {
      if (mounted) Navigator.of(context).pop();
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (_yearly) {
        await service.purchaseYearly();
      } else {
        await service.purchaseMonthly();
      }
      if (mounted) Navigator.of(context).pop();
    } on SubscriptionException catch (e) {
      if (!mounted) return;
      if (e.code != PurchasesErrorCode.purchaseCancelledError.name) {
        setState(() => _error = e.message);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _restore() async {
    final service = ref.read(subscriptionServiceProvider);
    if (!service.isAvailable) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await service.restore();
      if (mounted) Navigator.of(context).pop();
    } on SubscriptionException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final service = ref.watch(subscriptionServiceProvider);
    final title = (widget.headline?.trim().isNotEmpty == true)
        ? widget.headline!.trim()
        : l10n.paywallTitle;
    final body = (widget.subline?.trim().isNotEmpty == true)
        ? widget.subline!.trim()
        : l10n.paywallSubtitle;
    final points = widget.bullets.isNotEmpty
        ? widget.bullets
        : <String>[l10n.paywallSubtitle];
    final purchasesReady = service.isAvailable;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          MuhSpace.page,
          MuhSpace.sm,
          MuhSpace.page,
          MuhSpace.page + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: MuhSpace.sm),
            Text(
              body,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: MuhColors.creamMuted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: MuhSpace.lg),
            ...points.map(
              (b) => Padding(
                padding: const EdgeInsets.only(bottom: MuhSpace.sm),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 18,
                      color: MuhColors.goldSoft,
                    ),
                    const SizedBox(width: MuhSpace.sm),
                    Expanded(
                      child: Text(
                        b,
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: MuhSpace.md),
            Row(
              children: [
                Expanded(
                  child: _PlanChip(
                    label: l10n.paywallMonthlyLabel,
                    price: l10n.paywallMonthlyPrice,
                    selected: !_yearly,
                    onTap: _busy ? null : () => setState(() => _yearly = false),
                  ),
                ),
                const SizedBox(width: MuhSpace.sm),
                Expanded(
                  child: _PlanChip(
                    label: l10n.paywallYearlyLabel,
                    price: l10n.paywallYearlyPrice,
                    selected: _yearly,
                    onTap: _busy ? null : () => setState(() => _yearly = true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: MuhSpace.lg),
            MuhPrimaryButton(
              label: _busy
                  ? l10n.paywallProcessing
                  : (widget.cta?.trim().isNotEmpty == true
                      ? widget.cta!.trim()
                      : l10n.paywallCtaPro),
              onPressed: _busy || !purchasesReady ? null : _purchase,
            ),
            if (purchasesReady) ...[
              const SizedBox(height: MuhSpace.sm),
              TextButton(
                onPressed: _busy ? null : _restore,
                child: Text(l10n.paywallRestore),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: MuhSpace.sm),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.error,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            const SizedBox(height: MuhSpace.sm),
            Text(
              purchasesReady
                  ? l10n.paywallBillingNote
                  : (Env.hasRevenueCat
                      ? l10n.paywallStorePending
                      : l10n.paywallDevNote),
              style: theme.textTheme.bodySmall?.copyWith(
                color: MuhColors.creamMuted,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _PlanChip extends StatelessWidget {
  const _PlanChip({
    required this.label,
    required this.price,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String price;
  final bool selected;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: selected ? MuhColors.surfaceSoft : MuhColors.surface,
      borderRadius: BorderRadius.circular(MuhRadius.input),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(MuhRadius.input),
        child: Container(
          padding: const EdgeInsets.all(MuhSpace.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(MuhRadius.input),
            border: Border.all(
              color: selected ? MuhColors.gold : MuhColors.line,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: MuhSpace.xs),
              Text(
                price,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: MuhColors.creamMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
