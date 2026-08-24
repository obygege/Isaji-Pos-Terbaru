import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'screens/splash/splash_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  String? initError;
  try {
    // Load file rahasia
    await dotenv.load(fileName: ".env");

    final url = dotenv.env['SUPABASE_URL'];
    final key = dotenv.env['SUPABASE_KEY'];
    if (url == null || url.isEmpty || key == null || key.isEmpty) {
      throw Exception('SUPABASE_URL / SUPABASE_KEY belum diatur di .env');
    }

    // Inisialisasi Supabase menggunakan Key dari .env (Aman)
    await Supabase.initialize(url: url, publishableKey: key);
  } catch (e) {
    initError = e.toString();
  }

  runApp(IsajiPosApp(initError: initError));
}

class IsajiPosApp extends StatelessWidget {
  final String? initError;
  const IsajiPosApp({super.key, this.initError});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Isaji POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFF0F2040),
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF00B4D8)),
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
        useMaterial3: true,
        // Skala teks sistem dibatasi supaya layout tidak pecah di HP
        // dengan pengaturan "ukuran font besar".
      ),
      builder: (context, child) {
        final mq = MediaQuery.of(context);
        return MediaQuery(
          data: mq.copyWith(
            textScaler: mq.textScaler.clamp(
              minScaleFactor: 0.85,
              maxScaleFactor: 1.15,
            ),
          ),
          child: child!,
        );
      },
      home: initError != null
          ? _InitErrorScreen(message: initError!)
          : const SplashScreen(),
    );
  }
}

class _InitErrorScreen extends StatelessWidget {
  final String message;
  const _InitErrorScreen({required this.message});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 56),
                const SizedBox(height: 16),
                const Text(
                  'Gagal Memulai Aplikasi',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
