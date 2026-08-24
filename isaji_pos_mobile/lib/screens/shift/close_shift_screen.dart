import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../login/pin_login_screen.dart';
import '../../utils/responsive.dart';

class CloseShiftScreen extends StatefulWidget {
  const CloseShiftScreen({super.key});

  @override
  State<CloseShiftScreen> createState() => _CloseShiftScreenState();
}

class _CloseShiftScreenState extends State<CloseShiftScreen> {
  final supabase = Supabase.instance.client;
  final TextEditingController _actualCashController = TextEditingController();

  bool _isLoading = true;
  String? _errorMessage;
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
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      _shiftId = prefs.getString('shift_id') ?? '';
      final empId = prefs.getString('emp_id');

      if (_shiftId.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Shift tidak ditemukan. Silakan login ulang.';
        });
        return;
      }

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

      _totalCashPayments = 0;
      for (var p in paymentsRes) {
        _totalCashPayments += (p['amount'] as num).toDouble();
      }

      _expectedCash = _openingCash + _totalCashPayments;

      setState(() => _isLoading = false);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Gagal memuat ringkasan shift: $e';
      });
    }
  }

  Future<void> _closeShift() async {
    final rawInput = _actualCashController.text.trim();
    if (rawInput.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan jumlah uang fisik di laci!')),
      );
      return;
    }

    final actualCash = double.tryParse(rawInput);
    if (actualCash == null || actualCash < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Jumlah uang harus berupa angka dan tidak boleh negatif!',
          ),
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Konfirmasi Tutup Shift'),
        content: Text(
          'Selisih kas: Rp ${(actualCash - _expectedCash).toStringAsFixed(0)}.\n'
          'Setelah ditutup, Anda akan keluar dari sesi kasir ini. Lanjutkan?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Ya, Tutup',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
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
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF00B4D8)),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Tutup Shift (Settlement)')),
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline, color: Colors.red, size: 48),
                  const SizedBox(height: 12),
                  Text(_errorMessage!, textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _calculateShiftSummary,
                    child: const Text('Coba Lagi'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      appBar: AppBar(
        title: const Text('Tutup Shift (Settlement)'),
        backgroundColor: Colors.white,
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 48,
                ),
                child: Center(
                  child: Container(
                    width: Responsive.cardMaxWidth(context, max: 480),
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
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Divider(height: 32),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Modal Awal:'),
                            Text(
                              'Rp ${_openingCash.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
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
                            const Expanded(
                              child: Text(
                                'Uang Seharusnya di Laci:',
                                style: TextStyle(fontSize: 15),
                              ),
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
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: false,
                          ),
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
              ),
            );
          },
        ),
      ),
    );
  }
}
