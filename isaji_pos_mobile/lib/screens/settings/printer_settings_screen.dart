import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:flutter_pos_printer_platform_image_3_sdt/flutter_pos_printer_platform_image_3_sdt.dart'
    show PrinterDevice;

import '../../models/printer_profile.dart';
import '../../services/printer_service.dart';
import '../../services/printer_store.dart';
import '../../utils/responsive.dart';

const _navy = Color(0xFF0F2040);
const _cyan = Color(0xFF00B4D8);

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  List<PrinterProfile> _printers = [];
  bool _isLoading = true;
  final Set<String> _busyIds = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final list = await PrinterStore.getAll();
    setState(() {
      _printers = list;
      _isLoading = false;
    });
  }

  Future<void> _openAddSheet() async {
    final result = await showModalBottomSheet<PrinterProfile>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const _AddEditPrinterSheet(),
    );
    if (result != null) {
      await PrinterStore.add(result);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Printer "${result.name}" ditambahkan'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _openEditSheet(PrinterProfile printer) async {
    final result = await showModalBottomSheet<PrinterProfile>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddEditPrinterSheet(existing: printer),
    );
    if (result != null) {
      await PrinterStore.update(result);
      await _load();
    }
  }

  Future<void> _delete(PrinterProfile printer) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus Printer?'),
        content: Text('Printer "${printer.name}" akan dihapus dari daftar.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Hapus', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await PrinterStore.remove(printer.id);
      await _load();
    }
  }

  Future<void> _setDefault(PrinterProfile printer) async {
    printer.isDefault = true;
    await PrinterStore.update(printer);
    await _load();
  }

  Future<void> _testPrint(PrinterProfile printer) async {
    setState(() => _busyIds.add(printer.id));
    try {
      await PrinterService.testPrint(printer);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Test print terkirim!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal test print: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busyIds.remove(printer.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final columns = Responsive.gridColumns(context, mobile: 1, tablet: 2, desktop: 3);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Pengaturan Printer'),
        backgroundColor: Colors.white,
        foregroundColor: _navy,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _load),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: _navy,
        onPressed: _openAddSheet,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Tambah Printer', style: TextStyle(color: Colors.white)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _cyan))
          : _printers.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _load,
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: columns,
                      mainAxisExtent: 190,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _printers.length,
                    itemBuilder: (context, index) {
                      final printer = _printers[index];
                      final busy = _busyIds.contains(printer.id);
                      return _PrinterCard(
                        printer: printer,
                        isBusy: busy,
                        onEdit: () => _openEditSheet(printer),
                        onDelete: () => _delete(printer),
                        onSetDefault: () => _setDefault(printer),
                        onTestPrint: () => _testPrint(printer),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _buildEmptyState() {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.print_disabled, size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    'Belum ada printer terpasang',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.grey.shade700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Tambahkan printer Bluetooth, WiFi/LAN, atau USB\nuntuk mencetak nota & tiket dapur.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PrinterCard extends StatelessWidget {
  final PrinterProfile printer;
  final bool isBusy;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onSetDefault;
  final VoidCallback onTestPrint;

  const _PrinterCard({
    required this.printer,
    required this.isBusy,
    required this.onEdit,
    required this.onDelete,
    required this.onSetDefault,
    required this.onTestPrint,
  });

  IconData get _typeIcon {
    switch (printer.type) {
      case PrinterConnectionType.bluetooth:
        return Icons.bluetooth;
      case PrinterConnectionType.network:
        return Icons.wifi;
      case PrinterConnectionType.usb:
        return Icons.usb;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: printer.isDefault ? _cyan : Colors.grey.shade200,
          width: printer.isDefault ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _cyan.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(_typeIcon, color: _cyan, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      printer.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900, color: _navy, fontSize: 14),
                    ),
                    if (printer.isDefault)
                      const Text('Printer Utama', style: TextStyle(color: _cyan, fontSize: 10, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                onSelected: (v) {
                  if (v == 'edit') onEdit();
                  if (v == 'delete') onDelete();
                  if (v == 'default') onSetDefault();
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(value: 'edit', child: Text('Edit')),
                  if (!printer.isDefault)
                    const PopupMenuItem(value: 'default', child: Text('Jadikan Utama')),
                  const PopupMenuItem(value: 'delete', child: Text('Hapus')),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            printer.subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              _Tag(text: printer.roleLabel),
              _Tag(text: printer.paperSize == PrinterPaperSize.mm80 ? '80mm' : '58mm'),
            ],
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 36,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: _navy),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: isBusy ? null : onTestPrint,
              icon: isBusy
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: _navy),
                    )
                  : const Icon(Icons.print, size: 16, color: _navy),
              label: const Text('Test Print', style: TextStyle(color: _navy, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  final String text;
  const _Tag({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(text, style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.w600)),
    );
  }
}

/// Bottom sheet form untuk menambah/mengedit printer, mendukung 3 jenis
/// koneksi: Bluetooth (scan perangkat pairing), WiFi/LAN (input IP:Port),
/// dan USB (scan perangkat USB tersambung, Android saja).
class _AddEditPrinterSheet extends StatefulWidget {
  final PrinterProfile? existing;
  const _AddEditPrinterSheet({this.existing});

  @override
  State<_AddEditPrinterSheet> createState() => _AddEditPrinterSheetState();
}

class _AddEditPrinterSheetState extends State<_AddEditPrinterSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _ipController = TextEditingController();
  final _portController = TextEditingController(text: '9100');

  PrinterConnectionType _type = PrinterConnectionType.bluetooth;
  PrinterRole _role = PrinterRole.both;
  PrinterPaperSize _paperSize = PrinterPaperSize.mm58;

  List<BluetoothInfo> _btDevices = [];
  BluetoothInfo? _selectedBt;
  bool _btLoading = false;

  List<PrinterDevice> _usbDevices = [];
  PrinterDevice? _selectedUsb;
  bool _usbLoading = false;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    if (e != null) {
      _nameController.text = e.name;
      _type = e.type;
      _role = e.role;
      _paperSize = e.paperSize;
      _ipController.text = e.ipAddress ?? '';
      _portController.text = e.port.toString();
    }
    if (_type == PrinterConnectionType.bluetooth) _scanBluetooth();
    if (_type == PrinterConnectionType.usb) _scanUsb();
  }

  Future<void> _scanBluetooth() async {
    setState(() => _btLoading = true);
    try {
      final devices = await PrinterService.getPairedBluetoothDevices();
      setState(() {
        _btDevices = devices;
        if (widget.existing?.btMacAddress != null) {
          try {
            _selectedBt = devices.firstWhere(
              (d) => d.macAdress == widget.existing!.btMacAddress,
            );
          } catch (_) {}
        }
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _btLoading = false);
    }
  }

  Future<void> _scanUsb() async {
    setState(() => _usbLoading = true);
    try {
      final devices = await PrinterService.getUsbDevices();
      setState(() {
        _usbDevices = devices;
        final existingId = widget.existing?.usbIdentifier;
        if (existingId != null) {
          try {
            _selectedUsb = devices.firstWhere(
              (d) => '${d.vendorId}|${d.productId}' == existingId,
            );
          } catch (_) {}
        }
      });
    } catch (_) {
    } finally {
      if (mounted) setState(() => _usbLoading = false);
    }
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;

    if (_type == PrinterConnectionType.bluetooth && _selectedBt == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih perangkat Bluetooth terlebih dahulu')),
      );
      return;
    }
    if (_type == PrinterConnectionType.usb && _selectedUsb == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih perangkat USB terlebih dahulu')),
      );
      return;
    }

    final profile = PrinterProfile(
      id: widget.existing?.id ?? const Uuid().v4(),
      name: _nameController.text.trim(),
      type: _type,
      role: _role,
      paperSize: _paperSize,
      isDefault: widget.existing?.isDefault ?? false,
      btMacAddress: _type == PrinterConnectionType.bluetooth
          ? _selectedBt?.macAdress
          : widget.existing?.btMacAddress,
      ipAddress: _type == PrinterConnectionType.network ? _ipController.text.trim() : null,
      port: int.tryParse(_portController.text.trim()) ?? 9100,
      usbIdentifier: _type == PrinterConnectionType.usb
          ? (_selectedUsb != null ? '${_selectedUsb!.vendorId}|${_selectedUsb!.productId}' : null)
          : widget.existing?.usbIdentifier,
      usbDeviceName: _type == PrinterConnectionType.usb
          ? _selectedUsb?.name
          : widget.existing?.usbDeviceName,
    );

    Navigator.pop(context, profile);
  }

  @override
  Widget build(BuildContext context) {
    final maxHeight = MediaQuery.of(context).size.height * 0.9;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 150),
      padding: EdgeInsets.only(bottom: bottomInset),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: maxHeight),
        child: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.existing == null ? 'Tambah Printer' : 'Edit Printer',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: _navy),
                        ),
                        const SizedBox(height: 20),

                        TextFormField(
                          controller: _nameController,
                          decoration: InputDecoration(
                            labelText: 'Nama Printer',
                            hintText: 'Contoh: Printer Kasir Depan',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Nama wajib diisi' : null,
                        ),
                        const SizedBox(height: 16),

                        const Text('Jenis Koneksi', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: PrinterConnectionType.values.map((t) {
                            final selected = t == _type;
                            return ChoiceChip(
                              label: Text(_connectionLabel(t)),
                              selected: selected,
                              selectedColor: _navy,
                              labelStyle: TextStyle(color: selected ? Colors.white : _navy, fontWeight: FontWeight.bold),
                              onSelected: (_) {
                                setState(() => _type = t);
                                if (t == PrinterConnectionType.bluetooth) _scanBluetooth();
                                if (t == PrinterConnectionType.usb) _scanUsb();
                              },
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        if (_type == PrinterConnectionType.bluetooth) _buildBluetoothPicker(),
                        if (_type == PrinterConnectionType.network) _buildNetworkForm(),
                        if (_type == PrinterConnectionType.usb) _buildUsbPicker(),

                        const SizedBox(height: 20),
                        const Text('Peran Printer', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: PrinterRole.values.map((r) {
                            final selected = r == _role;
                            return ChoiceChip(
                              label: Text(_roleLabel(r)),
                              selected: selected,
                              selectedColor: _cyan,
                              labelStyle: TextStyle(color: selected ? Colors.white : _navy, fontWeight: FontWeight.bold),
                              onSelected: (_) => setState(() => _role = r),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),

                        const Text('Ukuran Kertas', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('58mm'),
                              selected: _paperSize == PrinterPaperSize.mm58,
                              selectedColor: _navy,
                              labelStyle: TextStyle(
                                color: _paperSize == PrinterPaperSize.mm58 ? Colors.white : _navy,
                                fontWeight: FontWeight.bold,
                              ),
                              onSelected: (_) => setState(() => _paperSize = PrinterPaperSize.mm58),
                            ),
                            ChoiceChip(
                              label: const Text('80mm'),
                              selected: _paperSize == PrinterPaperSize.mm80,
                              selectedColor: _navy,
                              labelStyle: TextStyle(
                                color: _paperSize == PrinterPaperSize.mm80 ? Colors.white : _navy,
                                fontWeight: FontWeight.bold,
                              ),
                              onSelected: (_) => setState(() => _paperSize = PrinterPaperSize.mm80),
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),

                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _navy,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: _save,
                            child: const Text(
                              'Simpan Printer',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBluetoothPicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Pilih Perangkat (sudah di-pairing)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            IconButton(
              icon: _btLoading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh, size: 20),
              onPressed: _btLoading ? null : _scanBluetooth,
            ),
          ],
        ),
        if (_btDevices.isEmpty && !_btLoading)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Tidak ada perangkat ter-pairing. Pasangkan printer via pengaturan Bluetooth HP terlebih dahulu.',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
          ),
        ..._btDevices.map((d) {
          final selected = _selectedBt?.macAdress == d.macAdress;
          return Card(
            elevation: 0,
            color: selected ? _cyan.withValues(alpha: 0.08) : Colors.grey.shade50,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: selected ? _cyan : Colors.grey.shade200),
            ),
            child: ListTile(
              dense: true,
              leading: const Icon(Icons.bluetooth, color: _navy),
              title: Text(d.name, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(d.macAdress, style: const TextStyle(fontSize: 11)),
              trailing: selected ? const Icon(Icons.check_circle, color: _cyan) : null,
              onTap: () => setState(() => _selectedBt = d),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildNetworkForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Alamat IP & Port Printer', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
        const SizedBox(height: 4),
        Text(
          'Pastikan HP/tablet dan printer berada di jaringan WiFi/LAN yang sama.',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
        ),
        const SizedBox(height: 10),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 3,
              child: TextFormField(
                controller: _ipController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'IP Address',
                  hintText: '192.168.1.100',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) {
                  if (_type != PrinterConnectionType.network) return null;
                  if (v == null || v.trim().isEmpty) return 'Wajib diisi';
                  final regex = RegExp(r'^\d{1,3}(\.\d{1,3}){3}$');
                  if (!regex.hasMatch(v.trim())) return 'Format IP tidak valid';
                  return null;
                },
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              flex: 2,
              child: TextFormField(
                controller: _portController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Port',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) {
                  if (_type != PrinterConnectionType.network) return null;
                  final n = int.tryParse(v?.trim() ?? '');
                  if (n == null || n <= 0 || n > 65535) return 'Port tidak valid';
                  return null;
                },
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text('Port standar printer thermal jaringan: 9100', style: TextStyle(color: Colors.grey.shade400, fontSize: 11)),
        ),
      ],
    );
  }

  Widget _buildUsbPicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Pilih Perangkat USB', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            IconButton(
              icon: _usbLoading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh, size: 20),
              onPressed: _usbLoading ? null : _scanUsb,
            ),
          ],
        ),
        if (_usbDevices.isEmpty && !_usbLoading)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              'Tidak ada perangkat USB terdeteksi. Cetak USB hanya didukung di Android dan memerlukan kabel OTG.',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
            ),
          ),
        ..._usbDevices.map((d) {
          final selected = _selectedUsb != null &&
              _selectedUsb!.vendorId == d.vendorId &&
              _selectedUsb!.productId == d.productId;
          return Card(
            elevation: 0,
            color: selected ? _cyan.withValues(alpha: 0.08) : Colors.grey.shade50,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: selected ? _cyan : Colors.grey.shade200),
            ),
            child: ListTile(
              dense: true,
              leading: const Icon(Icons.usb, color: _navy),
              title: Text(
                d.name.isNotEmpty ? d.name : 'Printer USB',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Text('VID: ${d.vendorId}  PID: ${d.productId}', style: const TextStyle(fontSize: 11)),
              trailing: selected ? const Icon(Icons.check_circle, color: _cyan) : null,
              onTap: () => setState(() => _selectedUsb = d),
            ),
          );
        }),
      ],
    );
  }

  String _connectionLabel(PrinterConnectionType t) {
    switch (t) {
      case PrinterConnectionType.bluetooth:
        return 'Bluetooth';
      case PrinterConnectionType.network:
        return 'WiFi / LAN';
      case PrinterConnectionType.usb:
        return 'USB';
    }
  }

  String _roleLabel(PrinterRole r) {
    switch (r) {
      case PrinterRole.receipt:
        return 'Nota Kasir';
      case PrinterRole.kitchen:
        return 'Tiket Dapur';
      case PrinterRole.both:
        return 'Nota & Dapur';
    }
  }
}
