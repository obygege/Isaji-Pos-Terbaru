/// Jenis koneksi printer yang didukung.
enum PrinterConnectionType { bluetooth, network, usb }

/// Peran printer — printer bisa dipakai untuk mencetak nota kasir,
/// tiket dapur, atau keduanya. Ini memungkinkan multi-printer:
/// misal 1 printer di kasir untuk nota customer, 1 printer di dapur
/// untuk tiket pesanan.
enum PrinterRole { receipt, kitchen, both }

/// Ukuran kertas thermal yang umum dipakai.
enum PrinterPaperSize { mm58, mm80 }

class PrinterProfile {
  final String id;
  String name;
  PrinterConnectionType type;
  PrinterRole role;
  PrinterPaperSize paperSize;

  // Bluetooth
  String? btMacAddress;

  // Network (WiFi/LAN)
  String? ipAddress;
  int port;

  // USB
  String? usbIdentifier; // gabungan "vendorId|productId" dari perangkat
  String? usbDeviceName;

  bool isDefault;

  PrinterProfile({
    required this.id,
    required this.name,
    required this.type,
    this.role = PrinterRole.both,
    this.paperSize = PrinterPaperSize.mm58,
    this.btMacAddress,
    this.ipAddress,
    this.port = 9100,
    this.usbIdentifier,
    this.usbDeviceName,
    this.isDefault = false,
  });

  factory PrinterProfile.fromJson(Map<String, dynamic> json) {
    return PrinterProfile(
      id: json['id'] as String,
      name: json['name'] as String? ?? 'Printer',
      type: PrinterConnectionType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => PrinterConnectionType.bluetooth,
      ),
      role: PrinterRole.values.firstWhere(
        (e) => e.name == json['role'],
        orElse: () => PrinterRole.both,
      ),
      paperSize: PrinterPaperSize.values.firstWhere(
        (e) => e.name == json['paperSize'],
        orElse: () => PrinterPaperSize.mm58,
      ),
      btMacAddress: json['btMacAddress'] as String?,
      ipAddress: json['ipAddress'] as String?,
      port: json['port'] as int? ?? 9100,
      usbIdentifier: json['usbIdentifier'] as String?,
      usbDeviceName: json['usbDeviceName'] as String?,
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'type': type.name,
    'role': role.name,
    'paperSize': paperSize.name,
    'btMacAddress': btMacAddress,
    'ipAddress': ipAddress,
    'port': port,
    'usbIdentifier': usbIdentifier,
    'usbDeviceName': usbDeviceName,
    'isDefault': isDefault,
  };

  String get subtitle {
    switch (type) {
      case PrinterConnectionType.bluetooth:
        return 'Bluetooth • ${btMacAddress ?? '-'}';
      case PrinterConnectionType.network:
        return 'WiFi/LAN • ${ipAddress ?? '-'}:$port';
      case PrinterConnectionType.usb:
        return 'USB • ${usbDeviceName ?? '-'}';
    }
  }

  String get roleLabel {
    switch (role) {
      case PrinterRole.receipt:
        return 'Nota Kasir';
      case PrinterRole.kitchen:
        return 'Tiket Dapur';
      case PrinterRole.both:
        return 'Nota & Dapur';
    }
  }
}
