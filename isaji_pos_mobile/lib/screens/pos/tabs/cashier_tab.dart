import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../../../utils/printer_helper.dart';
import '../../../services/printer_service.dart';

class CartItem {
  final String menuId;
  final String name;
  final double price;
  int qty;

  CartItem({
    required this.menuId,
    required this.name,
    required this.price,
    this.qty = 1,
  });
  double get subtotal => price * qty;
}

class CashierTab extends StatefulWidget {
  const CashierTab({super.key});
  @override
  State<CashierTab> createState() => _CashierTabState();
}

class _CashierTabState extends State<CashierTab> {
  final supabase = Supabase.instance.client;

  List<Map<String, dynamic>> _menus = [];
  List<String> _categories = [];
  final List<CartItem> _cart = [];

  String? _selectedCategory;
  bool _isLoading = true;
  String _searchQuery = '';
  String _branchId = '';
  String _empName = 'Kasir';
  String _orderType = 'Dine In';
  String _storeName = 'ISAJI POS';
  String? _storeAddress;
  String? _storePhone;

  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _loadSessionAndData();
  }

  Future<void> _loadSessionAndData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _branchId = prefs.getString('branch_id') ?? '';
      _empName = prefs.getString('emp_name') ?? 'Kasir';
    });
    await Future.wait([_fetchMenus(), _fetchBranchInfo()]);
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
    } catch (e) {
      debugPrint('Gagal ambil info cabang: $e');
    }
  }

  Future<void> _fetchMenus() async {
    setState(() => _isLoading = true);
    try {
      final res = await supabase
          .from('menus')
          .select('*')
          .eq('branch_id', _branchId);
      final List<String> extractedCategories = [];
      for (var item in res) {
        final cat = item['category']?.toString() ?? 'Lainnya';
        if (!extractedCategories.contains(cat)) extractedCategories.add(cat);
      }
      setState(() {
        _menus = List<Map<String, dynamic>>.from(res);
        _categories = extractedCategories;
      });
    } catch (e) {
      debugPrint("Gagal load menu: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _addToCart(Map<String, dynamic> menu) {
    setState(() {
      final index = _cart.indexWhere((item) => item.menuId == menu['id']);
      if (index >= 0) {
        _cart[index].qty++;
      } else {
        _cart.add(
          CartItem(
            menuId: menu['id'],
            name: menu['name'],
            price: (menu['price'] as num).toDouble(),
          ),
        );
      }
    });
  }

  void _updateQty(int index, int delta) {
    setState(() {
      _cart[index].qty += delta;
      if (_cart[index].qty <= 0) _cart.removeAt(index);
    });
  }

  double get _subtotal => _cart.fold(0, (sum, item) => sum + item.subtotal);
  double get _tax => _subtotal * 0.10;
  double get _grandTotal => _subtotal + _tax;

  /// Validasi stok terkini ke server sebelum transaksi diproses, supaya
  /// tidak terjadi over-sell jika stok sudah berubah sejak menu dimuat
  /// (misal karena transaksi lain / kasir lain).
  Future<String?> _validateStockBeforeCheckout() async {
    if (_cart.isEmpty) return 'Keranjang masih kosong.';
    try {
      final ids = _cart.map((e) => e.menuId).toList();
      final res = await supabase
          .from('menus')
          .select('id, name, stock')
          .inFilter('id', ids);
      final latest = {
        for (var m in res) m['id']: (m['stock'] as num?)?.toInt() ?? 0,
      };
      for (final item in _cart) {
        final stock = latest[item.menuId];
        if (stock == null) return '${item.name} tidak ditemukan di menu.';
        if (stock < item.qty) {
          return 'Stok ${item.name} tersisa $stock, tapi pesanan ${item.qty}.';
        }
      }
      return null;
    } catch (e) {
      return 'Gagal memvalidasi stok: $e';
    }
  }

  Future<void> _processTransaction(
    String paymentMethod,
    double amountTendered,
  ) async {
    final stockError = await _validateStockBeforeCheckout();
    if (stockError != null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(stockError), backgroundColor: Colors.red),
      );
      return;
    }

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF00B4D8)),
      ),
    );

    try {
      final prefs = await SharedPreferences.getInstance();
      final orgId = prefs.getString('org_id');
      final empId = prefs.getString('emp_id');
      final shiftId = prefs.getString('shift_id');

      final timestamp = DateTime.now();
      final orderNumber =
          'ORD-${timestamp.year}${timestamp.month.toString().padLeft(2, '0')}${timestamp.day.toString().padLeft(2, '0')}-${timestamp.millisecondsSinceEpoch.toString().substring(8)}';

      final orderResponse = await supabase
          .from('orders')
          .insert({
            'organization_id': orgId,
            'branch_id': _branchId,
            'order_number': orderNumber,
            'channel': 'pos',
            'status': 'completed',
            'payment_status': 'paid',
            'subtotal': _subtotal,
            'discount_amount': 0,
            'tax_amount': _tax,
            'service_charge': 0,
            'total_amount': _grandTotal,
            'cashier_id': empId,
            'shift_id': shiftId,
            'notes': _orderType,
          })
          .select('id')
          .single();

      final String orderId = orderResponse['id'];

      for (var item in _cart) {
        await supabase.from('order_items').insert({
          'order_id': orderId,
          'product_id': item.menuId,
          'qty': item.qty,
          'unit_price': item.price,
          'subtotal': item.subtotal,
        });
        try {
          final currentMenu = _menus.firstWhere((m) => m['id'] == item.menuId);
          final currentStock = (currentMenu['stock'] as num?)?.toInt() ?? 0;
          await supabase
              .from('menus')
              .update({'stock': currentStock - item.qty})
              .eq('id', item.menuId);
        } catch (e) {
          debugPrint('Gagal update stok: $e');
        }
      }

      await supabase.from('payments').insert({
        'order_id': orderId,
        'method': paymentMethod,
        'amount': _grandTotal,
        'received_by': empId,
      });

      if (!mounted) return;
      Navigator.pop(context);

      final double change =
          (paymentMethod == 'cash' && amountTendered > _grandTotal)
          ? amountTendered - _grandTotal
          : 0.0;

      final receiptData = ReceiptData(
        storeName: _storeName,
        storeAddress: _storeAddress,
        storePhone: _storePhone,
        orderNumber: orderNumber,
        cashierName: _empName,
        orderType: _orderType,
        dateTime: timestamp,
        items: _cart
            .map(
              (e) => ReceiptLineItem(
                name: e.name,
                qty: e.qty,
                price: e.price,
                subtotal: e.subtotal,
              ),
            )
            .toList(),
        subtotal: _subtotal,
        tax: _tax,
        grandTotal: _grandTotal,
        paymentMethod: paymentMethod,
        amountTendered: paymentMethod == 'cash' ? amountTendered : _grandTotal,
        change: change,
      );

      // Cetak otomatis ke semua printer nota & tiket dapur yang terpasang.
      // Kegagalan cetak tidak membatalkan transaksi (nota tetap bisa
      // dicetak ulang kapan saja lewat Riwayat / Pesanan Aktif).
      try {
        await PrinterService.printReceiptToAllAssigned(receiptData);
        await PrinterService.printKitchenTicketToAllAssigned(receiptData);
      } catch (e) {
        debugPrint('Gagal mencetak otomatis: $e');
      }

      _showSuccessDialog(orderNumber, change, receiptData);
      _fetchMenus();
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal Transaksi: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Mencetak "Bill" sementara (belum bayar) — berguna saat pelanggan
  /// ingin melihat rincian pesanan dulu sebelum benar-benar membayar.
  Future<void> _printPreBill() async {
    final now = DateTime.now();
    final data = ReceiptData(
      storeName: _storeName,
      storeAddress: _storeAddress,
      storePhone: _storePhone,
      orderNumber: 'BILL-SEMENTARA',
      cashierName: _empName,
      orderType: _orderType,
      dateTime: now,
      items: _cart
          .map(
            (e) => ReceiptLineItem(
              name: e.name,
              qty: e.qty,
              price: e.price,
              subtotal: e.subtotal,
            ),
          )
          .toList(),
      subtotal: _subtotal,
      tax: _tax,
      grandTotal: _grandTotal,
      paymentMethod: 'BELUM BAYAR',
      amountTendered: 0,
      change: 0,
      footerNote: 'Ini bukan struk pembayaran resmi',
    );
    try {
      final results = await PrinterService.printReceiptToAllAssigned(data);
      if (!mounted) return;
      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Belum ada printer nota terpasang. Atur di menu Setting.',
            ),
          ),
        );
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bill berhasil dicetak.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mencetak: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showPaymentDialog() {
    String selectedMethod = 'cash';
    TextEditingController cashController = TextEditingController(
      text: _grandTotal.toStringAsFixed(0),
    );

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              title: const Text(
                'Pembayaran',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F2040),
                ),
              ),
              content: SizedBox(
                width: 450,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00B4D8).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          const Text(
                            'Total Tagihan',
                            style: TextStyle(
                              color: Color(0xFF0F2040),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _currencyFormat.format(_grandTotal),
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF00B4D8),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    SegmentedButton<String>(
                      style: SegmentedButton.styleFrom(
                        backgroundColor: Colors.white,
                        selectedForegroundColor: Colors.white,
                        selectedBackgroundColor: const Color(0xFF0F2040),
                      ),
                      segments: const [
                        ButtonSegment(
                          value: 'cash',
                          label: Text('Tunai'),
                          icon: Icon(Icons.payments),
                        ),
                        ButtonSegment(
                          value: 'qris',
                          label: Text('QRIS'),
                          icon: Icon(Icons.qr_code_2),
                        ),
                        ButtonSegment(
                          value: 'debit',
                          label: Text('Debit'),
                          icon: Icon(Icons.credit_card),
                        ),
                      ],
                      selected: {selectedMethod},
                      onSelectionChanged: (Set<String> newSelection) =>
                          setDialogState(
                            () => selectedMethod = newSelection.first,
                          ),
                    ),
                    const SizedBox(height: 24),
                    if (selectedMethod == 'cash') ...[
                      TextField(
                        controller: cashController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Uang Diterima',
                          prefixText: 'Rp ',
                          filled: true,
                          fillColor: Colors.grey.shade50,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(16),
                            borderSide: BorderSide.none,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        alignment: WrapAlignment.center,
                        children: [50000, 100000, 150000, 200000].map((amount) {
                          return OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              side: BorderSide(color: Colors.grey.shade300),
                            ),
                            onPressed: () => setDialogState(
                              () => cashController.text = amount.toString(),
                            ),
                            child: Text(
                              _currencyFormat.format(amount),
                              style: const TextStyle(color: Color(0xFF0F2040)),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              actionsPadding: const EdgeInsets.all(24),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Batal',
                    style: TextStyle(
                      color: Colors.grey,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F2040),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    final amountTendered =
                        double.tryParse(cashController.text) ?? 0;
                    if (selectedMethod == 'cash' &&
                        amountTendered < _grandTotal) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Uang yang diterima kurang!'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }
                    Navigator.pop(context);
                    _processTransaction(selectedMethod, amountTendered);
                  },
                  child: const Text(
                    'Proses Pembayaran',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _manualReprint(ReceiptData data) async {
    try {
      final results = await PrinterService.printReceiptToAllAssigned(data);
      if (!mounted) return;
      if (results.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Belum ada printer nota terpasang. Atur di menu Setting.',
            ),
          ),
        );
        return;
      }
      final failed = results.where((r) => !r.success).toList();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            failed.isEmpty
                ? 'Nota berhasil dicetak ulang.'
                : 'Sebagian printer gagal: ${failed.map((f) => f.printer.name).join(', ')}',
          ),
          backgroundColor: failed.isEmpty ? Colors.green : Colors.orange,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal mencetak: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showSuccessDialog(
    String orderNumber,
    double change,
    ReceiptData receiptData,
  ) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check_circle,
                color: Colors.green,
                size: 64,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Transaksi Berhasil!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F2040),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No: $orderNumber',
              style: const TextStyle(color: Colors.grey),
            ),
            if (change > 0) ...[
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Divider(),
              ),
              const Text(
                'Uang Kembali',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _currencyFormat.format(change),
                style: const TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w900,
                  color: Colors.redAccent,
                ),
              ),
            ],
          ],
        ),
        actionsPadding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        actions: [
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFF0F2040)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () => _manualReprint(receiptData),
              icon: const Icon(Icons.print, color: Color(0xFF0F2040), size: 18),
              label: const Text(
                'Cetak Ulang Nota',
                style: TextStyle(
                  color: Color(0xFF0F2040),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00B4D8),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              onPressed: () {
                setState(() => _cart.clear());
                Navigator.pop(context);
              },
              child: const Text(
                'Pesanan Baru',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizingInfo) {
        // DETEKSI LANDSCAPE (Mendatar) atau perangkat besar
        bool isLandscape =
            MediaQuery.of(context).orientation == Orientation.landscape;
        bool isLargeScreen =
            sizingInfo.deviceScreenType != DeviceScreenType.mobile ||
            isLandscape;

        return Scaffold(
          backgroundColor: const Color(0xFFF4F7FE),
          body: isLargeScreen
              ? Row(
                  children: [
                    // PANEL TENGAH: Menu Restoran (Flex 6.5)
                    Expanded(
                      flex: 65,
                      child: _buildProductSection(isLargeScreen),
                    ),
                    Container(width: 1, color: Colors.grey.shade300),
                    // PANEL KANAN: Rincian Pesanan & Bayar (Flex 3.5)
                    Expanded(flex: 35, child: _buildCartSection(isLargeScreen)),
                  ],
                )
              : Stack(
                  children: [
                    _buildProductSection(isLargeScreen),
                    if (_cart.isNotEmpty)
                      Positioned(
                        bottom: 0,
                        left: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 20,
                                offset: const Offset(0, -5),
                              ),
                            ],
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(32),
                            ),
                          ),
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F2040),
                              padding: const EdgeInsets.symmetric(vertical: 20),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed: () {
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (context) => Container(
                                  height:
                                      MediaQuery.of(context).size.height * 0.85,
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.vertical(
                                      top: Radius.circular(32),
                                    ),
                                  ),
                                  child: _buildCartSection(false),
                                ),
                              );
                            },
                            child: Text(
                              'Lihat Pesanan (${_cart.length}) - ${_currencyFormat.format(_grandTotal)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w900,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildProductSection(bool isLandscape) {
    final filteredMenus = _menus.where((m) {
      final matchesSearch = m['name'].toString().toLowerCase().contains(
        _searchQuery.toLowerCase(),
      );
      final matchesCategory =
          _selectedCategory == null || m['category'] == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(20, isLandscape ? 16 : 24, 20, 10),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: 'Cari menu...',
                    hintStyle: TextStyle(color: Colors.grey.shade400),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              if (isLandscape) ...[
                const SizedBox(width: 20),
                Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          _empName,
                          style: const TextStyle(
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F2040),
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          'Kasir',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(
                        0xFF00B4D8,
                      ).withValues(alpha: 0.2),
                      child: Text(
                        _empName[0].toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFF0F2040),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Kategori',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F2040),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 85,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            children: [
              _buildCategorySquare(
                title: 'Semua',
                isSelected: _selectedCategory == null,
                onTap: () => setState(() => _selectedCategory = null),
              ),
              ..._categories.map(
                (cat) => _buildCategorySquare(
                  title: cat,
                  isSelected: _selectedCategory == cat,
                  onTap: () => setState(() => _selectedCategory = cat),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Text(
            'Spesial Untuk Anda',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Color(0xFF0F2040),
            ),
          ),
        ),

        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFF00B4D8)),
                )
              : filteredMenus.isEmpty
              ? const Center(
                  child: Text(
                    "Menu tidak ditemukan.",
                    style: TextStyle(color: Colors.grey),
                  ),
                )
              : GridView.builder(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    10,
                    20,
                    isLandscape ? 20 : 120,
                  ),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 180, // Ukuran card proporsional
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: filteredMenus.length,
                  itemBuilder: (context, index) {
                    final menu = filteredMenus[index];
                    final String? imageUrl = menu['image_url'];
                    final int stock = (menu['stock'] as num?)?.toInt() ?? 0;
                    final bool isOutOfStock = stock <= 0;

                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade100),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(16),
                                  ),
                                  child: SizedBox(
                                    width: double.infinity,
                                    height: double.infinity,
                                    child:
                                        imageUrl != null && imageUrl.isNotEmpty
                                        ? Image.network(
                                            imageUrl,
                                            fit: BoxFit.cover,
                                            errorBuilder: (ctx, err, stack) =>
                                                _buildPlaceholderImage(),
                                          )
                                        : _buildPlaceholderImage(),
                                  ),
                                ),
                                if (isOutOfStock)
                                  Container(
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(
                                        alpha: 0.7,
                                      ),
                                      borderRadius: const BorderRadius.vertical(
                                        top: Radius.circular(16),
                                      ),
                                    ),
                                    child: const Center(
                                      child: Text(
                                        'HABIS',
                                        style: TextStyle(
                                          color: Colors.red,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Column(
                              children: [
                                Text(
                                  menu['name'],
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 12,
                                    color: isOutOfStock
                                        ? Colors.grey
                                        : const Color(0xFF0F2040),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    _currencyFormat.format(
                                      (menu['price'] as num).toDouble(),
                                    ),
                                    style: TextStyle(
                                      color: isOutOfStock
                                          ? Colors.grey
                                          : const Color(0xFF00B4D8),
                                      fontWeight: FontWeight.w900,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  height: 32,
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isOutOfStock
                                          ? Colors.grey.shade300
                                          : const Color(0xFF16A34A),
                                      elevation: 0,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    onPressed: isOutOfStock
                                        ? null
                                        : () => _addToCart(menu),
                                    child: const Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.add,
                                          color: Colors.white,
                                          size: 14,
                                        ),
                                        SizedBox(width: 4),
                                        Text(
                                          'ADD',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 11,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildCategorySquare({
    required String title,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF00B4D8).withValues(alpha: 0.1)
              : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF00B4D8) : Colors.grey.shade200,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.fastfood,
              color: isSelected
                  ? const Color(0xFF00B4D8)
                  : Colors.grey.shade600,
              size: 24,
            ),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: isSelected
                    ? const Color(0xFF0F2040)
                    : Colors.grey.shade600,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholderImage() {
    return Container(
      color: Colors.grey.shade100,
      child: Center(
        child: Icon(
          Icons.restaurant_menu,
          color: Colors.grey.shade300,
          size: 32,
        ),
      ),
    );
  }

  Widget _buildCartSection(bool isLandscape) {
    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Order Details',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F2040),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  DateFormat('EEE, dd MMM yyyy • HH:mm').format(DateTime.now()),
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: SegmentedButton<String>(
              style: SegmentedButton.styleFrom(
                backgroundColor: Colors.white,
                selectedForegroundColor: const Color(0xFF00B4D8),
                selectedBackgroundColor: const Color(
                  0xFF00B4D8,
                ).withValues(alpha: 0.1),
                side: BorderSide(color: Colors.grey.shade300),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              segments: const [
                ButtonSegment(
                  value: 'Dine In',
                  label: Text('Dine In', style: TextStyle(fontSize: 12)),
                ),
                ButtonSegment(
                  value: 'Takeout',
                  label: Text('Takeout', style: TextStyle(fontSize: 12)),
                ),
              ],
              selected: {_orderType},
              onSelectionChanged: (Set<String> newSelection) =>
                  setState(() => _orderType = newSelection.first),
            ),
          ),
          const SizedBox(height: 12),
          const Divider(),

          Expanded(
            child: _cart.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.remove_shopping_cart_outlined,
                          size: 50,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Belum ada pesanan',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    itemCount: _cart.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final item = _cart[index];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 13,
                                    color: Color(0xFF0F2040),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _currencyFormat.format(item.price),
                                  style: const TextStyle(
                                    color: Color(0xFF00B4D8),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey.shade200),
                            ),
                            child: Row(
                              children: [
                                IconButton(
                                  icon: Icon(
                                    Icons.remove,
                                    color: Colors.grey.shade600,
                                    size: 18,
                                  ),
                                  onPressed: () => _updateQty(index, -1),
                                  constraints: const BoxConstraints(
                                    minWidth: 30,
                                    minHeight: 30,
                                  ),
                                  padding: EdgeInsets.zero,
                                ),
                                Text(
                                  '${item.qty}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 13,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.add,
                                    color: Color(0xFF00B4D8),
                                    size: 18,
                                  ),
                                  onPressed: () => _updateQty(index, 1),
                                  constraints: const BoxConstraints(
                                    minWidth: 30,
                                    minHeight: 30,
                                  ),
                                  padding: EdgeInsets.zero,
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          Container(
            padding: EdgeInsets.all(isLandscape ? 16 : 20),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              border: Border(top: BorderSide(color: Colors.grey.shade200)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Sub Total',
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_subtotal),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F2040),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Tax (10%)',
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_tax),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F2040),
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 10),
                    child: Divider(height: 1),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          color: Color(0xFF0F2040),
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_grandTotal),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 20,
                          color: Color(0xFF00B4D8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: const BorderSide(color: Color(0xFF00B4D8)),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: _cart.isEmpty ? null : _printPreBill,
                          icon: const Icon(
                            Icons.print,
                            size: 16,
                            color: Color(0xFF00B4D8),
                          ),
                          label: const Text(
                            'Cetak Bill',
                            style: TextStyle(
                              color: Color(0xFF00B4D8),
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F2040),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            elevation: 0,
                          ),
                          onPressed: _cart.isEmpty ? null : _showPaymentDialog,
                          child: Text(
                            'Charge ${_currencyFormat.format(_grandTotal)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
