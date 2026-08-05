import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:responsive_builder/responsive_builder.dart';

class PinLoginScreen extends StatefulWidget {
  const PinLoginScreen({super.key});

  @override
  State<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends State<PinLoginScreen> {
  String _pin = '';
  bool _isLoading = false;
  String _errorMessage = '';

  void _onPinTap(String number) {
    if (_pin.length < 6) {
      setState(() {
        _pin += number;
        _errorMessage = '';
      });
      if (_pin.length == 6) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
      });
    }
  }

  Future<void> _verifyPin() async {
    setState(() => _isLoading = true);
    final supabase = Supabase.instance.client;

    try {
      // Query ke tabel employees berdasarkan PIN
      final response = await supabase
          .from('employees')
          .select('id, full_name, branch_id, position, is_active')
          .eq('pin', _pin)
          .maybeSingle();

      if (response == null) {
        setState(() {
          _errorMessage = 'PIN tidak ditemukan!';
          _pin = '';
        });
      } else if (response['is_active'] == false) {
        setState(() {
          _errorMessage = 'Akun karyawan non-aktif!';
          _pin = '';
        });
      } else {
        // Sukses Login - Simpan sesi karyawan
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('emp_id', response['id']);
        await prefs.setString('branch_id', response['branch_id']);
        await prefs.setString('emp_name', response['full_name']);

        if (!mounted) return;
        // Navigasi ke Dashboard Kasir (Akan dibuat di langkah selanjutnya)
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Selamat Datang, ${response['full_name']}')),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Terjadi kesalahan sistem.';
        _pin = '';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // gray-50
      body: ResponsiveBuilder(
        builder: (context, sizingInformation) {
          // Menyesuaikan layout berdasarkan ukuran layar (Mobile vs Tablet)
          bool isTablet = sizingInformation.deviceScreenType == DeviceScreenType.tablet;
          
          return Center(
            child: Container(
              width: isTablet ? 450 : double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: isTablet ? BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20)
                ],
              ) : null,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'ISAJI POS',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: Color(0xFF0F2040)),
                  ),
                  const SizedBox(height: 8),
                  const Text('Masukkan 6 Digit PIN Karyawan'),
                  const SizedBox(height: 32),
                  
                  // Indikator PIN Bulat
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(6, (index) {
                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 8),
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: index < _pin.length ? const Color(0xFF00B4D8) : Colors.grey.shade300,
                        ),
                      );
                    }),
                  ),
                  
                  const SizedBox(height: 16),
                  if (_errorMessage.isNotEmpty)
                    Text(_errorMessage, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                  if (_isLoading)
                    const Padding(padding: EdgeInsets.all(8.0), child: CircularProgressIndicator()),
                  
                  const SizedBox(height: 32),
                  
                  // Keypad Numerik
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      childAspectRatio: 1.5,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                    ),
                    itemCount: 12,
                    itemBuilder: (context, index) {
                      if (index == 9) return const SizedBox(); // Kosong
                      if (index == 11) {
                        return IconButton(
                          onPressed: _onBackspace,
                          icon: const Icon(Icons.backspace_outlined, size: 28),
                          color: const Color(0xFF0F2040),
                        );
                      }
                      final number = index == 10 ? '0' : '${index + 1}';
                      return InkWell(
                        onTap: () => _onPinTap(number),
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Center(
                            child: Text(number, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}