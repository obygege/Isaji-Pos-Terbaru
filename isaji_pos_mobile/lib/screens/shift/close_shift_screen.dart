import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../login/pin_login_screen.dart';

class CloseShiftScreen extends StatefulWidget {
  const CloseShiftScreen({super.key});

  @override
  State<CloseShiftScreen> createState() => _CloseShiftScreenState();
}

class _CloseShiftScreenState extends State<CloseShiftScreen> {
  final supabase = Supabase.instance.client;
  final TextEditingController _actualCashController = TextEditingController();

  bool _isLoading = true;
  double _openingCash = 0;
  double _totalCashPayments = 0;
  double _expectedCash = 0;
  String _shiftId = '';

  @override
  void initState() {
    super.initState();
    _calculateShiftSummary();
  }

  Future<void> _calculateShiftSummary() async {
    final prefs = await SharedPreferences.getInstance();
    _shiftId = prefs.getString('shift_id') ?? '';
    final empId = prefs.getString('emp_id');

    if (_shiftId.isEmpty) return;

    // 1. Ambil data shift dari cashier_shifts
    final shiftData = await supabase
        .from('cashier_shifts')
        .select('*')
        .eq('id', _shiftId)
        .single();
    _openingCash = (shiftData['opening_cash'] as num).toDouble();
    final openedAt = shiftData['opened_at'];

    // 2. Hitung semua pembayaran 'cash' sejak shift dibuka
    // Menggunakan kolom paid_at sesuai skema tabel payments
    final paymentsRes = await supabase
        .from('payments')
        .select('amount')
        .eq('method', 'cash')
        .eq('received_by', empId ?? '')
        .gte('paid_at', openedAt);

    for (var p in paymentsRes) {
      _totalCashPayments += (p['amount'] as num).toDouble();
    }

    _expectedCash = _openingCash + _totalCashPayments;

    setState(() => _isLoading = false);
  }

  Future<void> _closeShift() async {
    if (_actualCashController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan jumlah uang fisik di laci!')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final actualCash = double.parse(_actualCashController.text);
      final difference = actualCash - _expectedCash;

      // Update database cashier_shifts sesuai struktur asli
      await supabase
          .from('cashier_shifts')
          .update({
            'closed_at': DateTime.now().toUtc().toIso8601String(),
            'expected_cash': _expectedCash,
            'closing_cash': actualCash,
            'difference': difference,
          })
          .eq('id', _shiftId);

      // Hapus data sesi shift
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('shift_id');

      if (!mounted) return;
      // Logout dan kembali ke layar PIN
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const PinLoginScreen()),
        (route) => false,
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Tutup Shift (Settlement)'),
        backgroundColor: Colors.white,
      ),
      body: Center(
        child: Container(
          width: 500,
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 20,
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Ringkasan Keuangan Shift',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const Divider(height: 32),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Modal Awal:'),
                  Text(
                    'Rp ${_openingCash.toStringAsFixed(0)}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Pemasukan Tunai:'),
                  Text(
                    '+ Rp ${_totalCashPayments.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const Divider(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Uang Seharusnya di Laci:',
                    style: TextStyle(fontSize: 16),
                  ),
                  Text(
                    'Rp ${_expectedCash.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF00B4D8),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              TextField(
                controller: _actualCashController,
                keyboardType: TextInputType.number,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                decoration: InputDecoration(
                  labelText: 'Hitung & Masukkan Uang Fisik di Laci',
                  prefixText: 'Rp ',
                  filled: true,
                  fillColor: Colors.amber.withValues(alpha: 0.1),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.calculate),
                ),
              ),
              const SizedBox(height: 32),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _closeShift,
                  child: const Text(
                    'Konfirmasi & Tutup Kasir',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
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
}
