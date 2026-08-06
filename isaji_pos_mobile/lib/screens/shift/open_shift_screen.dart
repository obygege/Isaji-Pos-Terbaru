import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../pos/pos_main_screen.dart';

class OpenShiftScreen extends StatefulWidget {
  const OpenShiftScreen({super.key});

  @override
  State<OpenShiftScreen> createState() => _OpenShiftScreenState();
}

class _OpenShiftScreenState extends State<OpenShiftScreen> {
  final supabase = Supabase.instance.client;
  final TextEditingController _cashController = TextEditingController();
  bool _isLoading = false;
  String _empName = '';

  @override
  void initState() {
    super.initState();
    _loadEmpData();
  }

  Future<void> _loadEmpData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _empName = prefs.getString('emp_name') ?? 'Kasir';
    });
  }

  Future<void> _openShift() async {
    if (_cashController.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Masukkan modal awal!')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final branchId = prefs.getString('branch_id');

      // DIPERBAIKI: Ambil user_id untuk menghindari error foreign key
      final userId = prefs.getString('user_id');
      final openingCash = double.parse(_cashController.text);

      final response = await supabase
          .from('cashier_shifts')
          .insert({
            'branch_id': branchId,
            'cashier_id': userId, // MENGGUNAKAN USER_ID, SESUAI ATURAN DATABASE
            'opening_cash': openingCash,
          })
          .select('id')
          .single();

      await prefs.setString('shift_id', response['id']);

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const PosMainScreen()),
      );
    } catch (e) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: Center(
        child: Container(
          width: 400,
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
              const Icon(
                Icons.point_of_sale,
                size: 64,
                color: Color(0xFF0F2040),
              ),
              const SizedBox(height: 16),
              Text(
                'Halo, $_empName!',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                'Silakan buka shift Anda',
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _cashController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Modal Awal (Uang Laci)',
                  prefixText: 'Rp ',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  prefixIcon: const Icon(Icons.account_balance_wallet),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00B4D8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: _isLoading ? null : _openShift,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Buka Kasir',
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
