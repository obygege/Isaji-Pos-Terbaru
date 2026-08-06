import 'package:flutter/material.dart';
import 'package:responsive_builder/responsive_builder.dart';

// Import Tabs yang sudah kita buat sebelumnya
import 'tabs/cashier_tab.dart';
import 'tabs/active_orders_tab.dart';
import 'tabs/history_tab.dart';

// Import layar Tutup Shift
import '../shift/close_shift_screen.dart';

class PosMainScreen extends StatefulWidget {
  const PosMainScreen({super.key});

  @override
  State<PosMainScreen> createState() => _PosMainScreenState();
}

class _PosMainScreenState extends State<PosMainScreen> {
  int _selectedIndex = 0;

  // Daftar Tab yang akan ditampilkan di dalam IndexedStack
  final List<Widget> _tabs = const [
    CashierTab(),
    ActiveOrdersTab(),
    HistoryTab(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  // Fungsi untuk memanggil layar Tutup Shift (Settlement)
  void _goToCloseShift() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CloseShiftScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizingInformation) {
        bool isMobile =
            sizingInformation.deviceScreenType == DeviceScreenType.mobile;

        // ==========================================
        // LAYOUT UNTUK MOBILE (HANDPHONE)
        // ==========================================
        if (isMobile) {
          return Scaffold(
            appBar: AppBar(
              title: const Text(
                'Isaji POS',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              backgroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout, color: Colors.redAccent),
                  tooltip: 'Tutup Shift',
                  onPressed: _goToCloseShift,
                ),
              ],
            ),
            body: IndexedStack(index: _selectedIndex, children: _tabs),
            bottomNavigationBar: BottomNavigationBar(
              currentIndex: _selectedIndex,
              onTap: _onItemTapped,
              selectedItemColor: const Color(0xFF00B4D8),
              unselectedItemColor: Colors.grey,
              items: const [
                BottomNavigationBarItem(
                  icon: Icon(Icons.point_of_sale),
                  label: 'Kasir',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.list_alt),
                  label: 'Pesanan',
                ),
                BottomNavigationBarItem(
                  icon: Icon(Icons.history),
                  label: 'Riwayat',
                ),
              ],
            ),
          );
        }

        // ==========================================
        // LAYOUT UNTUK TABLET / DESKTOP
        // ==========================================
        return Scaffold(
          body: Row(
            children: [
              // Sidebar Navigation
              Container(
                width: 100,
                color: const Color(0xFF0F2040),
                child: Column(
                  children: [
                    const SizedBox(height: 32),
                    const Icon(Icons.storefront, color: Colors.white, size: 40),
                    const SizedBox(height: 32),

                    _buildNavItem(Icons.point_of_sale, 'Kasir', 0),
                    _buildNavItem(Icons.list_alt, 'Pesanan', 1),
                    _buildNavItem(Icons.history, 'Riwayat', 2),

                    const Spacer(),

                    // Tombol Tutup Shift di Sidebar Bawah
                    InkWell(
                      onTap: _goToCloseShift,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 24),
                        width: double.infinity,
                        child: const Column(
                          children: [
                            Icon(
                              Icons.power_settings_new,
                              color: Colors.redAccent,
                              size: 28,
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Tutup\nShift',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.redAccent,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // Area Konten Utama (Kanan)
              Expanded(
                child: IndexedStack(index: _selectedIndex, children: _tabs),
              ),
            ],
          ),
        );
      },
    );
  }

  // Widget pembantu untuk menggambar tombol menu di Sidebar (Tablet)
  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedIndex == index;
    return InkWell(
      onTap: () => _onItemTapped(index),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00B4D8).withValues(alpha: 0.2)
              : Colors.transparent,
          border: Border(
            right: BorderSide(
              color: isSelected ? const Color(0xFF00B4D8) : Colors.transparent,
              width: 4,
            ),
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFF00B4D8) : Colors.grey,
              size: 28,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? const Color(0xFF00B4D8) : Colors.grey,
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
