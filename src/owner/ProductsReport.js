import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function ProductsReport({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [branchFilter, setBranchFilter] = useState('all');
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState('revenue'); // revenue | qty

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgData.id).order('name');
            setBranches(branchData || []);

            // Semua menu di organisasi ini (opsional difilter per cabang)
            let menuQuery = supabase.from('menus').select('id, name, category, price, stock, branch_id').eq('organization_id', orgData.id);
            if (branchFilter !== 'all') menuQuery = menuQuery.eq('branch_id', branchFilter);
            const { data: menus } = await menuQuery;

            // Semua order_items dari order yang statusnya bukan cancelled, di organisasi ini
            let orderQuery = supabase.from('orders').select('id, branch_id, status').eq('organization_id', orgData.id).neq('status', 'cancelled');
            if (branchFilter !== 'all') orderQuery = orderQuery.eq('branch_id', branchFilter);
            const { data: orders } = await orderQuery;

            const orderIds = (orders || []).map((o) => o.id);
            let itemsData = [];
            if (orderIds.length > 0) {
                const { data: items } = await supabase
                    .from('order_items')
                    .select('product_id, qty, subtotal')
                    .in('order_id', orderIds);
                itemsData = items || [];
            }

            // Agregat per menu (product_id di order_items = id dari tabel menus)
            const salesMap = {};
            itemsData.forEach((item) => {
                if (!salesMap[item.product_id]) salesMap[item.product_id] = { qty: 0, revenue: 0 };
                salesMap[item.product_id].qty += Number(item.qty || 0);
                salesMap[item.product_id].revenue += Number(item.subtotal || 0);
            });

            const combined = (menus || []).map((m) => ({
                ...m,
                soldQty: salesMap[m.id]?.qty || 0,
                revenue: salesMap[m.id]?.revenue || 0,
            }));

            setRows(combined);
        } catch (err) {
            console.error('Gagal memuat laporan menu:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, branchFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sortedRows = [...rows].sort((a, b) => (sortBy === 'revenue' ? b.revenue - a.revenue : b.soldQty - a.soldQty));
    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const branchName = (id) => branches.find((b) => b.id === id)?.name || '-';

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Laporan Menu</h2>
                    <p className="text-sm text-gray-500">Performa penjualan tiap menu, dihitung sepanjang waktu (seluruh histori order).</p>
                </div>
                <div className="flex gap-2">
                    <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                        <option value="all">Semua Cabang</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                        <option value="revenue">Urutkan: Omset Tertinggi</option>
                        <option value="qty">Urutkan: Terlaris (Qty)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm w-fit">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Omset dari Menu (Filter Aktif)</p>
                <p className="text-lg font-black text-isaji-navy">{formatRupiah(totalRevenue)}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">Menu</th>
                                <th className="px-4 py-3">Kategori</th>
                                {branchFilter === 'all' && <th className="px-4 py-3">Cabang</th>}
                                <th className="px-4 py-3">Harga</th>
                                <th className="px-4 py-3">Stok</th>
                                <th className="px-4 py-3">Terjual</th>
                                <th className="px-4 py-3 text-right">Omset</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Memuat data...</td></tr>
                            ) : sortedRows.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada menu.</td></tr>
                            ) : (
                                sortedRows.map((r) => (
                                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="px-4 py-3 font-bold text-gray-900">{r.name}</td>
                                        <td className="px-4 py-3 text-gray-500 capitalize">{r.category}</td>
                                        {branchFilter === 'all' && <td className="px-4 py-3 text-gray-500">{branchName(r.branch_id)}</td>}
                                        <td className="px-4 py-3 text-gray-600">{formatRupiah(r.price)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`font-bold ${r.stock <= 5 ? 'text-red-500' : 'text-gray-700'}`}>{r.stock}</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-gray-700">{r.soldQty}x</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900">{formatRupiah(r.revenue)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default ProductsReport;
