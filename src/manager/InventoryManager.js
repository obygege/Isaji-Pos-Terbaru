import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function InventoryManager({ branchId, organizationId }) {
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form untuk menambah master item bahan baku baru jika diperlukan
    const [form, setForm] = useState({ name: '', min_stock_alert: 5, initial_qty: 0, unit: 'pcs' });

    const fetchStocks = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            // Mengambil data stok gabungan dari ingredients & ingredient_stocks per branch_id
            const { data, error } = await supabase
                .from('ingredient_stocks')
                .select(`
                    id,
                    qty_on_hand,
                    min_stock_alert,
                    ingredients ( id, name, organization_id )
                `)
                .eq('branch_id', branchId);

            if (error) throw error;
            setStocks(data || []);
        } catch (err) {
            console.error("Gagal memuat stok:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchStocks();
    }, [fetchStocks]);

    const handleSaveItem = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Buat master ingredient terlebih dahulu
            const { data: ingData, error: ingError } = await supabase
                .from('ingredients')
                .insert([{ organization_id: organizationId, name: form.name }])
                .select()
                .single();

            if (ingError) throw ingError;

            // 2. Masukkan ke tabel ingredient_stocks khusus cabang ini
            const { error: stockError } = await supabase
                .from('ingredient_stocks')
                .insert([{
                    ingredient_id: ingData.id,
                    branch_id: branchId,
                    qty_on_hand: parseFloat(form.initial_qty) || 0,
                    min_stock_alert: parseFloat(form.min_stock_alert) || 5
                }]);

            if (stockError) throw stockError;

            await fetchStocks();
            setIsModalOpen(false);
            setForm({ name: '', min_stock_alert: 5, initial_qty: 0, unit: 'pcs' });
            alert("Master barang dan stok awal berhasil ditambahkan!");
        } catch (err) {
            alert("Gagal menambah barang: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const lowStockCount = stocks.filter(s => s.qty_on_hand <= (s.min_stock_alert || 5)).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Ringkasan Stok & Bahan Baku</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Monitoring inventaris fisik khusus cabang ini secara real-time.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                >
                    + Tambah Master Barang
                </button>
            </div>

            {/* Statistik Kartu */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Jenis Barang</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{stocks.length} Item</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Stok Menipis / Kritis</p>
                    <p className="text-2xl font-black text-orange-600 mt-2">{lowStockCount} Item</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Status Gudang Cabang</p>
                    <p className="text-lg font-black text-blue-600 mt-2">Aman & Terisolasi</p>
                </div>
            </div>

            {/* Tabel Daftar Stok */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Nama Barang / Bahan</th>
                            <th className="px-6 py-4">Stok Tersedia</th>
                            <th className="px-6 py-4">Batas Peringatan (Min)</th>
                            <th className="px-6 py-4">Status Kondisi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Memuat data stok cabang...</td></tr>
                        ) : stocks.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Belum ada data stok tercatat di cabang ini.</td></tr>
                        ) : (
                            stocks.map((item) => {
                                const isLow = item.qty_on_hand <= (item.min_stock_alert || 5);
                                return (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{item.ingredients?.name || 'Barang Tidak Dikenal'}</td>
                                        <td className="px-6 py-4 font-mono font-black text-gray-800">{item.qty_on_hand}</td>
                                        <td className="px-6 py-4 font-mono text-gray-500">{item.min_stock_alert}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {isLow ? '⚠️ Menipis' : 'Stok Aman'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Tambah Master Barang */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Tambah Master Barang Cabang</h3>
                        <form onSubmit={handleSaveItem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Barang / Bahan Baku</label>
                                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: Biji Kopi Robusta / Keju" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stok Awal</label>
                                    <input type="number" required min="0" value={form.initial_qty} onChange={(e) => setForm({ ...form, initial_qty: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none font-mono text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Alert Minimum</label>
                                    <input type="number" required min="0" value={form.min_stock_alert} onChange={(e) => setForm({ ...form, min_stock_alert: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none font-mono text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-xl font-bold text-sm">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryManager;