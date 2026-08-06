import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'screens/login/pin_login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load file rahasia
  await dotenv.load(fileName: ".env");

  // Inisialisasi Supabase menggunakan Key dari .env (Aman)
  await Supabase.initialize(
    url: dotenv.env['SUPABASE_URL']!,
    publishableKey: dotenv.env['SUPABASE_KEY']!,
  );

  runApp(const IsajiPosApp());
}

class IsajiPosApp extends StatelessWidget {
  const IsajiPosApp({super.key});

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
      ),
      home: const PinLoginScreen(),
    );
  }
}
