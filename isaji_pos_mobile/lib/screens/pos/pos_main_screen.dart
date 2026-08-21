import 'package:flutter/material.dart';
import 'package:responsive_builder/responsive_builder.dart';

// Import semua tab
import 'tabs/dashboard_tab.dart';
import 'tabs/cashier_tab.dart';
import 'tabs/validation_tab.dart';
import 'tabs/active_orders_tab.dart';
import 'tabs/history_tab.dart';

// Import pengaturan & shift
import '../settings/printer_settings_screen.dart';
import '../shift/close_shift_screen.dart';

class PosMainScreen extends StatefulWidget {
  const PosMainScreen({super.key});

  @override
  State<PosMainScreen> createState() => _PosMainScreenState();
}

class _PosMainScreenState extends State<PosMainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _tabs = const [
    DashboardTab(),
    CashierTab(),
    ValidationTab(),
    ActiveOrdersTab(),
    HistoryTab(),
  ];

  void _onItemTapped(int index) {
    setState(() => _selectedIndex = index);
  }

  void _goToSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const PrinterSettingsScreen()),
    );
  }

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
        // DETEKSI OTOMATIS: Apakah Layar Landscape atau ukuran layarnya besar?
        bool isLandscape =
            MediaQuery.of(context).orientation == Orientation.landscape;
        bool isLargeScreen =
            sizingInformation.deviceScreenType != DeviceScreenType.mobile ||
            isLandscape;

        // ==========================================
        // LAYOUT PORTRAIT MOBILE (FOOTER DI BAWAH)
        // ==========================================
        if (!isLargeScreen) {
          return Scaffold(
            appBar: AppBar(
              title: Image.asset(
                'assets/images/LOGO.png',
                height: 36,
                fit: BoxFit.contain,
              ),
              centerTitle: false,
              backgroundColor: Colors.white,
              elevation: 0,
              actions: [
                IconButton(
                  icon: const Icon(Icons.settings, color: Colors.grey),
                  onPressed: _goToSettings,
                ),
                IconButton(
                  icon: const Icon(
                    Icons.power_settings_new,
                    color: Colors.redAccent,
                  ),
                  onPressed: _goToCloseShift,
                ),
              ],
            ),
            body: IndexedStack(index: _selectedIndex, children: _tabs),
            bottomNavigationBar: Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -5),
                  ),
                ],
              ),
              child: BottomNavigationBar(
                currentIndex: _selectedIndex,
                onTap: _onItemTapped,
                type: BottomNavigationBarType.fixed,
                backgroundColor: Colors.white,
                selectedItemColor: const Color(0xFF00B4D8),
                unselectedItemColor: Colors.grey.shade400,
                showUnselectedLabels: true,
                selectedLabelStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 11,
                ),
                unselectedLabelStyle: const TextStyle(fontSize: 10),
                items: const [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.dashboard_rounded),
                    label: 'Beranda',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.point_of_sale),
                    label: 'Kasir',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.price_check),
                    label: 'Validasi',
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
            ),
          );
        }

        // ==========================================
        // LAYOUT LANDSCAPE / TABLET (SIDEBAR DI KIRI)
        // ==========================================
        return Scaffold(
          body: Row(
            children: [
              // PANEL 1: SIDEBAR NAVIGATION
              Container(
                width: 100, // Dibuat 100 agar hemat ruang saat HP Landscape
                decoration: BoxDecoration(
                  color: const Color(0xFF0F2040),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.1),
                      blurRadius: 10,
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 24),
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 12),
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Image.asset(
                        'assets/images/LOGO.png',
                        height: 40,
                        fit: BoxFit.contain,
                      ),
                    ),
                    const SizedBox(height: 24),

                    Expanded(
                      child: ListView(
                        children: [
                          _buildNavItem(Icons.dashboard_rounded, 'Beranda', 0),
                          _buildNavItem(Icons.point_of_sale, 'Kasir', 1),
                          _buildNavItem(Icons.price_check, 'Validasi', 2),
                          _buildNavItem(Icons.list_alt, 'Pesanan', 3),
                          _buildNavItem(Icons.history, 'Riwayat', 4),
                        ],
                      ),
                    ),

                    // FOOTER: Settings
                    InkWell(
                      onTap: _goToSettings,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        width: double.infinity,
                        child: const Column(
                          children: [
                            Icon(
                              Icons.settings,
                              color: Colors.white70,
                              size: 24,
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Setting',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // FOOTER: Close Shift
                    InkWell(
                      onTap: _goToCloseShift,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        width: double.infinity,
                        color: Colors.redAccent.withValues(alpha: 0.1),
                        child: const Column(
                          children: [
                            Icon(
                              Icons.power_settings_new,
                              color: Colors.redAccent,
                              size: 24,
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Tutup',
                              style: TextStyle(
                                color: Colors.redAccent,
                                fontSize: 11,
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

              // KONTEN UTAMA
              Expanded(
                child: IndexedStack(index: _selectedIndex, children: _tabs),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isSelected = _selectedIndex == index;
    return InkWell(
      onTap: () => _onItemTapped(index),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00B4D8).withValues(alpha: 0.15)
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
              color: isSelected ? const Color(0xFF00B4D8) : Colors.white54,
              size: 24,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: isSelected ? const Color(0xFF00B4D8) : Colors.white54,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
