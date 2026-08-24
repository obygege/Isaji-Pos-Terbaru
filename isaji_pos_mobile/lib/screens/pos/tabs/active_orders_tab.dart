import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

import '../../../utils/printer_helper.dart';
import '../../../services/printer_service.dart';
import '../../../utils/responsive.dart';

const _navy = Color(0xFF0F2040);
const _cyan = Color(0xFF00B4D8);

/// Tab "Pesanan Aktif" — daftar order yang sudah dibayar/masuk tapi
/// belum selesai (status: pending / preparing / ready), baik dari POS
/// langsung maupun dari self-order QR meja yang sudah diverifikasi.
/// Kasir bisa mengubah status pesanan dan mencetak ulang nota / tiket
/// dapur langsung dari sini.
class ActiveOrdersTab extends StatefulWidget {
  const ActiveOrdersTab({super.key});

  @override
  State<ActiveOrdersTab> createState() => _ActiveOrdersTabState();
}

class _ActiveOrdersTabState extends State<ActiveOrdersTab> {
  final supabase = Supabase.instance.client;

  String _branchId = '';
  String _storeName = 'ISAJI POS';
  String? _storeAddress;
  String? _storePhone;
  bool _isLoading = true;
  String? _errorMsg;
  List<Map<String, dynamic>> _orders = [];
  final Set<String> _busyIds = {};

  static const _activeStatuses = ['pending', 'preparing', 'ready'];

  @override
  void initState() {
    super.initState();
    _loadSessionAndData();
  }

  Future<void> _loadSessionAndData() async {
    final prefs = await SharedPreferences.getInstance();
    _branchId = prefs.getString('branch_id') ?? '';
    await Future.wait([_fetchOrders(), _fetchBranchInfo(prefs)]);
  }

  Future<void> _fetchBranchInfo(SharedPreferences prefs) async {
    if (_branchId.isEmpty) return;
    try {
      final branch = await supabase
          .from('branches')
          .select('name, address, phone')
          .eq('id', _branchId)
          .maybeSingle();
      if (branch != null && mounted) {
        setState(() {
          _storeName = branch['name']?.toString() ?? _storeName;
          _storeAddress = branch['address']?.toString();
          _storePhone = branch['phone']?.toString();
        });
      }
    } catch (_) {}
  }

  Future<void> _fetchOrders() async {
    if (_branchId.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMsg = 'Cabang belum terdeteksi. Silakan login ulang.';
      });
      return;
    }
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    try {
      final res = await supabase
          .from('orders')
          .select(
            '*, tables(name), order_items(id, product_id, qty, unit_price, subtotal, notes, products(name))',
          )
          .eq('branch_id', _branchId)
          .inFilter('status', _activeStatuses)
          .order('created_at', ascending: true);

      setState(() => _orders = List<Map<String, dynamic>>.from(res));
    } catch (e) {
      setState(() => _errorMsg = 'Gagal memuat pesanan aktif: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _nextStatus(String current) {
    switch (current) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return current;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'pending':
        return 'Menunggu Diproses';
      case 'preparing':
        return 'Sedang Disiapkan';
      case 'ready':
        return 'Siap Disajikan';
      case 'completed':
        return 'Selesai';
      default:
        return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'preparing':
        return _cyan;
      case 'ready':
        return const Color(0xFF16A34A);
      default:
        return Colors.grey;
    }
  }

  Future<void> _advanceStatus(Map<String, dynamic> order) async {
    final id = order['id'] as String;
    final next = _nextStatus(order['status'] as String);
    setState(() => _busyIds.add(id));
    try {
      await supabase.from('orders').update({'status': next}).eq('id', id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pesanan ${order['order_number']} -> ${_statusLabel(next)}'),
          backgroundColor: Colors.green,
        ),
      );
      await _fetchOrders();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengubah status: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busyIds.remove(id));
    }
  }

  ReceiptData _buildReceiptData(Map<String, dynamic> order, {required String paymentMethod}) {
    final items = List<Map<String, dynamic>>.from(order['order_items'] ?? []);
    final createdAt = DateTime.tryParse(order['created_at']?.toString() ?? '') ?? DateTime.now();
    final tableName = order['tables']?['name'];

    return ReceiptData(
      storeName: _storeName,
      storeAddress: _storeAddress,
      storePhone: _storePhone,
      orderNumber: order['order_number']?.toString() ?? '-',
      cashierName: '-',
      orderType: order['channel']?.toString() ?? '-',
      dateTime: createdAt,
      tableName: tableName,
      customerName: order['customer_name']?.toString(),
      items: items
          .map((it) => ReceiptLineItem(
                name: it['products']?['name']?.toString() ?? 'Item',
                qty: (it['qty'] as num?) ?? 0,
                price: (it['unit_price'] as num?)?.toDouble() ?? 0,
                subtotal: (it['subtotal'] as num?)?.toDouble() ?? 0,
                notes: it['notes']?.toString(),
              ))
          .toList(),
      subtotal: (order['subtotal'] as num?)?.toDouble() ?? 0,
      discount: (order['discount_amount'] as num?)?.toDouble() ?? 0,
      tax: (order['tax_amount'] as num?)?.toDouble() ?? 0,
      serviceCharge: (order['service_charge'] as num?)?.toDouble() ?? 0,
      grandTotal: (order['total_amount'] as num?)?.toDouble() ?? 0,
      paymentMethod: paymentMethod,
      amountTendered: (order['total_amount'] as num?)?.toDouble() ?? 0,
      change: 0,
    );
  }

  Future<void> _printReceipt(Map<String, dynamic> order) async {
    await _runPrint(order, kitchen: false);
  }

  Future<void> _printKitchenTicket(Map<String, dynamic> order) async {
    await _runPrint(order, kitchen: true);
  }

  Future<void> _runPrint(Map<String, dynamic> order, {required bool kitchen}) async {
    final id = order['id'] as String;
    setState(() => _busyIds.add('$id-print'));
    try {
      final data = _buildReceiptData(order, paymentMethod: order['payment_status']?.toString() ?? '-');
      final results = kitchen
          ? await PrinterService.printKitchenTicketToAllAssigned(data)
          : await PrinterService.printReceiptToAllAssigned(data);

      if (!mounted) return;
      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Belum ada printer ${kitchen ? 'dapur' : 'nota'} terpasang.')),
        );
        return;
      }
      final failed = results.where((r) => !r.success).toList();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(failed.isEmpty ? 'Berhasil dicetak.' : 'Sebagian gagal: ${failed.map((f) => f.printer.name).join(', ')}'),
          backgroundColor: failed.isEmpty ? Colors.green : Colors.orange,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mencetak: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _busyIds.remove('$id-print'));
    }
  }

  @override
  Widget build(BuildContext context) {
    final columns = Responsive.gridColumns(context, mobile: 1, tablet: 2, desktop: 3);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      'Pesanan Aktif',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: _navy),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: _navy),
                    onPressed: _fetchOrders,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Pesanan yang sudah dibayar dan sedang berjalan di dapur/meja.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 16),
              Expanded(child: _buildBody(columns)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody(int columns) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: _cyan));
    }
    if (_errorMsg != null) {
      return Center(child: Text(_errorMsg!, style: const TextStyle(color: Colors.red)));
    }
    if (_orders.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.restaurant_menu, size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text('Tidak ada pesanan aktif saat ini.', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchOrders,
      child: GridView.builder(
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisExtent: 250,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: _orders.length,
        itemBuilder: (context, index) => _buildOrderCard(_orders[index]),
      ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> order) {
    final status = order['status']?.toString() ?? 'pending';
    final id = order['id'] as String;
    final busy = _busyIds.contains(id);
    final printing = _busyIds.contains('$id-print');
    final items = List<Map<String, dynamic>>.from(order['order_items'] ?? []);
    final tableName = order['tables']?['name'];
    final createdAt = DateTime.tryParse(order['created_at']?.toString() ?? '');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order['order_number']?.toString() ?? '-',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: _navy),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor(status).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _statusLabel(status),
                  style: TextStyle(color: _statusColor(status), fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              if (tableName != null) 'Meja $tableName',
              if (createdAt != null) DateFormat('HH:mm').format(createdAt.toLocal()),
            ].join(' • '),
            style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
          ),
          const Divider(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: items.length,
              itemBuilder: (context, i) {
                final it = items[i];
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text('${it['qty']}x', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          it['products']?['name']?.toString() ?? 'Item',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _navy),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: printing ? null : () => _printReceipt(order),
                  icon: const Icon(Icons.receipt_long, size: 14, color: _navy),
                  label: const Text('Nota', style: TextStyle(fontSize: 11, color: _navy, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _cyan),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: printing ? null : () => _printKitchenTicket(order),
                  icon: const Icon(Icons.soup_kitchen, size: 14, color: _cyan),
                  label: const Text('Dapur', style: TextStyle(fontSize: 11, color: _cyan, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          if (status != 'completed')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _statusColor(status),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                onPressed: busy ? null : () => _advanceStatus(order),
                child: busy
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(
                        status == 'ready' ? 'Selesaikan' : 'Proses ->',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
