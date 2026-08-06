import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../utils/printer_helper.dart';

class PrinterSettingsScreen extends StatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  State<PrinterSettingsScreen> createState() => _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState extends State<PrinterSettingsScreen> {
  List<BluetoothInfo> _devices = [];
  bool _isScanning = false;
  String _connectedMac = '';

  @override
  void initState() {
    super.initState();
    _scanDevices();
  }

  Future<void> _scanDevices() async {
    setState(() => _isScanning = true);
    try {
      final devices = await PrinterHelper.getPairedDevices();
      setState(() => _devices = devices);

      bool connected = await PrintBluetoothThermal.connectionStatus;
      if (connected) {
        setState(() => _connectedMac = 'connected');
      }
    } catch (e) {
      debugPrint("Error Bluetooth: $e");
    } finally {
      setState(() => _isScanning = false);
    }
  }

  Future<void> _connect(String mac) async {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Menghubungkan...')));
    bool isConnected = await PrinterHelper.connectToPrinter(mac);

    if (isConnected) {
      setState(() => _connectedMac = mac);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Printer Terhubung!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Gagal Terhubung'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Pengaturan Printer'),
        backgroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _scanDevices),
        ],
      ),
      body: _isScanning
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _devices.length,
              itemBuilder: (context, index) {
                final device = _devices[index];
                final isConnected = _connectedMac == device.macAdress;

                return Card(
                  color: Colors.white,
                  child: ListTile(
                    leading: const Icon(Icons.print),
                    title: Text(device.name),
                    subtitle: Text(device.macAdress),
                    trailing: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isConnected
                            ? Colors.green
                            : const Color(0xFF0F2040),
                      ),
                      onPressed: () => _connect(device.macAdress),
                      child: Text(
                        isConnected ? 'Terhubung' : 'Hubungkan',
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
