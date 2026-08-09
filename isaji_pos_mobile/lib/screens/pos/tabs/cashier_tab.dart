import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import '../../../utils/printer_helper.dart';

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
    });

    await _fetchMenus();
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
        if (!extractedCategories.contains(cat)) {
          extractedCategories.add(cat);
        }
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
      if (_cart[index].qty <= 0) {
        _cart.removeAt(index);
      }
    });
  }

  double get _subtotal => _cart.fold(0, (sum, item) => sum + item.subtotal);
  double get _tax => _subtotal * 0.10;
  double get _grandTotal => _subtotal + _tax;

  Future<void> _processTransaction(
    String paymentMethod,
    double amountTendered,
  ) async {
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
      final empName = prefs.getString('emp_name') ?? 'Kasir';

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
          debugPrint('Gagal potong stok menu: $e');
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

      try {
        await PrinterHelper.printReceipt(
          orderNumber: orderNumber,
          cashierName: empName,
          cart: _cart,
          subtotal: _subtotal,
          tax: _tax,
          grandTotal: _grandTotal,
          amountTendered: paymentMethod == 'cash'
              ? amountTendered
              : _grandTotal,
          change: change,
          paymentMethod: paymentMethod,
        );
      } catch (e) {
        debugPrint("Gagal cetak struk: $e");
      }

      _showSuccessDialog(orderNumber, change);
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
                      onSelectionChanged: (Set<String> newSelection) {
                        setDialogState(
                          () => selectedMethod = newSelection.first,
                        );
                      },
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
                            onPressed: () {
                              setDialogState(
                                () => cashController.text = amount.toString(),
                              );
                            },
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

  void _showSuccessDialog(String orderNumber, double change) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
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
          actionsPadding: const EdgeInsets.all(24),
          actions: [
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
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, sizingInfo) {
        bool isTabletOrDesktop =
            sizingInfo.deviceScreenType != DeviceScreenType.mobile;

        return Scaffold(
          backgroundColor: const Color(0xFFF4F7FE),
          body: isTabletOrDesktop
              ? Row(
                  children: [
                    Expanded(flex: 13, child: _buildProductSection()),
                    Container(width: 1, color: Colors.grey.shade300),
                    Expanded(flex: 7, child: _buildCartSection()),
                  ],
                )
              : Stack(
                  children: [
                    _buildProductSection(),
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
                                  child: _buildCartSection(),
                                ),
                              );
                            },
                            child: Text(
                              'Keranjang (${_cart.length}) - ${_currencyFormat.format(_grandTotal)}',
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

  Widget _buildProductSection() {
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
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Menu Restoran',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F2040),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'Cari nama menu...',
                  hintStyle: TextStyle(color: Colors.grey.shade400),
                  prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: const Text(
                          'Semua',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        selected: _selectedCategory == null,
                        selectedColor: const Color(0xFF0F2040),
                        labelStyle: TextStyle(
                          color: _selectedCategory == null
                              ? Colors.white
                              : Colors.black87,
                        ),
                        backgroundColor: Colors.white,
                        side: BorderSide.none,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        onSelected: (selected) {
                          setState(() => _selectedCategory = null);
                        },
                      ),
                    ),
                    ..._categories.map(
                      (cat) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(
                            cat,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          selected: _selectedCategory == cat,
                          selectedColor: const Color(0xFF0F2040),
                          labelStyle: TextStyle(
                            color: _selectedCategory == cat
                                ? Colors.white
                                : Colors.black87,
                          ),
                          backgroundColor: Colors.white,
                          side: BorderSide.none,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          onSelected: (selected) {
                            setState(
                              () => _selectedCategory = selected ? cat : null,
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
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
                    "Belum ada menu di kategori ini.",
                    style: TextStyle(color: Colors.grey),
                  ),
                )
              : GridView.builder(
                  // PENTING: Padding bottom 120 agar item paling bawah tidak tertutup keranjang
                  padding: const EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 10,
                    bottom: 120,
                  ),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 180,
                    childAspectRatio:
                        0.62, // PERBAIKAN: Rasio dipanjangkan agar teks tidak bocor
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: filteredMenus.length,
                  itemBuilder: (context, index) {
                    final menu = filteredMenus[index];
                    final String? imageUrl = menu['image_url'];
                    final int stock = (menu['stock'] as num?)?.toInt() ?? 0;

                    return InkWell(
                      onTap: stock > 0 ? () => _addToCart(menu) : null,
                      borderRadius: BorderRadius.circular(20),
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
                          border: stock <= 0
                              ? Border.all(color: Colors.red.shade100, width: 2)
                              : null,
                        ),
                        child: Stack(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Expanded(
                                  flex: 5, // Porsi gambar
                                  child: ClipRRect(
                                    borderRadius: const BorderRadius.vertical(
                                      top: Radius.circular(20),
                                    ),
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
                                Expanded(
                                  flex: 4, // Porsi teks lebih lega sekarang
                                  child: Padding(
                                    padding: const EdgeInsets.all(
                                      10.0,
                                    ), // Padding dikurangi sedikit
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          menu['name'],
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                            color: stock > 0
                                                ? const Color(0xFF0F2040)
                                                : Colors.grey,
                                          ),
                                        ),
                                        Text(
                                          _currencyFormat.format(
                                            (menu['price'] as num).toDouble(),
                                          ),
                                          style: TextStyle(
                                            color: stock > 0
                                                ? const Color(0xFF00B4D8)
                                                : Colors.grey,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: stock > 0
                                      ? Colors.black.withValues(alpha: 0.6)
                                      : Colors.red,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  stock > 0 ? 'Stok: $stock' : 'Habis',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderImage() {
    return Container(
      color: Colors.grey.shade100,
      child: Center(
        child: Icon(
          Icons.fastfood_rounded,
          color: Colors.grey.shade300,
          size: 40,
        ),
      ),
    );
  }

  Widget _buildCartSection() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.shopping_bag_outlined,
                  color: Color(0xFF0F2040),
                  size: 28,
                ),
                const SizedBox(width: 12),
                const Text(
                  'Keranjang',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF0F2040),
                  ),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00B4D8).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '${_cart.length} Item',
                    style: const TextStyle(
                      color: Color(0xFF00B4D8),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _cart.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.remove_shopping_cart_outlined,
                          size: 64,
                          color: Colors.grey.shade300,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Belum ada pesanan',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(24),
                    itemCount: _cart.length,
                    separatorBuilder: (context, index) =>
                        const Divider(height: 32),
                    itemBuilder: (context, index) {
                      final item = _cart[index];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                    color: Color(0xFF0F2040),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  _currencyFormat.format(item.price),
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Row(
                            children: [
                              IconButton(
                                icon: Icon(
                                  Icons.remove_circle_outline,
                                  color: Colors.grey.shade400,
                                ),
                                onPressed: () => _updateQty(index, -1),
                              ),
                              SizedBox(
                                width: 30,
                                child: Text(
                                  '${item.qty}',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(
                                  Icons.add_circle,
                                  color: Color(0xFF00B4D8),
                                ),
                                onPressed: () => _updateQty(index, 1),
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, -10),
                ),
              ],
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(32),
              ),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Subtotal',
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_subtotal),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F2040),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PB1 (10%)',
                        style: TextStyle(
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_tax),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F2040),
                        ),
                      ),
                    ],
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Divider(height: 1),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'TOTAL',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                          color: Color(0xFF0F2040),
                        ),
                      ),
                      Text(
                        _currencyFormat.format(_grandTotal),
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 24,
                          color: Color(0xFF00B4D8),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F2040),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      onPressed: _cart.isEmpty ? null : _showPaymentDialog,
                      child: const Text(
                        'BAYAR SEKARANG',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
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
