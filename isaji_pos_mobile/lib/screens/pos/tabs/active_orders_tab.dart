import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

/// Tab "Pesanan Masuk" — antrean verifikasi bukti bayar QRIS / Transfer Bank
/// manual dari customer (self-order via QR meja).
///
/// Alur:
///  - Customer upload bukti bayar -> baris baru di `payment_verifications`
///    (status = 'pending') dan order terkait berstatus
///    orders.status = 'awaiting_payment', orders.payment_status = 'pending_verification'.
///  - Kasir di sini bisa TERIMA (order lanjut ke dapur/barista, tercatat di
///    `payments`) atau TOLAK (wajib isi alasan, customer akan lihat alasan
///    itu di HP-nya dan bisa upload ulang bukti pada order yang sama).
class ActiveOrdersTab extends StatefulWidget {
  const ActiveOrdersTab({super.key});

  @override
  State<ActiveOrdersTab> createState() => _ActiveOrdersTabState();
}

class _ActiveOrdersTabState extends State<ActiveOrdersTab> {
  final supabase = Supabase.instance.client;

  String _branchId = '';
  String? _empId;
  bool _isLoading = true;
  String? _errorMsg;
  List<Map<String, dynamic>> _pendingVerifications = [];

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
      // Ambil pengajuan bukti bayar yang masih menunggu verifikasi di cabang ini,
      // sekaligus data order & nomor mejanya untuk ditampilkan ke kasir.
      final res = await supabase
          .from('payment_verifications')
          .select(
            '*, orders!payment_verifications_order_id_fkey(id, order_number, customer_name, customer_phone, total_amount, table_id, tables(name))',
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
    return 'qris'; // static_qris & ewallet manual dicatat sebagai 'qris'
  }

  Future<void> _acceptVerification(Map<String, dynamic> verif) async {
    final order = verif['orders'] as Map<String, dynamic>?;
    final confirmed = await _confirmDialog(
      title: 'Terima Pembayaran?',
      message:
          'Pesanan ${order?['order_number'] ?? '-'} akan langsung diproses dan diteruskan ke dapur/barista.',
      confirmLabel: 'Terima & Proses',
      confirmColor: const Color(0xFF16A34A),
    );
    if (confirmed != true) return;

    _showBlockingLoader();
    try {
      final now = DateTime.now().toIso8601String();

      await supabase
          .from('payment_verifications')
          .update({
            'status': 'accepted',
            'reviewed_by': _empId,
            'reviewed_at': now,
          })
          .eq('id', verif['id']);

      await supabase
          .from('orders')
          .update({
            'status': 'pending', // masuk antrean dapur/barista normal
            'payment_status': 'paid',
            'active_payment_verification_id': verif['id'],
          })
          .eq('id', verif['order_id']);

      await supabase.from('payments').insert({
        'order_id': verif['order_id'],
        'method': _mapMethodEnum(verif['method_type']),
        'amount': verif['amount'],
        'received_by': _empId,
        'payment_verification_id': verif['id'],
      });

      if (!mounted) return;
      Navigator.pop(context); // tutup loader
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
        SnackBar(content: Text('Gagal memproses: $e'), backgroundColor: Colors.red),
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
        title: Text('Tolak Bukti — ${order?['order_number'] ?? '-'}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Alasan penolakan wajib diisi. Customer akan melihat alasan ini dan bisa upload ulang bukti.',
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              autofocus: true,
              maxLines: 3,
              decoration: const InputDecoration(
                hintText: 'Contoh: Nominal tidak sesuai / bukti buram / belum masuk rekening',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () {
              if (reasonController.text.trim().isEmpty) return;
              Navigator.pop(context, reasonController.text.trim());
            },
            child: const Text('Tolak', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (reason == null || reason.isEmpty) return;

    _showBlockingLoader();
    try {
      final now = DateTime.now().toIso8601String();

      await supabase
          .from('payment_verifications')
          .update({
            'status': 'rejected',
            'rejection_reason': reason,
            'reviewed_by': _empId,
            'reviewed_at': now,
          })
          .eq('id', verif['id']);

      // Order TETAP 'awaiting_payment' (belum ke dapur) sampai customer upload ulang & diterima.
      await supabase
          .from('orders')
          .update({'payment_status': 'rejected'})
          .eq('id', verif['order_id']);

      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Bukti pembayaran ditolak. Customer akan diminta upload ulang.'),
          backgroundColor: Colors.orange,
        ),
      );
      _fetchQueue();
    } catch (e) {
      if (!mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memproses: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<bool?> _confirmDialog({
    required String title,
    required String message,
    required String confirmLabel,
    required Color confirmColor,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: confirmColor),
            onPressed: () => Navigator.pop(context, true),
            child: Text(confirmLabel, style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
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

  void _openProofPreview(String url) {
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            InteractiveViewer(
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    'Gagal memuat gambar bukti bayar.',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 32),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
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
                  const Text(
                    'Pesanan Masuk (Self-Order)',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F2040),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Color(0xFF0F2040)),
                    onPressed: _fetchQueue,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Verifikasi bukti bayar QRIS/Transfer sebelum pesanan masuk dapur.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 16),
              Expanded(child: _buildBody()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF00B4D8)));
    }

    if (_errorMsg != null) {
      return Center(
        child: Text(_errorMsg!, style: const TextStyle(color: Colors.red)),
      );
    }

    if (_pendingVerifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.dining_outlined, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Belum ada bukti pembayaran yang perlu diverifikasi.',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 15),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchQueue,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: _pendingVerifications.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final verif = _pendingVerifications[index];
          final order = verif['orders'] as Map<String, dynamic>?;
          final tableName = order?['tables']?['name'];
          final createdAt = DateTime.tryParse(verif['created_at'] ?? '');

          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () => _openProofPreview(verif['proof_url']),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      verif['proof_url'],
                      width: 72,
                      height: 72,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 72,
                        height: 72,
                        color: Colors.grey.shade100,
                        child: const Icon(Icons.image_not_supported, color: Colors.grey),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order?['order_number'] ?? '-',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF0F2040)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${tableName != null ? 'Meja $tableName • ' : ''}${verif['method_type'] == 'bank_transfer' ? 'Transfer Bank' : 'QRIS'}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.w600),
                      ),
                      if (order?['customer_name'] != null)
                        Text(
                          order!['customer_name'],
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      const SizedBox(height: 6),
                      Text(
                        _currencyFormat.format((verif['amount'] as num?)?.toDouble() ?? 0),
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF00B4D8)),
                      ),
                      if (createdAt != null)
                        Text(
                          DateFormat('HH:mm').format(createdAt.toLocal()),
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () => _rejectVerification(verif),
                              child: const Text('Tolak', style: TextStyle(fontWeight: FontWeight.w800)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF16A34A),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                elevation: 0,
                              ),
                              onPressed: () => _acceptVerification(verif),
                              child: const Text('Terima', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}