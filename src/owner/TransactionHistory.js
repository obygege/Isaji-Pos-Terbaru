import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

const STATUS_LABEL = {
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
};

const STATUS_COLOR = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    processing: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_LABEL = {
    unpaid: 'Belum Lunas',
    paid: 'Lunas',
};

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function formatDateTime(iso) {
    return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TransactionHistory({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Filter
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchBranches = useCallback(async (orgId) => {
        const { data } = await supabase.from('branches').select('id, name').eq('organization_id', orgId).order('name');
        setBranches(data || []);
    }, []);

    const fetchOrders = useCallback(async (orgId) => {
        setIsLoading(true);
        let query = supabase
            .from('orders')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(300);

        if (branchFilter !== 'all') query = query.eq('branch_id', branchFilter);
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (channelFilter !== 'all') query = query.eq('channel', channelFilter);
        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

        const { data, error } = await query;
        if (error) {
            console.error('Gagal memuat transaksi:', error);
            setOrders([]);
        } else {
            setOrders(data || []);
        }
        setIsLoading(false);
    }, [branchFilter, statusFilter, channelFilter, dateFrom, dateTo]);

    useEffect(() => {
        if (orgData?.id) {
            fetchBranches(orgData.id);
        }
    }, [orgData, fetchBranches]);

    useEffect(() => {
        if (orgData?.id) {
            fetchOrders(orgData.id);
        } else {
            setIsLoading(false);
        }
    }, [orgData, fetchOrders]);

    const openDetail = async (order) => {
        setSelectedOrder(order);
        setLoadingDetail(true);
        const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
        setOrderItems(data || []);
        setLoadingDetail(false);
    };

    const branchName = (branchId) => branches.find((b) => b.id === branchId)?.name || '-';

    const filteredOrders = orders.filter((o) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            o.order_number?.toLowerCase().includes(term) ||
            o.customer_name?.toLowerCase().includes(term) ||
            o.customer_phone?.toLowerCase().includes(term)
        );
    });

    const totalOmset = filteredOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    if (isLoading && orders.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-isaji-navy rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Riwayat Transaksi</h2>
                    <p className="text-sm text-gray-500">Semua order dari seluruh cabang, real-time dari database.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Omset (Filter Aktif)</p>
                    <p className="text-lg font-black text-isaji-navy">{formatRupiah(totalOmset)}</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <input
                        type="text"
                        placeholder="Cari no. order / nama..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-isaji-cyan outline-none"
                    />
                    <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-isaji-cyan outline-none">
                        <option value="all">Semua Cabang</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-isaji-cyan outline-none">
                        <option value="all">Semua Status</option>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-isaji-cyan outline-none">
                        <option value="all">Semua Channel</option>
                        <option value="pos">Kasir (POS)</option>
                        <option value="self_order">Self-Order</option>
                    </select>
                    <div className="flex gap-2 col-span-2 md:col-span-1">
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-2 py-2 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-isaji-cyan outline-none" />
                    </div>
                </div>
                {(branchFilter !== 'all' || statusFilter !== 'all' || channelFilter !== 'all' || dateFrom || dateTo || searchTerm) && (
                    <button
                        onClick={() => { setBranchFilter('all'); setStatusFilter('all'); setChannelFilter('all'); setSearchTerm(''); setDateFrom(''); setDateTo(''); }}
                        className="mt-3 text-xs font-bold text-isaji-orange hover:underline"
                    >
                        Reset Filter
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">No. Order</th>
                                <th className="px-4 py-3">Cabang</th>
                                <th className="px-4 py-3">Pelanggan</th>
                                <th className="px-4 py-3">Channel</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Pembayaran</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Waktu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                                        Tidak ada transaksi yang cocok dengan filter ini.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((o) => (
                                    <tr key={o.id} onClick={() => openDetail(o)} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-900">{o.order_number}</td>
                                        <td className="px-4 py-3 text-gray-600">{branchName(o.branch_id)}</td>
                                        <td className="px-4 py-3 text-gray-600">{o.customer_name || '-'}</td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs font-bold text-gray-500">{o.channel === 'self_order' ? 'Self-Order' : 'Kasir'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-1 rounded-full text-[11px] font-bold border ${STATUS_COLOR[o.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                                {STATUS_LABEL[o.status] || o.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-bold ${o.payment_status === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                                {PAYMENT_LABEL[o.payment_status] || o.payment_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(o.total_amount)}</td>
                                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{selectedOrder.order_number}</h3>
                                <p className="text-xs text-gray-500 mt-1">{branchName(selectedOrder.branch_id)} • {formatDateTime(selectedOrder.created_at)}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${STATUS_COLOR[selectedOrder.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {STATUS_LABEL[selectedOrder.status] || selectedOrder.status}
                                </span>
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${selectedOrder.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                    {PAYMENT_LABEL[selectedOrder.payment_status] || selectedOrder.payment_status}
                                </span>
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border bg-gray-50 text-gray-600 border-gray-200">
                                    {selectedOrder.channel === 'self_order' ? 'Self-Order' : 'Kasir (POS)'}
                                </span>
                            </div>

                            {selectedOrder.customer_name && (
                                <div className="text-sm">
                                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Pelanggan</p>
                                    <p className="text-gray-900 font-medium">{selectedOrder.customer_name} {selectedOrder.customer_phone ? `• ${selectedOrder.customer_phone}` : ''}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase mb-2">Item Pesanan</p>
                                {loadingDetail ? (
                                    <p className="text-sm text-gray-400">Memuat item...</p>
                                ) : orderItems.length === 0 ? (
                                    <p className="text-sm text-gray-400">Tidak ada item.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {orderItems.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                                                <div>
                                                    <p className="font-medium text-gray-800">{item.qty}x Item</p>
                                                    {item.notes && <p className="text-xs text-gray-400">Catatan: {item.notes}</p>}
                                                </div>
                                                <p className="font-bold text-gray-900">{formatRupiah(item.subtotal)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatRupiah(selectedOrder.subtotal)}</span></div>
                                {selectedOrder.discount_amount > 0 && (
                                    <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(selectedOrder.discount_amount)}</span></div>
                                )}
                                {selectedOrder.tax_amount > 0 && (
                                    <div className="flex justify-between text-gray-600"><span>Pajak</span><span>{formatRupiah(selectedOrder.tax_amount)}</span></div>
                                )}
                                {selectedOrder.service_charge > 0 && (
                                    <div className="flex justify-between text-gray-600"><span>Biaya Layanan</span><span>{formatRupiah(selectedOrder.service_charge)}</span></div>
                                )}
                                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                                    <span>Total</span><span>{formatRupiah(selectedOrder.total_amount)}</span>
                                </div>
                            </div>

                            {selectedOrder.notes && (
                                <div className="text-sm">
                                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Catatan</p>
                                    <p className="text-gray-700">{selectedOrder.notes}</p>
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
