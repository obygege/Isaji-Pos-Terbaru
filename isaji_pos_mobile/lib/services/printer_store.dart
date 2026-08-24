import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/printer_profile.dart';

/// Menyimpan daftar profil printer (multi-printer) secara lokal di
/// perangkat (SharedPreferences), karena konfigurasi printer bersifat
/// per-perangkat/per-outlet, bukan data organisasi yang perlu di server.
class PrinterStore {
  static const _key = 'printer_profiles_v1';

  static Future<List<PrinterProfile>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return [];
    try {
      final List decoded = jsonDecode(raw) as List;
      return decoded
          .map((e) => PrinterProfile.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> saveAll(List<PrinterProfile> printers) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = jsonEncode(printers.map((p) => p.toJson()).toList());
    await prefs.setString(_key, raw);
  }

  static Future<void> add(PrinterProfile printer) async {
    final list = await getAll();
    if (printer.isDefault) {
      for (final p in list) {
        p.isDefault = false;
      }
    }
    list.add(printer);
    await saveAll(list);
  }

  static Future<void> update(PrinterProfile printer) async {
    final list = await getAll();
    final idx = list.indexWhere((p) => p.id == printer.id);
    if (idx == -1) return;
    if (printer.isDefault) {
      for (final p in list) {
        p.isDefault = false;
      }
    }
    list[idx] = printer;
    await saveAll(list);
  }

  static Future<void> remove(String id) async {
    final list = await getAll();
    list.removeWhere((p) => p.id == id);
    await saveAll(list);
  }

  static Future<List<PrinterProfile>> getByRole(PrinterRole role) async {
    final list = await getAll();
    return list
        .where((p) => p.role == role || p.role == PrinterRole.both)
        .toList();
  }

  static Future<PrinterProfile?> getDefault() async {
    final list = await getAll();
    if (list.isEmpty) return null;
    try {
      return list.firstWhere((p) => p.isDefault);
    } catch (_) {
      return list.first;
    }
  }
}
