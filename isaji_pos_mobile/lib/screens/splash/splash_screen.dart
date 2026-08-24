import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../login/pin_login_screen.dart';
import '../pos/pos_main_screen.dart';
import '../shift/open_shift_screen.dart';

/// Splash screen yang tampil sebelum login. Selain menampilkan branding
/// aplikasi, layar ini juga:
///  - Memberi waktu inisialisasi Supabase/tema selesai dengan mulus.
///  - Mengecek apakah ada sesi karyawan tersimpan (auto-login ringan):
///    jika ada & shift masih terbuka, langsung ke POS; jika ada tapi
///    shift belum dibuka, ke layar Buka Shift; jika tidak ada sesi,
///    ke layar login PIN.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _scale;
  String _statusText = 'Menyiapkan aplikasi...';

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _scale = Tween<double>(
      begin: 0.85,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));
    _controller.forward();
    _bootstrap();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    // Beri jeda minimum agar splash tidak "berkedip" di device cepat.
    final minDelay = Future.delayed(const Duration(milliseconds: 1400));

    try {
      final prefs = await SharedPreferences.getInstance();
      final empId = prefs.getString('emp_id');
      final branchId = prefs.getString('branch_id');
      final shiftId = prefs.getString('shift_id');

      if (empId == null ||
          empId.isEmpty ||
          branchId == null ||
          branchId.isEmpty) {
        await minDelay;
        _goTo(const PinLoginScreen());
        return;
      }

      setState(() => _statusText = 'Memeriksa sesi...');

      // Validasi ulang ke server: karyawan masih aktif & (jika ada) shift
      // masih benar-benar terbuka, supaya tidak "nyangkut" pada sesi basi.
      final supabase = Supabase.instance.client;
      final emp = await supabase
          .from('employees')
          .select('id, is_active')
          .eq('id', empId)
          .maybeSingle();

      if (emp == null || emp['is_active'] == false) {
        await prefs.clear();
        await minDelay;
        _goTo(const PinLoginScreen());
        return;
      }

      if (shiftId != null && shiftId.isNotEmpty) {
        final shift = await supabase
            .from('cashier_shifts')
            .select('id, closed_at')
            .eq('id', shiftId)
            .maybeSingle();

        await minDelay;
        if (shift != null && shift['closed_at'] == null) {
          _goTo(const PosMainScreen());
        } else {
          await prefs.remove('shift_id');
          _goTo(const OpenShiftScreen());
        }
        return;
      }

      await minDelay;
      _goTo(const OpenShiftScreen());
    } catch (e) {
      // Gagal cek sesi (mis. tidak ada koneksi) -> aman kembali ke login
      // agar pengguna tidak terjebak di splash screen.
      await minDelay;
      _goTo(const PinLoginScreen());
    }
  }

  void _goTo(Widget screen) {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 400),
        pageBuilder: (context, animation, secondaryAnimation) => screen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final logoSize = size.shortestSide * 0.28 > 180
        ? 180.0
        : size.shortestSide * 0.28;

    return Scaffold(
      backgroundColor: const Color(0xFF0F2040),
      body: SafeArea(
        child: Center(
          child: FadeTransition(
            opacity: _fade,
            child: ScaleTransition(
              scale: _scale,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFF00B4D8,
                          ).withValues(alpha: 0.35),
                          blurRadius: 40,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                    child: Image.asset(
                      'assets/images/LOGO.png',
                      height: logoSize.clamp(90.0, 180.0),
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 28),
                  const Text(
                    'ISAJI POS',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sistem Kasir Restoran & F&B',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.7),
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 48),
                  const SizedBox(
                    width: 28,
                    height: 28,
                    child: CircularProgressIndicator(
                      color: Color(0xFF00B4D8),
                      strokeWidth: 3,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _statusText,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
