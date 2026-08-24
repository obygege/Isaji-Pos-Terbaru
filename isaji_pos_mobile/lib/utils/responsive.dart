import 'package:flutter/material.dart';

/// Helper breakpoint sederhana & konsisten dipakai di seluruh aplikasi,
/// supaya semua layar (HP/Tablet, potret/lanskap) berperilaku seragam.
class Responsive {
  static bool isLandscape(BuildContext context) =>
      MediaQuery.of(context).orientation == Orientation.landscape;

  static double width(BuildContext context) => MediaQuery.of(context).size.width;

  static bool isTablet(BuildContext context) => width(context) >= 700;

  static bool isDesktopLike(BuildContext context) => width(context) >= 1100;

  /// Dipakai untuk menentukan apakah layar cukup "lebar" untuk memakai
  /// layout 2-panel (sidebar / split kasir), baik karena tablet maupun
  /// karena HP dalam mode lanskap.
  static bool useWideLayout(BuildContext context) =>
      isTablet(context) || isLandscape(context);

  /// Lebar maksimum yang aman untuk kartu/form di tengah layar supaya
  /// tidak melebar berlebihan di tablet/desktop, sekaligus tetap pas di
  /// layar HP yang sempit.
  static double cardMaxWidth(BuildContext context, {double max = 460}) {
    final w = width(context);
    return w < max + 32 ? w - 32 : max;
  }

  /// Jumlah kolom grid adaptif berdasarkan lebar layar.
  static int gridColumns(
    BuildContext context, {
    int mobile = 1,
    int tablet = 2,
    int desktop = 3,
  }) {
    if (isDesktopLike(context)) return desktop;
    if (isTablet(context) || isLandscape(context)) return tablet;
    return mobile;
  }
}
