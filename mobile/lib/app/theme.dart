import 'package:flutter/material.dart';

const _desktopBlue = Color(0xff3478dc);
const _desktopBlueLight = Color(0xff4a8af0);
const _desktopBg = Color(0xffeef4fc);
const _desktopPanel = Color(0xffffffff);
const _desktopPanel2 = Color(0xfff7faff);
const _desktopText = Color(0xff12223d);
const _desktopMuted = Color(0xff71819a);
const _desktopLine = Color(0xffdbe5f2);
const _desktopSoft = Color(0xffeaf1fb);
const _desktopDarkBg = Color(0xff061327);
const _desktopDarkPanel = Color(0xff0c1d38);
const _desktopDarkPanel2 = Color(0xff102544);
const _desktopDarkText = Color(0xffedf5ff);
const _desktopDarkMuted = Color(0xff8ca4c3);
const _desktopDarkLine = Color(0xff203b60);

ThemeData buildLightTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: _desktopBlue,
    onPrimary: Colors.white,
    secondary: _desktopBlueLight,
    onSecondary: Colors.white,
    error: Color(0xffe2555c),
    onError: Colors.white,
    surface: _desktopPanel,
    onSurface: _desktopText,
  );
  return _baseTheme(scheme, Brightness.light);
}

ThemeData buildDarkTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: Color(0xff62a4ff),
    onPrimary: Color(0xff061327),
    secondary: Color(0xff4a8bea),
    onSecondary: Colors.white,
    error: Color(0xffff7c83),
    onError: Color(0xff33090b),
    surface: _desktopDarkPanel,
    onSurface: _desktopDarkText,
  );
  return _baseTheme(scheme, Brightness.dark);
}

ThemeData _baseTheme(ColorScheme scheme, Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final scaffoldBg = isDark ? _desktopDarkBg : _desktopBg;
  final panel = isDark ? _desktopDarkPanel : _desktopPanel;
  final panel2 = isDark ? _desktopDarkPanel2 : _desktopPanel2;
  final muted = isDark ? _desktopDarkMuted : _desktopMuted;
  final line = isDark ? _desktopDarkLine : _desktopLine;
  final soft = isDark ? const Color(0xff142b4c) : _desktopSoft;

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    brightness: brightness,
    scaffoldBackgroundColor: scaffoldBg,
    canvasColor: scaffoldBg,
    fontFamily: 'Roboto',
    appBarTheme: AppBarTheme(
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      backgroundColor: panel.withValues(alpha: isDark ? .92 : .86),
      foregroundColor: scheme.onSurface,
      titleTextStyle: TextStyle(
        color: scheme.onSurface,
        fontSize: 20,
        fontWeight: FontWeight.w800,
      ),
      iconTheme: IconThemeData(color: muted),
    ),
    cardTheme: CardThemeData(
      color: panel,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: isDark ? panel2 : Colors.white,
      labelStyle: TextStyle(color: muted, fontWeight: FontWeight.w600),
      prefixIconColor: muted,
      border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: line)),
      focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: scheme.primary, width: 1.4)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: scheme.primary,
        side: BorderSide(color: line),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
    ),
    dividerTheme: DividerThemeData(color: line),
    textTheme: ThemeData(brightness: brightness).textTheme.apply(
          bodyColor: scheme.onSurface,
          displayColor: scheme.onSurface,
        ),
    chipTheme: ChipThemeData(
      backgroundColor: soft,
      selectedColor: scheme.primary.withValues(alpha: .16),
      labelStyle: TextStyle(color: muted, fontWeight: FontWeight.w700),
    ),
  );
}
