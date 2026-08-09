import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_STYLES = {
    pending: 'bg-yellow-50 text-yellow-700',
    processing: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-700',
};

const PAYMENT_STYLES = {
    unpaid: 'bg-red-50 text-red-600',
    paid: 'bg-green-50 text-green-600',
    partial: 'bg-yellow-50 text-yellow-700',
    refunded: 'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

function TransactionHistory({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);

    const [filters, setFilters] = useState({
        branchId: 'all',
        status: 'all',
        paymentStatus: 'all',
        channel: 'all',
        dateFrom: '',
        dateTo: '',
        search: '',
    });

    useEffect(() => {
        if (orgData?.id) {
            supabase
                .from('branches')
                .select('id, name')
                .eq('organization_id', orgData.id)
                .then(({ data }) => setBranches(data || []));
        }
    }, [orgData]);

    const fetchOrders = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select('*, branches(name), order_items(id, qty, unit_price, subtotal, notes, products(name)), payments(method, amount, paid_at, reference_number)', { count: 'exact' })
                .eq('organization_id', orgData.id)
                .order('created_at', { ascending: false });

            if (filters.branchId !== 'all') query = query.eq('branch_id', filters.branchId);
            if (filters.status !== 'all') query = query.eq('status', filters.status);
            if (filters.paymentStatus !== 'all') query = query.eq('payment_status', filters.paymentStatus);
            if (filters.channel !== 'all') query = query.eq('channel', filters.channel);
            if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00`);
            if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59`);
            if (filters.search.trim()) {
                const s = filters.search.trim();
                query = query.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
            }

            query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

            const { data, error, count } = await query;
            if (error) throw error;
            setOrders(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Gagal memuat riwayat transaksi:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, filters, page]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleFilterChange = (key, value) => {
        setPage(0);
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const totals = orders.reduce((acc, o) => {
        if (o.status !== 'cancelled') acc.sales += Number(o.total_amount || 0);
        acc.count += 1;
        return acc;
    }, { sales: 0, count: 0 });

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transaksi (halaman ini)</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{totals.count}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Nilai (halaman ini)</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatRupiah(totals.sales)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Keseluruhan (filter aktif)</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{totalCount} pesanan</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <select value={filters.branchId} onChange={(e) => handleFilterChange('branchId', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                        <option value="all">Semua Cabang</option>
                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                        <option value="all">Semua Status</option>
                        <option value="pending">Pending</option>
                        <option value="processing">Diproses</option>
                        <option value="completed">Selesai</option>
                        <option value="cancelled">Dibatalkan</option>
                    </select>
                    <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                        <option value="all">Semua Pembayaran</option>
                        <option value="unpaid">Belum Bayar</option>
                        <option value="paid">Lunas</option>
                        <option value="partial">Sebagian</option>
                        <option value="refunded">Refund</option>
                    </select>
                    <select value={filters.channel} onChange={(e) => handleFilterChange('channel', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                        <option value="all">Semua Channel</option>
                        <option value="pos">Kasir (POS)</option>
                        <option value="self_order">Self Order</option>
                    </select>
                    <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
                    <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
                </div>
                <input
                    type="text"
                    placeholder="Cari no. order, nama, atau no. HP pelanggan..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data transaksi...</div>
                ) : orders.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Tidak ada transaksi yang cocok dengan filter.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">No. Order</th>
                                    <th className="px-6 py-3">Cabang</th>
                                    <th className="px-6 py-3">Pelanggan</th>
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Channel</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Pembayaran</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o) => (
                                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{o.order_number}</td>
                                        <td className="px-6 py-3 text-gray-600">{o.branches?.name || '-'}</td>
                                        <td className="px-6 py-3 text-gray-600">{o.customer_name || '-'}</td>
                                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                                        <td className="px-6 py-3 text-gray-500 capitalize">{o.channel === 'self_order' ? 'Self Order' : 'Kasir'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${PAYMENT_STYLES[o.payment_status] || 'bg-gray-100 text-gray-600'}`}>{o.payment_status}</span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(o.total_amount)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <button onClick={() => setSelectedOrder(o)} className="text-isaji-navy font-bold text-xs hover:underline">Detail</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!isLoading && orders.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Halaman {page + 1} dari {totalPages} &middot; {totalCount} transaksi</p>
                        <div className="flex gap-2">
                            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">Sebelumnya</button>
                            <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50">Berikutnya</button>
                        </div>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                            <div>
                                <h3 className="font-black text-gray-900">{selectedOrder.order_number}</h3>
                                <p className="text-xs text-gray-500">{formatDateTime(selectedOrder.created_at)} &middot; {selectedOrder.branches?.name}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex gap-2">
                                <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${STATUS_STYLES[selectedOrder.status] || 'bg-gray-100 text-gray-600'}`}>{selectedOrder.status}</span>
                                <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${PAYMENT_STYLES[selectedOrder.payment_status] || 'bg-gray-100 text-gray-600'}`}>{selectedOrder.payment_status}</span>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Item Pesanan</p>
                                <div className="space-y-2">
                                    {(selectedOrder.order_items || []).map(it => (
                                        <div key={it.id} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{it.qty}x {it.products?.name || 'Produk'}</span>
                                            <span className="font-semibold text-gray-900">{formatRupiah(it.subtotal)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
                                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatRupiah(selectedOrder.subtotal)}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Diskon</span><span>-{formatRupiah(selectedOrder.discount_amount)}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Pajak</span><span>{formatRupiah(selectedOrder.tax_amount)}</span></div>
                                <div className="flex justify-between text-gray-500"><span>Biaya Layanan</span><span>{formatRupiah(selectedOrder.service_charge)}</span></div>
                                <div className="flex justify-between font-black text-gray-900 text-base pt-1"><span>Total</span><span>{formatRupiah(selectedOrder.total_amount)}</span></div>
                            </div>

                            {(selectedOrder.payments || []).length > 0 && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Pembayaran</p>
                                    {selectedOrder.payments.map((p, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span className="text-gray-700 capitalize">{p.method} {p.reference_number ? `(${p.reference_number})` : ''}</span>
                                            <span className="font-semibold text-gray-900">{formatRupiah(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedOrder.notes && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Catatan</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TransactionHistory;