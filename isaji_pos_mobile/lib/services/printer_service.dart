import 'dart:async';
import 'dart:io';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:flutter_pos_printer_platform_image_3_sdt/flutter_pos_printer_platform_image_3_sdt.dart';

import '../models/printer_profile.dart';
import '../utils/printer_helper.dart';
import 'printer_store.dart';

class PrintResult {
  final PrinterProfile printer;
  final bool success;
  final String? error;
  PrintResult({required this.printer, required this.success, this.error});
}

/// Titik akses tunggal untuk mengirim data cetak ke printer, apapun jenis
/// koneksinya (Bluetooth / WiFi-LAN / USB), dan mendukung mencetak ke
/// beberapa printer sekaligus (multi-printer) berdasarkan peran
/// (nota kasir vs tiket dapur).
class PrinterService {
  static final PrinterManager _printerManager = PrinterManager.instance;

  /// Kirim byte mentah ke satu printer sesuai jenis koneksinya.
  static Future<void> _sendBytes(PrinterProfile printer, List<int> bytes) async {
    switch (printer.type) {
      case PrinterConnectionType.bluetooth:
        await _sendViaBluetooth(printer, bytes);
        break;
      case PrinterConnectionType.network:
        await _sendViaNetwork(printer, bytes);
        break;
      case PrinterConnectionType.usb:
        await _sendViaUsb(printer, bytes);
        break;
    }
  }

  static Future<void> _sendViaBluetooth(
    PrinterProfile printer,
    List<int> bytes,
  ) async {
    if (printer.btMacAddress == null || printer.btMacAddress!.isEmpty) {
      throw Exception('Alamat MAC Bluetooth belum diatur');
    }
    final bool connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) {
      final ok = await PrintBluetoothThermal.connect(
        macPrinterAddress: printer.btMacAddress!,
      );
      if (!ok) throw Exception('Gagal terhubung ke printer Bluetooth');
    }
    await PrintBluetoothThermal.writeBytes(bytes);
  }

  static Future<void> _sendViaNetwork(
    PrinterProfile printer,
    List<int> bytes,
  ) async {
    if (printer.ipAddress == null || printer.ipAddress!.isEmpty) {
      throw Exception('Alamat IP printer belum diatur');
    }
    Socket? socket;
    try {
      socket = await Socket.connect(
        printer.ipAddress!,
        printer.port,
        timeout: const Duration(seconds: 6),
      );
      socket.add(bytes);
      await socket.flush();
    } finally {
      socket?.destroy();
    }
  }

  static Future<void> _sendViaUsb(
    PrinterProfile printer,
    List<int> bytes,
  ) async {
    if (!Platform.isAndroid) {
      throw Exception('Cetak via USB hanya didukung di perangkat Android');
    }
    if (printer.usbIdentifier == null || printer.usbIdentifier!.isEmpty) {
      throw Exception('Perangkat USB belum diatur');
    }

    // Selalu scan ulang & ambil objek device ASLI dari hasil scan (bukan
    // menyusun ulang dari nilai yang kita simpan sendiri), supaya tidak
    // ada risiko ketidakcocokan tipe data dengan API plugin.
    final devices = await _discoverUsbOnce();
    PrinterDevice? match;
    for (final d in devices) {
      if ('${d.vendorId}|${d.productId}' == printer.usbIdentifier) {
        match = d;
        break;
      }
    }
    if (match == null) {
      throw Exception('Printer USB "${printer.name}" tidak terdeteksi. Pastikan kabel OTG tersambung.');
    }

    await _printerManager.connect(
      type: PrinterType.usb,
      model: UsbPrinterInput(
        name: match.name,
        vendorId: match.vendorId,
        productId: match.productId,
      ),
    );
    await _printerManager.send(type: PrinterType.usb, bytes: bytes);
  }

  static Future<List<PrinterDevice>> _discoverUsbOnce({
    Duration timeout = const Duration(seconds: 3),
  }) async {
    final devices = <PrinterDevice>[];
    final completer = Completer<void>();
    final sub = _printerManager.discovery(type: PrinterType.usb).listen(
      (d) => devices.add(d),
      onError: (_) {},
    );
    Future.delayed(timeout, () {
      if (!completer.isCompleted) completer.complete();
    });
    await completer.future;
    await sub.cancel();
    return devices;
  }

  /// Mencetak nota customer ke satu printer tertentu.
  static Future<void> printReceiptTo(
    PrinterProfile printer,
    ReceiptData data,
  ) async {
    final bytes = await PrinterHelper.buildReceiptBytes(
      data,
      paperSize: printer.paperSize,
    );
    await _sendBytes(printer, bytes);
  }

  /// Mencetak tiket dapur ke satu printer tertentu.
  static Future<void> printKitchenTicketTo(
    PrinterProfile printer,
    ReceiptData data,
  ) async {
    final bytes = await PrinterHelper.buildKitchenTicketBytes(
      data,
      paperSize: printer.paperSize,
    );
    await _sendBytes(printer, bytes);
  }

  /// Test print sederhana untuk memastikan printer tersambung & bisa cetak.
  static Future<void> testPrint(PrinterProfile printer) async {
    final now = DateTime.now();
    final data = ReceiptData(
      storeName: 'TEST PRINT',
      orderNumber: 'TEST-${now.millisecondsSinceEpoch}',
      cashierName: '-',
      orderType: '-',
      dateTime: now,
      items: [
        ReceiptLineItem(name: 'Contoh Item', qty: 1, price: 0, subtotal: 0),
      ],
      subtotal: 0,
      tax: 0,
      grandTotal: 0,
      paymentMethod: '-',
      amountTendered: 0,
      change: 0,
      footerNote: 'Printer "${printer.name}" siap digunakan.',
    );
    await printReceiptTo(printer, data);
  }

  /// Mencetak nota ke SEMUA printer yang berperan sebagai nota kasir
  /// (role = receipt atau both). Dipakai setelah transaksi selesai,
  /// atau saat kasir menekan tombol "Cetak Nota" secara manual.
  static Future<List<PrintResult>> printReceiptToAllAssigned(
    ReceiptData data,
  ) async {
    final printers = await PrinterStore.getByRole(PrinterRole.receipt);
    return _printToMany(printers, (p) => printReceiptTo(p, data));
  }

  /// Mencetak tiket dapur ke SEMUA printer yang berperan sebagai printer
  /// dapur (role = kitchen atau both). Dipakai saat pesanan baru masuk
  /// atau diverifikasi.
  static Future<List<PrintResult>> printKitchenTicketToAllAssigned(
    ReceiptData data,
  ) async {
    final printers = await PrinterStore.getByRole(PrinterRole.kitchen);
    return _printToMany(printers, (p) => printKitchenTicketTo(p, data));
  }

  static Future<List<PrintResult>> _printToMany(
    List<PrinterProfile> printers,
    Future<void> Function(PrinterProfile) action,
  ) async {
    final results = <PrintResult>[];
    for (final printer in printers) {
      try {
        await action(printer);
        results.add(PrintResult(printer: printer, success: true));
      } catch (e) {
        results.add(
          PrintResult(printer: printer, success: false, error: e.toString()),
        );
      }
    }
    return results;
  }

  // ---------------- Discovery helpers ----------------

  static Future<List<BluetoothInfo>> getPairedBluetoothDevices() async {
    return PrintBluetoothThermal.pairedBluetooths;
  }

  static Future<List<PrinterDevice>> getUsbDevices() async {
    if (!Platform.isAndroid) return [];
    try {
      return await _discoverUsbOnce();
    } catch (_) {
      return [];
    }
  }
}
