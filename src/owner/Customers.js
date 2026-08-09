import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Customers({ orgData }) {
    const [customers, setCustomers] = useState([]);
    const [orderStats, setOrderStats] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('spend');

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const [custRes, orderRes] = await Promise.all([
                supabase.from('customers').select('user_id, full_name, phone, subscribe_promo, created_at').eq('organization_id', orgData.id).order('created_at', { ascending: false }),
                supabase.from('orders').select('customer_phone, customer_name, total_amount, status, created_at').eq('organization_id', orgData.id),
            ]);

            setCustomers(custRes.data || []);

            const stats = {};
            (orderRes.data || []).forEach(o => {
                if (o.status === 'cancelled') return;
                const key = o.customer_phone || o.customer_name;
                if (!key) return;
                if (!stats[key]) stats[key] = { totalSpend: 0, orderCount: 0, lastOrder: null };
                stats[key].totalSpend += Number(o.total_amount || 0);
                stats[key].orderCount += 1;
                if (!stats[key].lastOrder || new Date(o.created_at) > new Date(stats[key].lastOrder)) {
                    stats[key].lastOrder = o.created_at;
                }
            });
            setOrderStats(stats);
        } catch (err) {
            console.error('Gagal memuat data pelanggan:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const enriched = customers.map(c => {
        const stat = orderStats[c.phone] || { totalSpend: 0, orderCount: 0, lastOrder: null };
        return { ...c, ...stat };
    });

    const filtered = enriched
        .filter(c => !search.trim() || c.full_name?.toLowerCase().includes(search.trim().toLowerCase()) || c.phone?.includes(search.trim()))
        .sort((a, b) => {
            if (sortBy === 'spend') return b.totalSpend - a.totalSpend;
            if (sortBy === 'orders') return b.orderCount - a.orderCount;
            if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at);
            return 0;
        });

    const totalSpend = enriched.reduce((s, c) => s + c.totalSpend, 0);
    const subscribedCount = customers.filter(c => c.subscribe_promo).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pelanggan Terdaftar</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{customers.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Belanja Semua Pelanggan</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatRupiah(totalSpend)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Berlangganan Promo</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{subscribedCount} orang</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
                <input type="text" placeholder="Cari nama atau nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                    <option value="spend">Urutkan: Total Belanja</option>
                    <option value="orders">Urutkan: Jumlah Transaksi</option>
                    <option value="recent">Urutkan: Terbaru Daftar</option>
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data pelanggan...</div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Belum ada pelanggan terdaftar.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Nama</th>
                                    <th className="px-6 py-3">No. HP</th>
                                    <th className="px-6 py-3 text-right">Total Transaksi</th>
                                    <th className="px-6 py-3 text-right">Total Belanja</th>
                                    <th className="px-6 py-3">Transaksi Terakhir</th>
                                    <th className="px-6 py-3">Promo</th>
                                    <th className="px-6 py-3">Terdaftar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => (
                                    <tr key={c.user_id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{c.full_name}</td>
                                        <td className="px-6 py-3 text-gray-600">{c.phone || '-'}</td>
                                        <td className="px-6 py-3 text-right text-gray-700">{c.orderCount}</td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(c.totalSpend)}</td>
                                        <td className="px-6 py-3 text-gray-500">{formatDate(c.lastOrder)}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${c.subscribe_promo ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {c.subscribe_promo ? 'Ya' : 'Tidak'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">{formatDate(c.created_at)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Customers;