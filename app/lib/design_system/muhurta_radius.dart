/// §7 Radius — [MUHURTA_DESIGN.md](../../../MUHURTA_DESIGN.md).
abstract final class MuhRadius {
  static const double chip = 999;
  static const double input = 10;
  static const double button = 18;
  static const double card = 28;
  static const double sheet = 32;

  /// Legacy alias — prefer [MuhRadius.button].
  static const double md = button;

  /// Legacy alias — prefer [MuhRadius.card].
  static const double lg = card;

  /// Legacy alias — prefer [MuhRadius.input].
  static const double sm = input;
}
