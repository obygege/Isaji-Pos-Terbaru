import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:responsive_builder/responsive_builder.dart';

import '../pos/pos_main_screen.dart';
import '../shift/open_shift_screen.dart';

class PinLoginScreen extends StatefulWidget {
  const PinLoginScreen({super.key});

  @override
  State<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends State<PinLoginScreen> {
  final TextEditingController _branchCodeController = TextEditingController();
  String _pin = '';
  bool _isLoading = false;
  String _errorMessage = '';

  void _onPinTap(String number) {
    if (_branchCodeController.text.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Masukkan Kode Cabang terlebih dahulu!';
      });
      return;
    }

    if (_pin.length < 6) {
      setState(() {
        _pin += number;
        _errorMessage = '';
      });
      if (_pin.length == 6) {
        _verifyLogin();
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

  Future<void> _verifyLogin() async {
    setState(() => _isLoading = true);
    final supabase = Supabase.instance.client;
    final branchCode = _branchCodeController.text.trim();

    try {
      final branchRes = await supabase
          .from('branches')
          .select('id, is_active')
          .eq('code', branchCode)
          .maybeSingle();

      if (branchRes == null) {
        setState(() {
          _errorMessage = 'Kode Cabang tidak ditemukan!';
          _pin = '';
        });
        return;
      }

      if (branchRes['is_active'] == false) {
        setState(() {
          _errorMessage = 'Cabang ini sedang non-aktif!';
          _pin = '';
        });
        return;
      }

      final branchId = branchRes['id'];

      // DIPERBAIKI: Menambahkan user_id pada select()
      final empRes = await supabase
          .from('employees')
          .select(
            'id, user_id, full_name, branch_id, organization_id, position, is_active',
          )
          .eq('pin', _pin)
          .eq('branch_id', branchId)
          .maybeSingle();

      if (empRes == null) {
        setState(() {
          _errorMessage = 'PIN salah atau bukan karyawan cabang ini!';
          _pin = '';
        });
        return;
      }

      if (empRes['is_active'] == false) {
        setState(() {
          _errorMessage = 'Akun karyawan non-aktif!';
          _pin = '';
        });
        return;
      }

      // DIPERBAIKI: Simpan user_id ke dalam session
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('emp_id', empRes['id']);
      await prefs.setString(
        'user_id',
        empRes['user_id'] ?? '',
      ); // Menyimpan user_id
      await prefs.setString('branch_id', empRes['branch_id'] ?? '');
      await prefs.setString('org_id', empRes['organization_id'] ?? '');
      await prefs.setString('emp_name', empRes['full_name']);

      // DIPERBAIKI: Gunakan user_id untuk mengecek tabel cashier_shifts
      final activeShift = await supabase
          .from('cashier_shifts')
          .select('id')
          .eq('branch_id', empRes['branch_id'])
          .eq('cashier_id', empRes['user_id'])
          .isFilter('closed_at', null)
          .maybeSingle();

      if (!mounted) return;

      if (activeShift == null) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const OpenShiftScreen()),
        );
      } else {
        await prefs.setString('shift_id', activeShift['id']);
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const PosMainScreen()),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Terjadi kesalahan sistem: $e';
        _pin = '';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: ResponsiveBuilder(
        builder: (context, sizingInformation) {
          bool isTablet =
              sizingInformation.deviceScreenType == DeviceScreenType.tablet;

          return Center(
            child: SingleChildScrollView(
              child: Container(
                width: isTablet ? 450 : double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: isTablet
                    ? BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 20,
                          ),
                        ],
                      )
                    : null,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'ISAJI POS',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F2040),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Sistem Manajemen F&B'),
                    const SizedBox(height: 32),

                    TextField(
                      controller: _branchCodeController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        labelText: 'Kode Cabang',
                        hintText: 'Contoh: JKT01',
                        prefixIcon: const Icon(Icons.storefront),
                        filled: true,
                        fillColor: Colors.white,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    const Text('Masukkan 6 Digit PIN Karyawan'),
                    const SizedBox(height: 16),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(6, (index) {
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 8),
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: index < _pin.length
                                ? const Color(0xFF00B4D8)
                                : Colors.grey.shade300,
                          ),
                        );
                      }),
                    ),

                    const SizedBox(height: 16),
                    if (_errorMessage.isNotEmpty)
                      Text(
                        _errorMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.all(8.0),
                        child: CircularProgressIndicator(),
                      ),

                    const SizedBox(height: 32),

                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 1.5,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                          ),
                      itemCount: 12,
                      itemBuilder: (context, index) {
                        if (index == 9) return const SizedBox();
                        if (index == 11) {
                          return IconButton(
                            onPressed: _onBackspace,
                            icon: const Icon(
                              Icons.backspace_outlined,
                              size: 28,
                            ),
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
                              child: Text(
                                number,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
