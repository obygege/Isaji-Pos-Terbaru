import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class DashboardTab extends StatefulWidget {
  const DashboardTab({super.key});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  final supabase = Supabase.instance.client;

  String _empName = 'Kasir';
  DateTime? _shiftStart;
  DateTime? _shiftEnd;
  double _totalSales = 0;
  int _totalOrders = 0;
  bool _isLoading = true;

  Timer? _timer;
  Duration _remainingTime = Duration.zero;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_shiftEnd != null) {
        setState(() {
          final now = DateTime.now();
          if (_shiftEnd!.isAfter(now)) {
            _remainingTime = _shiftEnd!.difference(now);
          } else {
            _remainingTime = Duration.zero;
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final shiftId = prefs.getString('shift_id');
      final empId = prefs.getString('emp_id');

      setState(() {
        _empName = prefs.getString('emp_name') ?? 'Kasir';
      });

      if (shiftId != null) {
        final shiftData = await supabase
            .from('cashier_shifts')
            .select('opened_at')
            .eq('id', shiftId)
            .single();

        final openedAt = DateTime.parse(shiftData['opened_at']).toLocal();

        setState(() {
          _shiftStart = openedAt;
          _shiftEnd = openedAt.add(const Duration(hours: 8));
        });

        final ordersData = await supabase
            .from('orders')
            .select('total_amount')
            .eq('cashier_id', empId!)
            .gte('created_at', shiftData['opened_at'])
            .eq('payment_status', 'paid');

        double sales = 0;
        for (var order in ordersData) {
          sales += (order['total_amount'] as num).toDouble();
        }

        setState(() {
          _totalOrders = ordersData.length;
          _totalSales = sales;
        });
      }
    } catch (e) {
      debugPrint("Error load dashboard: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    return "$hours:$minutes:$seconds";
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00B4D8)),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: const Color(0xFF0F2040),
                  child: Text(
                    _empName[0].toUpperCase(),
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Selamat Bertugas,',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade600,
                        ),
                      ),
                      Text(
                        _empName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F2040),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    Icons.payments,
                    'Penjualan Shift',
                    'Rp ${_totalSales.toStringAsFixed(0)}',
                    const Color(0xFF00B4D8),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildMetricCard(
                    Icons.receipt_long,
                    'Transaksi',
                    '$_totalOrders Pesanan',
                    const Color(0xFF4318FF),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F2040), Color(0xFF1E3A70)],
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F2040).withValues(alpha: 0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Waktu Mulai Shift',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _shiftStart != null
                              ? DateFormat('HH:mm WIB').format(_shiftStart!)
                              : '-',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        const Text(
                          'Selesai (8 Jam)',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _shiftEnd != null
                              ? DateFormat('HH:mm WIB').format(_shiftEnd!)
                              : '-',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 16,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(
                        20,
                      ), // Bukan circle agar tidak makan tempat
                    ),
                    child: Column(
                      children: [
                        const Icon(Icons.timer, color: Colors.white, size: 26),
                        const SizedBox(height: 8),
                        const Text(
                          'SISA WAKTU',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            _formatDuration(_remainingTime),
                            style: const TextStyle(
                              color: Color(0xFF00B4D8),
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard(
    IconData icon,
    String title,
    String value,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F2040),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
