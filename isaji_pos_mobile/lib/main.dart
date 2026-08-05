import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';

import 'screens/login/pin_login_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // TODO: Ganti dengan URL dan Anon Key Supabase Anda
  await Supabase.initialize(
    url: 'https://xyzcompany.supabase.co',
    anonKey: 'public-anon-key',
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
        primaryColor: const Color(0xFF0F2040), // isaji-navy
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF00B4D8)), // isaji-cyan
        textTheme: GoogleFonts.interTextTheme(Theme.of(context).textTheme),
        useMaterial3: true,
      ),
      home: const PinLoginScreen(),
    );
  }
}