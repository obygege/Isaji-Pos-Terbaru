import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:intl/intl.dart';

class PrinterHelper {
  static Future<List<BluetoothInfo>> getPairedDevices() async {
    return await PrintBluetoothThermal.pairedBluetooths;
  }

  static Future<bool> connectToPrinter(String macAddress) async {
    final bool result = await PrintBluetoothThermal.connect(
      macPrinterAddress: macAddress,
    );
    return result;
  }

  static Future<void> printReceipt({
    required String orderNumber,
    required String cashierName,
    required List<dynamic> cart,
    required double subtotal,
    required double tax,
    required double grandTotal,
    required double amountTendered,
    required double change,
    required String paymentMethod,
  }) async {
    bool connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) return;

    final profile = await CapabilityProfile.load();
    final generator = Generator(PaperSize.mm58, profile);
    List<int> bytes = [];

    bytes += generator.text(
      'ISAJI POS',
      styles: const PosStyles(
        align: PosAlign.center,
        height: PosTextSize.size2,
        width: PosTextSize.size2,
        bold: true,
      ),
    );
    bytes += generator.text(
      'Jl. Restoran F&B No. 123',
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.text(
      'Telp: 0812-3456-7890',
      styles: const PosStyles(align: PosAlign.center),
    );
    bytes += generator.emptyLines(1);

    bytes += generator.text('No   : $orderNumber');
    bytes += generator.text('Kasir: $cashierName');
    bytes += generator.text(
      'Waktu: ${DateFormat('dd-MM-yyyy HH:mm').format(DateTime.now())}',
    );
    bytes += generator.hr();

    for (var item in cart) {
      bytes += generator.text(item.name, styles: const PosStyles(bold: true));
      bytes += generator.row([
        PosColumn(
          text: '${item.qty} x ${item.price.toStringAsFixed(0)}',
          width: 6,
        ),
        PosColumn(
          text: item.subtotal.toStringAsFixed(0),
          width: 6,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    bytes += generator.hr();

    bytes += generator.row([
      PosColumn(text: 'Subtotal', width: 6),
      PosColumn(
        text: subtotal.toStringAsFixed(0),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.row([
      PosColumn(text: 'PB1 (10%)', width: 6),
      PosColumn(
        text: tax.toStringAsFixed(0),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.hr();
    bytes += generator.row([
      PosColumn(text: 'TOTAL', width: 6, styles: const PosStyles(bold: true)),
      PosColumn(
        text: grandTotal.toStringAsFixed(0),
        width: 6,
        styles: const PosStyles(align: PosAlign.right, bold: true),
      ),
    ]);

    bytes += generator.emptyLines(1);
    bytes += generator.row([
      PosColumn(text: paymentMethod.toUpperCase(), width: 6),
      PosColumn(
        text: amountTendered.toStringAsFixed(0),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += generator.row([
      PosColumn(text: 'KEMBALI', width: 6),
      PosColumn(
        text: change.toStringAsFixed(0),
        width: 6,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    bytes += generator.emptyLines(2);
    bytes += generator.text(
      'Terima Kasih Atas Kunjungan Anda!',
      styles: const PosStyles(align: PosAlign.center, bold: true),
    );
    bytes += generator.emptyLines(2);

    bytes += generator.cut();
    await PrintBluetoothThermal.writeBytes(bytes);
  }
}
