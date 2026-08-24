import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../pos/pos_main_screen.dart';
import '../../utils/responsive.dart';

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
    final rawInput = _cashController.text.trim();
    if (rawInput.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Masukkan modal awal!')));
      return;
    }

    final openingCash = double.tryParse(rawInput);
    if (openingCash == null || openingCash < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Modal awal harus berupa angka dan tidak boleh negatif!')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final branchId = prefs.getString('branch_id');
      final empId = prefs.getString('emp_id');

      if (branchId == null || branchId.isEmpty || empId == null || empId.isEmpty) {
        throw Exception('Sesi tidak valid, silakan login ulang.');
      }

      final response = await supabase
          .from('cashier_shifts')
          .insert({
            'branch_id': branchId,
            'cashier_id': empId, // Gunakan emp_id sebagai kasir
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
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight - 48),
                child: Center(
                  child: Container(
                    width: Responsive.cardMaxWidth(context, max: 400),
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
                          textAlign: TextAlign.center,
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
                          keyboardType: const TextInputType.numberWithOptions(decimal: false),
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
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  )
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
              ),
            );
          },
        ),
      ),
    );
  }
}
