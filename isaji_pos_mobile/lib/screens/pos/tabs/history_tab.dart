import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

import '../../../utils/printer_helper.dart';
import '../../../services/printer_service.dart';

const _navy = Color(0xFF0F2040);
const _cyan = Color(0xFF00B4D8);

/// Tab "Riwayat" — daftar transaksi yang sudah selesai (paid/completed),
/// bisa difilter shift berjalan atau semua transaksi hari ini, dengan
/// aksi lihat detail & cetak ulang nota.
class HistoryTab extends StatefulWidget {
  const HistoryTab({super.key});

  @override
  State<HistoryTab> createState() => _HistoryTabState();
}

class _HistoryTabState extends State<HistoryTab> {
  final supabase = Supabase.instance.client;
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  String _branchId = '';
  String? _shiftId;
  String _storeName = 'ISAJI POS';
  String? _storeAddress;
  String? _storePhone;
  bool _isLoading = true;
  String? _errorMsg;
  bool _shiftOnly = true;
  List<Map<String, dynamic>> _orders = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _branchId = prefs.getString('branch_id') ?? '';
    _shiftId = prefs.getString('shift_id');
    await Future.wait([_fetchOrders(), _fetchBranchInfo()]);
  }

  Future<void> _fetchBranchInfo() async {
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
      var query = supabase
          .from('orders')
          .select(
            '*, tables(name), order_items(id, product_id, qty, unit_price, subtotal, notes), payments(method, amount, paid_at)',
          )
          .eq('branch_id', _branchId)
          .inFilter('status', ['completed', 'cancelled']);

      if (_shiftOnly && _shiftId != null && _shiftId!.isNotEmpty) {
        query = query.eq('shift_id', _shiftId!);
      } else {
        final startOfDay = DateTime.now().toUtc();
        final since = DateTime(startOfDay.year, startOfDay.month, startOfDay.day).toIso8601String();
        query = query.gte('created_at', since);
      }

      final res = await query.order('created_at', ascending: false);
      final orders = List<Map<String, dynamic>>.from(res);

      // Katalog item disimpan di tabel `menus` (bukan `products`), jadi
      // nama item diambil manual dari situ berdasarkan product_id di order_items.
      final ids = <String>{};
      for (final o in orders) {
        for (final it in List<Map<String, dynamic>>.from(
          o['order_items'] ?? [],
        )) {
          final pid = it['product_id']?.toString();
          if (pid != null && pid.isNotEmpty) ids.add(pid);
        }
      }
      Map<String, String> nameById = {};
      if (ids.isNotEmpty) {
        final menuRes = await supabase
            .from('menus')
            .select('id, name')
            .inFilter('id', ids.toList());
        nameById = {
          for (final m in menuRes) m['id'].toString(): m['name'].toString(),
        };
      }
      for (final o in orders) {
        for (final it in List<Map<String, dynamic>>.from(
          o['order_items'] ?? [],
        )) {
          it['products'] = {
            'name': nameById[it['product_id']?.toString()] ?? 'Item',
          };
        }
      }

      setState(() => _orders = orders);
    } catch (e) {
      setState(() => _errorMsg = 'Gagal memuat riwayat: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  double get _totalRevenue =>
      _orders.fold(0, (sum, o) => sum + ((o['total_amount'] as num?)?.toDouble() ?? 0));

  ReceiptData _buildReceiptData(Map<String, dynamic> order) {
    final items = List<Map<String, dynamic>>.from(order['order_items'] ?? []);
    final payments = List<Map<String, dynamic>>.from(order['payments'] ?? []);
    final createdAt = DateTime.tryParse(order['created_at']?.toString() ?? '') ?? DateTime.now();
    final tableName = order['tables']?['name'];
    final total = (order['total_amount'] as num?)?.toDouble() ?? 0;
    final method = payments.isNotEmpty ? payments.first['method']?.toString() ?? '-' : '-';
    final paidAmount = payments.fold<double>(0, (s, p) => s + ((p['amount'] as num?)?.toDouble() ?? 0));

    return ReceiptData(
      storeName: _storeName,
      storeAddress: _storeAddress,
      storePhone: _storePhone,
      orderNumber: order['order_number']?.toString() ?? '-',
      cashierName: '-',
      orderType: order['notes']?.toString() ?? order['channel']?.toString() ?? '-',
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
      grandTotal: total,
      paymentMethod: method,
      amountTendered: paidAmount > 0 ? paidAmount : total,
      change: 0,
      footerNote: '-- Salinan Nota --',
    );
  }

  Future<void> _reprint(Map<String, dynamic> order) async {
    try {
      final data = _buildReceiptData(order);
      final results = await PrinterService.printReceiptToAllAssigned(data);
      if (!mounted) return;
      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Belum ada printer nota terpasang.')),
        );
        return;
      }
      final failed = results.where((r) => !r.success).toList();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(failed.isEmpty ? 'Nota berhasil dicetak ulang.' : 'Sebagian gagal: ${failed.map((f) => f.printer.name).join(', ')}'),
          backgroundColor: failed.isEmpty ? Colors.green : Colors.orange,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mencetak: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _openDetail(Map<String, dynamic> order) {
    final items = List<Map<String, dynamic>>.from(order['order_items'] ?? []);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)),
                ),
              ),
              Text(
                order['order_number']?.toString() ?? '-',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: _navy),
              ),
              Text(
                DateFormat('EEE, dd MMM yyyy • HH:mm').format(
                  (DateTime.tryParse(order['created_at']?.toString() ?? '') ?? DateTime.now()).toLocal(),
                ),
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
              const Divider(height: 28),
              ...items.map((it) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Text('${it['qty']}x', style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(width: 8),
                        Expanded(child: Text(it['products']?['name']?.toString() ?? 'Item')),
                        Text(_currencyFormat.format((it['subtotal'] as num?)?.toDouble() ?? 0)),
                      ],
                    ),
                  )),
              const Divider(height: 28),
              _detailRow('Subtotal', (order['subtotal'] as num?)?.toDouble() ?? 0),
              _detailRow('Diskon', -((order['discount_amount'] as num?)?.toDouble() ?? 0)),
              _detailRow('Pajak', (order['tax_amount'] as num?)?.toDouble() ?? 0),
              const Divider(height: 20),
              _detailRow('TOTAL', (order['total_amount'] as num?)?.toDouble() ?? 0, bold: true),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _navy,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => _reprint(order),
                  icon: const Icon(Icons.print, color: Colors.white, size: 18),
                  label: const Text('Cetak Ulang Nota', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, double value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w900 : FontWeight.w600, fontSize: bold ? 16 : 13)),
          Text(
            _currencyFormat.format(value),
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: bold ? 18 : 13, color: bold ? _cyan : _navy),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
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
                    child: Text('Riwayat Transaksi', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: _navy)),
                  ),
                  IconButton(icon: const Icon(Icons.refresh, color: _navy), onPressed: _fetchOrders),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                children: [
                  ChoiceChip(
                    label: const Text('Shift Ini'),
                    selected: _shiftOnly,
                    selectedColor: _navy,
                    labelStyle: TextStyle(color: _shiftOnly ? Colors.white : _navy, fontWeight: FontWeight.bold),
                    onSelected: (_) {
                      setState(() => _shiftOnly = true);
                      _fetchOrders();
                    },
                  ),
                  ChoiceChip(
                    label: const Text('Hari Ini'),
                    selected: !_shiftOnly,
                    selectedColor: _navy,
                    labelStyle: TextStyle(color: !_shiftOnly ? Colors.white : _navy, fontWeight: FontWeight.bold),
                    onSelected: (_) {
                      setState(() => _shiftOnly = false);
                      _fetchOrders();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (!_isLoading && _errorMsg == null)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [_navy, Color(0xFF1E3A70)]),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${_orders.length} Transaksi', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      Text(
                        _currencyFormat.format(_totalRevenue),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              Expanded(child: _buildBody()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) return const Center(child: CircularProgressIndicator(color: _cyan));
    if (_errorMsg != null) return Center(child: Text(_errorMsg!, style: const TextStyle(color: Colors.red)));
    if (_orders.isEmpty) {
      return LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.receipt_long, size: 72, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text('Belum ada transaksi.', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchOrders,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _orders.length,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final order = _orders[index];
          final createdAt = DateTime.tryParse(order['created_at']?.toString() ?? '');
          final isCancelled = order['status'] == 'cancelled';

          return InkWell(
            onTap: () => _openDetail(order),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: (isCancelled ? Colors.red : _cyan).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      isCancelled ? Icons.cancel_outlined : Icons.receipt,
                      color: isCancelled ? Colors.red : _cyan,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          order['order_number']?.toString() ?? '-',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: _navy),
                        ),
                        if (createdAt != null)
                          Text(
                            DateFormat('dd MMM • HH:mm').format(createdAt.toLocal()),
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 11),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        _currencyFormat.format((order['total_amount'] as num?)?.toDouble() ?? 0),
                        style: const TextStyle(fontWeight: FontWeight.w900, color: _navy, fontSize: 13),
                      ),
                      const SizedBox(height: 4),
                      IconButton(
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.print, size: 18, color: _cyan),
                        onPressed: () => _reprint(order),
                      ),
                    ],
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
