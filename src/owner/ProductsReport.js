import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function monthStartISO() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
}

function ProductsReport({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [salesMap, setSalesMap] = useState({});
    const [settingsMap, setSettingsMap] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const [filterBranch, setFilterBranch] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [search, setSearch] = useState('');

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const [branchRes, catRes, prodRes, settingsRes, itemsRes] = await Promise.all([
                supabase.from('branches').select('id, name').eq('organization_id', orgData.id),
                supabase.from('product_categories').select('id, name').eq('organization_id', orgData.id),
                supabase.from('products').select('id, name, description, base_price, cost_price, sku, is_active, track_stock, category_id, image_url').eq('organization_id', orgData.id).order('name'),
                supabase.from('product_branch_settings').select('product_id, branch_id, price_override, is_available, stock_qty'),
                supabase.from('order_items').select('product_id, qty, subtotal, orders!inner(organization_id, branch_id, status, created_at)').eq('orders.organization_id', orgData.id).gte('orders.created_at', monthStartISO()),
            ]);

            setBranches(branchRes.data || []);
            setCategories(catRes.data || []);
            setProducts(prodRes.data || []);

            const setMap = {};
            (settingsRes.data || []).forEach(s => {
                if (!setMap[s.product_id]) setMap[s.product_id] = [];
                setMap[s.product_id].push(s);
            });
            setSettingsMap(setMap);

            const sMap = {};
            (itemsRes.data || []).forEach(it => {
                if (it.orders?.status === 'cancelled') return;
                if (!sMap[it.product_id]) sMap[it.product_id] = { qty: 0, revenue: 0 };
                sMap[it.product_id].qty += Number(it.qty || 0);
                sMap[it.product_id].revenue += Number(it.subtotal || 0);
            });
            setSalesMap(sMap);
        } catch (err) {
            console.error('Gagal memuat laporan menu:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = products.filter(p => {
        if (filterCategory !== 'all' && p.category_id !== filterCategory) return false;
        if (search.trim() && !p.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (filterBranch !== 'all') {
            const settings = settingsMap[p.id] || [];
            const inBranch = settings.find(s => s.branch_id === filterBranch);
            if (settings.length > 0 && !inBranch) return false;
        }
        return true;
    });

    const totalRevenue = Object.values(salesMap).reduce((s, v) => s + v.revenue, 0);
    const totalQty = Object.values(salesMap).reduce((s, v) => s + v.qty, 0);
    const activeCount = products.filter(p => p.is_active).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Produk</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{products.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produk Aktif</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{activeCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Terjual Bulan Ini</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{totalQty} pcs</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Omset Bulan Ini</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatRupiah(totalRevenue)}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
                <input type="text" placeholder="Cari nama produk..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                    <option value="all">Semua Kategori</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                    <option value="all">Semua Cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data produk...</div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Tidak ada produk yang cocok.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Produk</th>
                                    <th className="px-6 py-3">SKU</th>
                                    <th className="px-6 py-3 text-right">Harga Jual</th>
                                    <th className="px-6 py-3 text-right">HPP</th>
                                    <th className="px-6 py-3 text-right">Terjual (bln ini)</th>
                                    <th className="px-6 py-3 text-right">Omset (bln ini)</th>
                                    <th className="px-6 py-3">Ketersediaan</th>
                                    <th className="px-6 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((p) => {
                                    const sales = salesMap[p.id] || { qty: 0, revenue: 0 };
                                    const settings = settingsMap[p.id] || [];
                                    const availableCount = settings.filter(s => s.is_available).length;
                                    return (
                                        <tr key={p.id} className="border-b border-gray-50">
                                            <td className="px-6 py-3 font-bold text-gray-900">{p.name}</td>
                                            <td className="px-6 py-3 text-gray-500">{p.sku || '-'}</td>
                                            <td className="px-6 py-3 text-right text-gray-700">{formatRupiah(p.base_price)}</td>
                                            <td className="px-6 py-3 text-right text-gray-500">{formatRupiah(p.cost_price)}</td>
                                            <td className="px-6 py-3 text-right text-gray-700">{sales.qty}</td>
                                            <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(sales.revenue)}</td>
                                            <td className="px-6 py-3 text-gray-500">{settings.length > 0 ? `${availableCount}/${settings.length} cabang` : 'Semua cabang'}</td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${p.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProductsReport;