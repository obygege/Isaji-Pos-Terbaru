import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function InventoryReport({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [branchFilter, setBranchFilter] = useState('all');
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showLowStockOnly, setShowLowStockOnly] = useState(false);

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgData.id).order('name');
            setBranches(branchData || []);

            const branchIds = (branchData || []).map((b) => b.id);
            if (branchIds.length === 0) {
                setStocks([]);
                setIsLoading(false);
                return;
            }

            let query = supabase
                .from('ingredient_stocks')
                .select('id, qty_on_hand, min_stock_alert, branch_id, ingredients ( id, name, unit, cost_per_unit )')
                .in('branch_id', branchFilter === 'all' ? branchIds : [branchFilter]);

            const { data, error } = await query;
            if (error) throw error;
            setStocks(data || []);
        } catch (err) {
            console.error('Gagal memuat laporan stok:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, branchFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const branchName = (id) => branches.find((b) => b.id === id)?.name || '-';
    const filteredStocks = showLowStockOnly
        ? stocks.filter((s) => Number(s.qty_on_hand) <= Number(s.min_stock_alert || 5))
        : stocks;

    const totalValue = stocks.reduce((sum, s) => sum + Number(s.qty_on_hand || 0) * Number(s.ingredients?.cost_per_unit || 0), 0);
    const lowStockCount = stocks.filter((s) => Number(s.qty_on_hand) <= Number(s.min_stock_alert || 5)).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Laporan Stok Bahan Baku</h2>
                    <p className="text-sm text-gray-500">Rekap stok bahan baku dari seluruh cabang, real-time.</p>
                </div>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="all">Semua Cabang</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Jenis Bahan</p>
                    <p className="text-xl font-black text-gray-900 mt-1">{stocks.length}</p>
                </div>
                <button
                    onClick={() => setShowLowStockOnly((v) => !v)}
                    className={`text-left rounded-xl p-5 shadow-sm border transition-colors ${showLowStockOnly ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
                >
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Stok Menipis (klik utk filter)</p>
                    <p className="text-xl font-black text-red-600 mt-1">{lowStockCount}</p>
                </button>
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimasi Nilai Stok</p>
                    <p className="text-xl font-black text-isaji-navy mt-1">Rp {totalValue.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-4 py-3">Bahan Baku</th>
                                {branchFilter === 'all' && <th className="px-4 py-3">Cabang</th>}
                                <th className="px-4 py-3">Stok Tersedia</th>
                                <th className="px-4 py-3">Batas Minimum</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Memuat data...</td></tr>
                            ) : filteredStocks.length === 0 ? (
                                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">Tidak ada data stok.</td></tr>
                            ) : (
                                filteredStocks.map((s) => {
                                    const isLow = Number(s.qty_on_hand) <= Number(s.min_stock_alert || 5);
                                    return (
                                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-gray-900">{s.ingredients?.name || 'Tidak dikenal'}</td>
                                            {branchFilter === 'all' && <td className="px-4 py-3 text-gray-500">{branchName(s.branch_id)}</td>}
                                            <td className="px-4 py-3 font-mono font-black text-gray-800">{s.qty_on_hand} {s.ingredients?.unit}</td>
                                            <td className="px-4 py-3 font-mono text-gray-500">{s.min_stock_alert}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                    {isLow ? '⚠️ Menipis' : 'Aman'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default InventoryReport;
