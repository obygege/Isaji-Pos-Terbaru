import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatDateTime(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InventoryReport({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterBranch, setFilterBranch] = useState('all');
    const [onlyLowStock, setOnlyLowStock] = useState(false);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('stock');

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgData.id);
            const allBranches = branchData || [];
            setBranches(allBranches);
            const branchIds = allBranches.map(b => b.id);
            if (branchIds.length === 0) { setIsLoading(false); return; }

            const [stockRes, txRes] = await Promise.all([
                supabase
                    .from('ingredient_stocks')
                    .select('id, qty_on_hand, min_stock_alert, branch_id, ingredients(id, name, unit, cost_per_unit)')
                    .in('branch_id', branchIds),
                supabase
                    .from('inventory_transactions')
                    .select('id, item_name, category, type, quantity, unit, notes, branch_id, created_at')
                    .eq('organization_id', orgData.id)
                    .order('created_at', { ascending: false })
                    .limit(50),
            ]);

            setStocks(stockRes.data || []);
            setTransactions(txRes.data || []);
        } catch (err) {
            console.error('Gagal memuat laporan stok:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const branchNameOf = (id) => branches.find(b => b.id === id)?.name || '-';

    const filteredStocks = stocks.filter(s => {
        if (filterBranch !== 'all' && s.branch_id !== filterBranch) return false;
        if (onlyLowStock && !(Number(s.qty_on_hand) <= Number(s.min_stock_alert || 0))) return false;
        if (search.trim() && !s.ingredients?.name?.toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
    });

    const filteredTx = filterBranch === 'all' ? transactions : transactions.filter(t => t.branch_id === filterBranch);

    const lowStockCount = stocks.filter(s => Number(s.qty_on_hand) <= Number(s.min_stock_alert || 0)).length;
    const totalStockValue = stocks.reduce((sum, s) => sum + Number(s.qty_on_hand || 0) * Number(s.ingredients?.cost_per_unit || 0), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Item Bahan Baku</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{stocks.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Stok Menipis</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{lowStockCount} item</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimasi Nilai Stok</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">Rp {totalStockValue.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={() => setTab('stock')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'stock' ? 'bg-isaji-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Stok Saat Ini</button>
                <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold ${tab === 'history' ? 'bg-isaji-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Riwayat Mutasi</button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
                {tab === 'stock' && (
                    <input type="text" placeholder="Cari nama bahan baku..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                )}
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                    <option value="all">Semua Cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {tab === 'stock' && (
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 px-2">
                        <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)} />
                        Hanya stok menipis
                    </label>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data stok...</div>
                ) : tab === 'stock' ? (
                    filteredStocks.length === 0 ? (
                        <div className="px-6 py-16 text-center text-gray-400 text-sm">Tidak ada data stok yang cocok.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Bahan Baku</th>
                                        <th className="px-6 py-3">Cabang</th>
                                        <th className="px-6 py-3 text-right">Stok Saat Ini</th>
                                        <th className="px-6 py-3 text-right">Batas Minimum</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStocks.map((s) => {
                                        const isLow = Number(s.qty_on_hand) <= Number(s.min_stock_alert || 0);
                                        return (
                                            <tr key={s.id} className="border-b border-gray-50">
                                                <td className="px-6 py-3 font-bold text-gray-900">{s.ingredients?.name || '-'}</td>
                                                <td className="px-6 py-3 text-gray-600">{branchNameOf(s.branch_id)}</td>
                                                <td className="px-6 py-3 text-right text-gray-700">{s.qty_on_hand} {s.ingredients?.unit}</td>
                                                <td className="px-6 py-3 text-right text-gray-500">{s.min_stock_alert} {s.ingredients?.unit}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                        {isLow ? 'Menipis' : 'Aman'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : filteredTx.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Belum ada riwayat mutasi.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Waktu</th>
                                    <th className="px-6 py-3">Item</th>
                                    <th className="px-6 py-3">Cabang</th>
                                    <th className="px-6 py-3">Tipe</th>
                                    <th className="px-6 py-3 text-right">Jumlah</th>
                                    <th className="px-6 py-3">Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTx.map((t) => (
                                    <tr key={t.id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(t.created_at)}</td>
                                        <td className="px-6 py-3 font-bold text-gray-900">{t.item_name}</td>
                                        <td className="px-6 py-3 text-gray-600">{branchNameOf(t.branch_id)}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold capitalize ${t.type === 'in' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {t.type === 'in' ? 'Masuk' : 'Keluar'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-700">{t.quantity} {t.unit}</td>
                                        <td className="px-6 py-3 text-gray-500">{t.notes || '-'}</td>
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

export default InventoryReport;