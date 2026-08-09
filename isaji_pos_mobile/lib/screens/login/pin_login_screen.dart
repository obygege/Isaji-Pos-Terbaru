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
      setState(() => _errorMessage = 'Masukkan Kode Cabang terlebih dahulu!');
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
      setState(() => _pin = _pin.substring(0, _pin.length - 1));
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

      final empRes = await supabase
          .from('employees')
          .select(
            'id, full_name, branch_id, organization_id, position, is_active',
          )
          .eq('pin', _pin)
          .eq('branch_id', branchId)
          .ilike('position', '%kasir%')
          .maybeSingle();

      if (empRes == null) {
        setState(() {
          _errorMessage = 'PIN salah atau Anda bukan terdaftar sebagai Kasir!';
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

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('emp_id', empRes['id']);
      await prefs.setString('branch_id', empRes['branch_id'] ?? '');
      await prefs.setString('org_id', empRes['organization_id'] ?? '');
      await prefs.setString('emp_name', empRes['full_name']);

      final activeShift = await supabase
          .from('cashier_shifts')
          .select('id')
          .eq('branch_id', branchId)
          .eq('cashier_id', empRes['id'])
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

        // ---> PERBAIKAN DI SINI <---
        if (!mounted) return;

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
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      body: ResponsiveBuilder(
        builder: (context, sizingInformation) {
          bool isTablet =
              sizingInformation.deviceScreenType == DeviceScreenType.tablet;

          return Center(
            child: SingleChildScrollView(
              child: Container(
                width: isTablet ? 450 : double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 40,
                  vertical: 48,
                ),
                decoration: isTablet
                    ? BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(32),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(
                              0xFF0F2040,
                            ).withValues(alpha: 0.08),
                            blurRadius: 30,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      )
                    : null,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/images/LOGO.png',
                      height: 100,
                      fit: BoxFit.contain,
                    ),
                    const SizedBox(height: 40),

                    TextField(
                      controller: _branchCodeController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        labelText: 'Kode Cabang',
                        hintText: 'Contoh: JKT01',
                        prefixIcon: const Icon(
                          Icons.storefront,
                          color: Color(0xFF00B4D8),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.grey.shade200),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: Color(0xFF00B4D8),
                            width: 2,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    const Text(
                      'Masukkan 6 Digit PIN Karyawan',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF0F2040),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(6, (index) {
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 10),
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: index < _pin.length
                                ? const Color(0xFF00B4D8)
                                : Colors.grey.shade200,
                            boxShadow: index < _pin.length
                                ? [
                                    BoxShadow(
                                      color: const Color(
                                        0xFF00B4D8,
                                      ).withValues(alpha: 0.4),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                        );
                      }),
                    ),

                    const SizedBox(height: 24),
                    if (_errorMessage.isNotEmpty)
                      Text(
                        _errorMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.redAccent,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.all(8.0),
                        child: CircularProgressIndicator(
                          color: Color(0xFF00B4D8),
                        ),
                      ),

                    const SizedBox(height: 32),

                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            childAspectRatio: 1.4,
                            mainAxisSpacing: 16,
                            crossAxisSpacing: 16,
                          ),
                      itemCount: 12,
                      itemBuilder: (context, index) {
                        if (index == 9) return const SizedBox();
                        if (index == 11) {
                          return IconButton(
                            onPressed: _onBackspace,
                            icon: const Icon(
                              Icons.backspace_outlined,
                              size: 32,
                            ),
                            color: const Color(0xFF0F2040),
                          );
                        }
                        final number = index == 10 ? '0' : '${index + 1}';
                        return InkWell(
                          onTap: () => _onPinTap(number),
                          borderRadius: BorderRadius.circular(20),
                          splashColor: const Color(
                            0xFF00B4D8,
                          ).withValues(alpha: 0.2),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.03),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Center(
                              child: Text(
                                number,
                                style: const TextStyle(
                                  fontSize: 28,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F2040),
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
