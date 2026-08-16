import 'package:flutter/material.dart';
import 'package:responsive_builder/responsive_builder.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ValidationTab extends StatefulWidget {
  const ValidationTab({super.key});

  @override
  State<ValidationTab> createState() => _ValidationTabState();
}

class _ValidationTabState extends State<ValidationTab> {
  final supabase = Supabase.instance.client;
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'id_ID',
    symbol: 'Rp ',
    decimalDigits: 0,
  );

  String _branchId = '';
  String? _empId;
  bool _isLoading = true;
  String? _errorMsg;
  List<Map<String, dynamic>> _pendingVerifications = [];

  @override
  void initState() {
    super.initState();
    _loadSessionAndData();
  }

  Future<void> _loadSessionAndData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _branchId = prefs.getString('branch_id') ?? '';
      _empId = prefs.getString('emp_id');
    });
    await _fetchQueue();
  }

  Future<void> _fetchQueue() async {
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
      // Mengambil data validasi beserta relasi orders dan tables
      final res = await supabase
          .from('payment_verifications')
          .select(
            '*, orders(id, order_number, customer_name, customer_phone, total_amount, table_id, tables(name))',
          )
          .eq('branch_id', _branchId)
          .eq('status', 'pending')
          .order('created_at', ascending: true);

      setState(() {
        _pendingVerifications = List<Map<String, dynamic>>.from(res);
      });
    } catch (e) {
      setState(() => _errorMsg = 'Gagal memuat antrean: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _mapMethodEnum(String? methodType) {
    if (methodType == 'bank_transfer') return 'transfer';
    return 'qris';
  }

  void _showBlockingLoader() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: CircularProgressIndicator(color: Color(0xFF00B4D8)),
      ),
    );
  }

  Future<void> _acceptVerification(Map<String, dynamic> verif) async {
    final order = verif['orders'] as Map<String, dynamic>?;

    // Dialog Konfirmasi
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Terima Pembayaran?',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Pesanan ${order?['order_number'] ?? '-'} akan diteruskan ke dapur/barista.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Batal', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF16A34A),
            ),
            onPressed: () => Navigator.pop(context, true),
            child: const Text(
              'Terima & Proses',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    _showBlockingLoader();
    try {
      final now = DateTime.now().toIso8601String();

      // 1. Update status verifikasi
      await supabase
          .from('payment_verifications')
          .update({
            'status': 'accepted',
            'reviewed_by': _empId,
            'reviewed_at': now,
          })
          .eq('id', verif['id']);

      // 2. Update status order jadi pending (masuk dapur) & paid
      await supabase
          .from('orders')
          .update({
            'status': 'pending',
            'payment_status': 'paid',
            'active_payment_verification_id': verif['id'],
          })
          .eq('id', verif['order_id']);

      // 3. Masukkan ke tabel payments
      await supabase.from('payments').insert({
        'order_id': verif['order_id'],
        'method': _mapMethodEnum(verif['method_type']),
        'amount': verif['amount'],
        'received_by': _empId,
        'payment_verification_id': verif['id'],
      });

      if (!mounted) return;
      Navigator.pop(context); // Tutup loader
      Navigator.pop(context); // Tutup Dialog Bukti

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Pembayaran diterima, pesanan diteruskan ke dapur.'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
      _fetchQueue();
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memproses: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _rejectVerification(Map<String, dynamic> verif) async {
    final reasonController = TextEditingController();
    final order = verif['orders'] as Map<String, dynamic>?;

    final reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Tolak Bukti — ${order?['order_number'] ?? '-'}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Alasan penolakan wajib diisi. Customer akan melihat alasan ini dan bisa upload ulang bukti.',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: reasonController,
              autofocus: true,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Contoh: Nominal tidak sesuai / bukti buram...',
                filled: true,
                fillColor: Colors.grey.shade50,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              if (reasonController.text.trim().isEmpty) return;
              Navigator.pop(context, reasonController.text.trim());
            },
            child: const Text(
              'Tolak Pembayaran',
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );

    if (reason == null || reason.isEmpty) return;

    _showBlockingLoader();
    try {
      final now = DateTime.now().toIso8601String();

      // 1. Update status verifikasi jadi ditolak
      await supabase
          .from('payment_verifications')
          .update({
            'status': 'rejected',
            'rejection_reason': reason,
            'reviewed_by': _empId,
            'reviewed_at': now,
          })
          .eq('id', verif['id']);

      // 2. Update status order jadi rejected agar customer tahu
      await supabase
          .from('orders')
          .update({'payment_status': 'rejected'})
          .eq('id', verif['order_id']);

      if (!mounted) return;
      Navigator.pop(context); // Tutup loader
      Navigator.pop(context); // Tutup Dialog Bukti

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bukti ditolak. Customer diminta upload ulang.'),
          backgroundColor: Colors.orange,
        ),
      );
      _fetchQueue();
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memproses: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showProofDialog(Map<String, dynamic> data) {
    final order = data['orders'] as Map<String, dynamic>?;
    final tableName = order?['tables']?['name'];
    final customerName = order?['customer_name'] ?? 'Guest';
    final orderNumber = order?['order_number'] ?? '-';
    final amount = (data['amount'] as num?)?.toDouble() ?? 0;

    String method = data['method_type'] == 'bank_transfer'
        ? 'Transfer Bank'
        : 'QRIS Manual';
    String time = DateFormat(
      'HH:mm WIB',
    ).format(DateTime.parse(data['created_at']).toLocal());

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: EdgeInsets.zero,
          content: SizedBox(
            width: 450,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header Info
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFF0F2040),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              orderNumber,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              customerName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00B4D8).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF00B4D8)),
                        ),
                        child: Text(
                          _currencyFormat.format(amount),
                          style: const TextStyle(
                            color: Color(0xFF00B4D8),
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Gambar Bukti Transfer
                Container(
                  height: 400,
                  width: double.infinity,
                  color: Colors.grey.shade100,
                  child: InteractiveViewer(
                    child: Image.network(
                      data['proof_url'] ?? '',
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFF00B4D8),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) =>
                          const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.broken_image,
                                  size: 64,
                                  color: Colors.grey,
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Gambar tidak ditemukan',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                    ),
                  ),
                ),

                // Metode & Waktu
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.account_balance_wallet,
                            color: Colors.grey,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            method,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F2040),
                            ),
                          ),
                          if (tableName != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                'Meja $tableName',
                                style: TextStyle(
                                  color: Colors.orange.shade900,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      Text(time, style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),

                // Tombol Aksi
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            side: const BorderSide(
                              color: Colors.redAccent,
                              width: 2,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          onPressed: () => _rejectVerification(data),
                          child: const Text(
                            'Tolak Bukti',
                            style: TextStyle(
                              color: Colors.redAccent,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          onPressed: () => _acceptVerification(data),
                          child: const Text(
                            'Terima & Proses',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
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
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Validasi Pembayaran',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF0F2040),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Cek bukti transfer atau QRIS manual dari pelanggan self-order.',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.refresh,
                          color: Color(0xFF0F2040),
                        ),
                        onPressed: _fetchQueue,
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFF4318FF).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.pending_actions,
                              color: Color(0xFF4318FF),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              '${_pendingVerifications.length} Menunggu',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF4318FF),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF00B4D8),
                      ),
                    )
                  : _errorMsg != null
                  ? Center(
                      child: Text(
                        _errorMsg!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    )
                  : _pendingVerifications.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.verified,
                            size: 80,
                            color: Colors.green.shade200,
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Semua pembayaran sudah divalidasi!',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ResponsiveBuilder(
                      builder: (context, sizingInfo) {
                        int crossAxisCount =
                            sizingInfo.deviceScreenType ==
                                DeviceScreenType.mobile
                            ? 1
                            : 2;
                        if (sizingInfo.deviceScreenType ==
                            DeviceScreenType.desktop)
                          crossAxisCount = 3;

                        return RefreshIndicator(
                          onRefresh: _fetchQueue,
                          child: GridView.builder(
                            padding: const EdgeInsets.all(24),
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: crossAxisCount,
                                  childAspectRatio:
                                      sizingInfo.deviceScreenType ==
                                          DeviceScreenType.mobile
                                      ? 3.5
                                      : 2.5,
                                  crossAxisSpacing: 16,
                                  mainAxisSpacing: 16,
                                ),
                            itemCount: _pendingVerifications.length,
                            itemBuilder: (context, index) {
                              final verif = _pendingVerifications[index];
                              final order =
                                  verif['orders'] as Map<String, dynamic>?;
                              final tableName = order?['tables']?['name'];
                              final customerName =
                                  order?['customer_name'] ?? 'Guest';
                              final orderNumber = order?['order_number'] ?? '-';
                              final amount =
                                  (verif['amount'] as num?)?.toDouble() ?? 0;
                              final method =
                                  verif['method_type'] == 'bank_transfer'
                                  ? 'Transfer Bank'
                                  : 'QRIS';
                              final time = DateFormat('HH:mm').format(
                                DateTime.parse(verif['created_at']).toLocal(),
                              );

                              return InkWell(
                                onTap: () => _showProofDialog(verif),
                                borderRadius: BorderRadius.circular(20),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.03,
                                        ),
                                        blurRadius: 10,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 80,
                                        decoration: BoxDecoration(
                                          color: const Color(
                                            0xFF0F2040,
                                          ).withValues(alpha: 0.05),
                                          borderRadius:
                                              const BorderRadius.horizontal(
                                                left: Radius.circular(20),
                                              ),
                                        ),
                                        child: const Center(
                                          child: Icon(
                                            Icons.image_search,
                                            color: Color(0xFF0F2040),
                                            size: 32,
                                          ),
                                        ),
                                      ),
                                      Expanded(
                                        child: Padding(
                                          padding: const EdgeInsets.all(16.0),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            children: [
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    orderNumber,
                                                    style: TextStyle(
                                                      fontSize: 12,
                                                      color:
                                                          Colors.grey.shade500,
                                                    ),
                                                  ),
                                                  Text(
                                                    time,
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      color: Color(0xFF00B4D8),
                                                      fontWeight:
                                                          FontWeight.bold,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                customerName,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  fontWeight: FontWeight.w800,
                                                  fontSize: 16,
                                                  color: Color(0xFF0F2040),
                                                ),
                                              ),
                                              const Spacer(),
                                              Row(
                                                mainAxisAlignment:
                                                    MainAxisAlignment
                                                        .spaceBetween,
                                                children: [
                                                  Text(
                                                    '${tableName != null ? 'Meja $tableName • ' : ''}$method',
                                                    style: const TextStyle(
                                                      color: Colors.grey,
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      fontSize: 13,
                                                    ),
                                                  ),
                                                  Text(
                                                    _currencyFormat.format(
                                                      amount,
                                                    ),
                                                    style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w900,
                                                      color: Color(0xFF16A34A),
                                                      fontSize: 15,
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
                                ),
                              );
                            },
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
