import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:intl/intl.dart';
import '../models/printer_profile.dart';

/// Baris item generik untuk dicetak, dipakai baik dari keranjang kasir
/// (transaksi baru) maupun dari data order yang diambil ulang dari
/// database (reprint riwayat / pesanan aktif).
class ReceiptLineItem {
  final String name;
  final num qty;
  final double price;
  final double subtotal;
  final String? notes;

  ReceiptLineItem({
    required this.name,
    required this.qty,
    required this.price,
    required this.subtotal,
    this.notes,
  });
}

/// Kumpulan data yang dibutuhkan untuk mencetak satu nota/struk.
class ReceiptData {
  final String storeName;
  final String? storeAddress;
  final String? storePhone;
  final String orderNumber;
  final String cashierName;
  final String orderType;
  final DateTime dateTime;
  final List<ReceiptLineItem> items;
  final double subtotal;
  final double discount;
  final double tax;
  final double serviceCharge;
  final double grandTotal;
  final String paymentMethod;
  final double amountTendered;
  final double change;
  final String? tableName;
  final String? customerName;
  final String? footerNote;

  ReceiptData({
    required this.storeName,
    this.storeAddress,
    this.storePhone,
    required this.orderNumber,
    required this.cashierName,
    required this.orderType,
    required this.dateTime,
    required this.items,
    required this.subtotal,
    this.discount = 0,
    required this.tax,
    this.serviceCharge = 0,
    required this.grandTotal,
    required this.paymentMethod,
    required this.amountTendered,
    required this.change,
    this.tableName,
    this.customerName,
    this.footerNote,
  });
}

class PrinterHelper {
  static final NumberFormat _num = NumberFormat.decimalPattern('id_ID');

  static String _money(num value) => _num.format(value);

  /// Membangun byte ESC/POS untuk nota customer (struk belanja).
  static Future<List<int>> buildReceiptBytes(
    ReceiptData data, {
    PrinterPaperSize paperSize = PrinterPaperSize.mm58,
  }) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(
      paperSize == PrinterPaperSize.mm80 ? PaperSize.mm80 : PaperSize.mm58,
      profile,
    );
    final int colWidth = paperSize == PrinterPaperSize.mm80 ? 8 : 6;
    List<int> bytes = [];

    bytes += generator.text(
      data.storeName,
      styles: const PosStyles(
        align: PosAlign.center,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
        bold: true,
      ),
    );
    if (data.storeAddress != null && data.storeAddress!.isNotEmpty) {
      bytes += generator.text(
        data.storeAddress!,
        styles: const PosStyles(align: PosAlign.center),
      );
    }
    if (data.storePhone != null && data.storePhone!.isNotEmpty) {
      bytes += generator.text(
        'Telp: ${data.storePhone}',
        styles: const PosStyles(align: PosAlign.center),
      );
    }
    bytes += generator.hr();

    bytes += generator.text('No    : ${data.orderNumber}');
    bytes += generator.text('Kasir : ${data.cashierName}');
    bytes += generator.text('Tipe  : ${data.orderType}');
    if (data.tableName != null && data.tableName!.isNotEmpty) {
      bytes += generator.text('Meja  : ${data.tableName}');
    }
    if (data.customerName != null && data.customerName!.isNotEmpty) {
      bytes += generator.text('Cust. : ${data.customerName}');
    }
    bytes += generator.text(
      'Waktu : ${DateFormat('dd-MM-yyyy HH:mm').format(data.dateTime)}',
    );
    bytes += generator.hr();

    for (final item in data.items) {
      bytes += generator.text(item.name, styles: const PosStyles(bold: true));
      if (item.notes != null && item.notes!.isNotEmpty) {
        bytes += generator.text('  * ${item.notes}');
      }
      bytes += generator.row([
        PosColumn(
          text: '${item.qty} x ${_money(item.price)}',
          width: 12 - colWidth,
        ),
        PosColumn(
          text: _money(item.subtotal),
          width: colWidth,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(text: 'Subtotal', width: 6),
      PosColumn(
        text: _money(data.subtotal),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (data.discount > 0) {
      bytes += generator.row([
        PosColumn(text: 'Diskon', width: 6),
        PosColumn(
          text: '-${_money(data.discount)}',
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    if (data.serviceCharge > 0) {
      bytes += generator.row([
        PosColumn(text: 'Service Charge', width: 6),
        PosColumn(
          text: _money(data.serviceCharge),
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    bytes += generator.row([
      PosColumn(text: 'Pajak', width: 6),
      PosColumn(
        text: _money(data.tax),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.hr();
    bytes += generator.row([
      PosColumn(text: 'TOTAL', width: 6, styles: const PosStyles(bold: true)),
      PosColumn(
        text: _money(data.grandTotal),
        width: 6,
        styles: const PosStyles(align: PosAlign.right, bold: true),
      ),
    ]);

    bytes += generator.emptyLines(1);
    bytes += generator.row([
      PosColumn(text: data.paymentMethod.toUpperCase(), width: 6),
      PosColumn(
        text: _money(data.amountTendered),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (data.change > 0) {
      bytes += generator.row([
        PosColumn(text: 'KEMBALI', width: 6),
        PosColumn(
          text: _money(data.change),
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }

    bytes += generator.emptyLines(1);
    bytes += generator.text(
      data.footerNote ?? 'Terima Kasih Atas Kunjungan Anda!',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    bytes += generator.emptyLines(2);
    bytes += generator.cut();
    return bytes;
  }

  /// Membangun byte ESC/POS untuk tiket dapur (tanpa harga, fokus item
  /// & catatan agar cepat dibaca dapur/barista).
  static Future<List<int>> buildKitchenTicketBytes(
    ReceiptData data, {
    PrinterPaperSize paperSize = PrinterPaperSize.mm58,
  }) async {
    final profile = await CapabilityProfile.load();
    final generator = Generator(
      paperSize == PrinterPaperSize.mm80 ? PaperSize.mm80 : PaperSize.mm58,
      profile,
    );
    List<int> bytes = [];

    bytes += generator.text(
      'TIKET DAPUR',
      styles: const PosStyles(
        align: PosAlign.center,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
        bold: true,
      ),
    );
    bytes += generator.hr();
    bytes += generator.text(
      'No    : ${data.orderNumber}',
      styles: const PosStyles(bold: true),
    );
    bytes += generator.text('Tipe  : ${data.orderType}');
    if (data.tableName != null && data.tableName!.isNotEmpty) {
      bytes += generator.text(
        'Meja  : ${data.tableName}',
        styles: const PosStyles(bold: true),
      );
    }
    bytes += generator.text(
      'Waktu : ${DateFormat('HH:mm:ss').format(data.dateTime)}',
    );
    bytes += generator.hr();

    for (final item in data.items) {
      bytes += generator.row([
        PosColumn(
          text: '${item.qty}x',
          width: 2,
          styles: const PosStyles(bold: true, height: PosTextSize.size2),
        ),
        PosColumn(
          text: item.name,
          width: 10,
          styles: const PosStyles(bold: true, height: PosTextSize.size2),
        ),
      ]);
      if (item.notes != null && item.notes!.isNotEmpty) {
        bytes += generator.text('   Catatan: ${item.notes}');
      }
      bytes += generator.emptyLines(1);
    }
    bytes += generator.hr();
    bytes += generator.emptyLines(2);
    bytes += generator.cut();
    return bytes;
  }
}
