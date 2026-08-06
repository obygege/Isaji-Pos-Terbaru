import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../utils/printer_helper.dart';

class CartItem {
  final String productId;
  final String name;
  final double price;
  int qty;

  CartItem({
    required this.productId,
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
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _categories = [];
  final List<CartItem> _cart = [];

  String? _selectedCategory;
  bool _isLoading = true;
  String _searchQuery = '';
  String _branchId = '';

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

    await Future.wait([_fetchCategories(), _fetchProducts()]);
  }

  Future<void> _fetchCategories() async {
    final res = await supabase.from('product_categories').select('*');
    if (res.isNotEmpty) {
      setState(() {
        _categories = List<Map<String, dynamic>>.from(res);
      });
    }
  }

  Future<void> _fetchProducts() async {
    setState(() => _isLoading = true);
    var query = supabase.from('products').select('*').eq('is_active', true);

    if (_selectedCategory != null) {
      query = query.eq('category_id', _selectedCategory!);
    }

    final res = await query;
    setState(() {
      _products = List<Map<String, dynamic>>.from(res);
      _isLoading = false;
    });
  }

  void _addToCart(Map<String, dynamic> product) {
    setState(() {
      final index = _cart.indexWhere((item) => item.productId == product['id']);
      if (index >= 0) {
        _cart[index].qty++;
      } else {
        _cart.add(
          CartItem(
            productId: product['id'],
            name: product['name'],
            price: (product['base_price'] as num).toDouble(),
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

  // FITUR MAJOO KILLER: Proses Transaksi, Potong Stok Otomatis, & Cetak Struk
  Future<void> _processTransaction(
    String paymentMethod,
    double amountTendered,
  ) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final prefs = await SharedPreferences.getInstance();
      final orgId = prefs.getString('org_id');
      final empId = prefs.getString('emp_id');
      final empName = prefs.getString('emp_name') ?? 'Kasir';

      final timestamp = DateTime.now();
      final orderNumber =
          'ORD-${timestamp.year}${timestamp.month.toString().padLeft(2, '0')}${timestamp.day.toString().padLeft(2, '0')}-${timestamp.millisecondsSinceEpoch.toString().substring(8)}';

      // 1. Simpan Order
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
            'tax_amount': _tax,
            'total_amount': _grandTotal,
            'cashier_id': empId,
          })
          .select('id')
          .single();

      final String orderId = orderResponse['id'];

      // 2. Simpan Item & Kurangi Stok Resep
      for (var item in _cart) {
        await supabase.from('order_items').insert({
          'order_id': orderId,
          'product_id': item.productId,
          'qty': item.qty,
          'unit_price': item.price,
          'subtotal': item.subtotal,
        });

        // Cek resep
        final recipes = await supabase
            .from('product_recipes')
            .select('ingredient_id, qty_used')
            .eq('product_id', item.productId);

        for (var recipe in recipes) {
          final double totalUsed =
              (recipe['qty_used'] as num).toDouble() * item.qty;

          final currentStockRes = await supabase
              .from('ingredient_stocks')
              .select('id, qty_on_hand')
              .eq('ingredient_id', recipe['ingredient_id'])
              .eq('branch_id', _branchId)
              .maybeSingle();

          if (currentStockRes != null) {
            final double currentQty = (currentStockRes['qty_on_hand'] as num)
                .toDouble();
            await supabase
                .from('ingredient_stocks')
                .update({'qty_on_hand': currentQty - totalUsed})
                .eq('id', currentStockRes['id']);
          }
        }
      }

      // 3. Simpan Payment
      await supabase.from('payments').insert({
        'order_id': orderId,
        'method': paymentMethod,
        'amount': _grandTotal,
        'received_by': empId,
      });

      if (!mounted) return;
      Navigator.pop(context); // Tutup dialog loading

      final double change =
          (paymentMethod == 'cash' && amountTendered > _grandTotal)
          ? amountTendered - _grandTotal
          : 0.0;

      // 4. TRIGGER CETAK STRUK THERMAL BLUETOOTH
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

      // 5. Tampilkan Modal Sukses
      _showSuccessDialog(orderNumber, change);
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal: $e'), backgroundColor: Colors.red),
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
              title: const Text(
                'Pembayaran',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              content: SizedBox(
                width: 400,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Total Tagihan: Rp ${_grandTotal.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF00B4D8),
                      ),
                    ),
                    const SizedBox(height: 24),

                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(
                          value: 'cash',
                          label: Text('Tunai'),
                          icon: Icon(Icons.money),
                        ),
                        ButtonSegment(
                          value: 'qris',
                          label: Text('QRIS'),
                          icon: Icon(Icons.qr_code),
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
                        decoration: const InputDecoration(
                          labelText: 'Uang Diterima (Rp)',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.payments),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 8,
                        children: [50000, 100000, 150000, 200000].map((amount) {
                          return OutlinedButton(
                            onPressed: () {
                              setDialogState(
                                () => cashController.text = amount.toString(),
                              );
                            },
                            child: Text('Rp $amount'),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text(
                    'Batal',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F2040),
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
                    style: TextStyle(color: Colors.white),
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
            borderRadius: BorderRadius.circular(16),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 80),
              const SizedBox(height: 16),
              const Text(
                'Transaksi Berhasil!',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              Text(
                'No: $orderNumber',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 16),
              if (change > 0) ...[
                const Text('Kembalian:', style: TextStyle(fontSize: 16)),
                Text(
                  'Rp ${change.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.redAccent,
                  ),
                ),
              ],
            ],
          ),
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  setState(() => _cart.clear());
                  Navigator.pop(context);
                },
                child: const Text('Pesanan Baru'),
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

        if (isTabletOrDesktop) {
          return Row(
            children: [
              Expanded(flex: 3, child: _buildProductSection()),
              Container(width: 1, color: Colors.grey.shade200),
              Expanded(flex: 2, child: _buildCartSection()),
            ],
          );
        } else {
          return Stack(
            children: [
              _buildProductSection(),
              if (_cart.isNotEmpty)
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(color: Colors.black12, blurRadius: 10),
                      ],
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F2040),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onPressed: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          builder: (context) => Container(
                            height: MediaQuery.of(context).size.height * 0.75,
                            padding: const EdgeInsets.all(16),
                            child: _buildCartSection(),
                          ),
                        );
                      },
                      child: Text(
                        'Lihat Keranjang (${_cart.length} item) - Rp ${_grandTotal.toStringAsFixed(0)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          );
        }
      },
    );
  }

  Widget _buildProductSection() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'Cari menu atau SKU...',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 40,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: const Text('Semua'),
                        selected: _selectedCategory == null,
                        onSelected: (selected) {
                          setState(() => _selectedCategory = null);
                          _fetchProducts();
                        },
                      ),
                    ),
                    ..._categories.map(
                      (cat) => Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: ChoiceChip(
                          label: Text(cat['name']),
                          selected: _selectedCategory == cat['id'],
                          onSelected: (selected) {
                            setState(
                              () => _selectedCategory = selected
                                  ? cat['id']
                                  : null,
                            );
                            _fetchProducts();
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : GridView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.85,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: _products
                      .where(
                        (p) => p['name'].toLowerCase().contains(
                          _searchQuery.toLowerCase(),
                        ),
                      )
                      .length,
                  itemBuilder: (context, index) {
                    final filteredList = _products
                        .where(
                          (p) => p['name'].toLowerCase().contains(
                            _searchQuery.toLowerCase(),
                          ),
                        )
                        .toList();
                    final product = filteredList[index];

                    return InkWell(
                      onTap: () => _addToCart(product),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade100,
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(16),
                                  ),
                                ),
                                child: const Center(
                                  child: Icon(
                                    Icons.fastfood,
                                    color: Colors.grey,
                                  ),
                                ),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(10.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    product['name'],
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Rp ${(product['base_price'] as num).toStringAsFixed(0)}',
                                    style: const TextStyle(
                                      color: Color(0xFF00B4D8),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
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

  Widget _buildCartSection() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Keranjang Pesanan',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const Divider(),
          Expanded(
            child: _cart.isEmpty
                ? const Center(
                    child: Text(
                      'Belum ada item dipilih',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    itemCount: _cart.length,
                    itemBuilder: (context, index) {
                      final item = _cart[index];
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          item.name,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          'Rp ${item.price.toStringAsFixed(0)} x ${item.qty}',
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline),
                              onPressed: () => _updateQty(index, -1),
                            ),
                            Text(
                              '${item.qty}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline),
                              onPressed: () => _updateQty(index, 1),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const Divider(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Subtotal'),
              Text('Rp ${_subtotal.toStringAsFixed(0)}'),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Pajak (PB1 10%)'),
              Text('Rp ${_tax.toStringAsFixed(0)}'),
            ],
          ),
          const Divider(),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              Text(
                'Rp ${_grandTotal.toStringAsFixed(0)}',
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                  color: Color(0xFF00B4D8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00B4D8),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: _cart.isEmpty ? null : _showPaymentDialog,
              child: const Text(
                'Bayar Sekarang',
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
}
