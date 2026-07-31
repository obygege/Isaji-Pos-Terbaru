import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function StockInManager({ branchId, organizationId, userId }) {
    const [history, setHistory] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        ingredient_stock_id: '',
        quantity: '',
        notes: ''
    });

    const fetchData = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            // Ambil data stok barang di cabang ini untuk pilihan dropdown
            const { data: stockData } = await supabase
                .from('ingredient_stocks')
                .select(`id, qty_on_hand, ingredients ( name )`)
                .eq('branch_id', branchId);
            setStocks(stockData || []);

            // Ambil riwayat barang masuk khusus cabang ini
            const { data: txData } = await supabase
                .from('inventory_transactions')
                .select('*')
                .eq('branch_id', branchId)
                .eq('type', 'in')
                .order('created_at', { ascending: false });
            setHistory(txData || []);
        } catch (err) {
            console.error("Gagal memuat data barang masuk:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStockIn = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const selectedStock = stocks.find(s => s.id === form.ingredient_stock_id);
            if (!selectedStock) throw new Error("Pilih barang terlebih dahulu!");

            const qtyToAdd = parseFloat(form.quantity) || 0;
            const itemName = selectedStock.ingredients.name;

            // 1. Catat transaksi barang masuk
            const { error: txError } = await supabase.from('inventory_transactions').insert([{
                organization_id: organizationId,
                branch_id: branchId,
                item_name: itemName,
                type: 'in',
                quantity: qtyToAdd,
                notes: form.notes,
                created_by: userId
            }]);
            if (txError) throw txError;

            // 2. Update tambah kuantitas di ingredient_stocks cabang tersebut
            const newQty = parseFloat(selectedStock.qty_on_hand) + qtyToAdd;
            const { error: updateError } = await supabase
                .from('ingredient_stocks')
                .update({ qty_on_hand: newQty })
                .eq('id', selectedStock.id);
            if (updateError) throw updateError;

            await fetchData();
            setIsModalOpen(false);
            setForm({ ingredient_stock_id: '', quantity: '', notes: '' });
            alert("Restock barang masuk berhasil dicatat dan stok bertambah!");
        } catch (err) {
            alert("Gagal mencatat barang masuk: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Barang Masuk (Restock Pembelian)</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Catat barang baru yang masuk atau dibeli untuk menambah persediaan cabang.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    + Catat Barang Masuk
                </button>
            </div>

            {/* Tabel Riwayat Barang Masuk */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Tanggal & Waktu</th>
                            <th className="px-6 py-4">Nama Barang</th>
                            <th className="px-6 py-4">Jumlah Masuk</th>
                            <th className="px-6 py-4">Catatan / Keterangan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Memuat riwayat...</td></tr>
                        ) : history.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-400">Belum ada catatan barang masuk di cabang ini.</td></tr>
                        ) : (
                            history.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{item.item_name}</td>
                                    <td className="px-6 py-4 font-mono font-black text-green-600">+{item.quantity}</td>
                                    <td className="px-6 py-4 text-gray-500">{item.notes || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Input Barang Masuk */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Form Pencatatan Barang Masuk</h3>
                        <form onSubmit={handleStockIn} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Barang Gudang</label>
                                <select required value={form.ingredient_stock_id} onChange={(e) => setForm({ ...form, ingredient_stock_id: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                                    <option value="" disabled>-- Pilih Bahan Baku --</option>
                                    {stocks.map(s => (
                                        <option key={s.id} value={s.id}>{s.ingredients?.name} (Stok: {s.qty_on_hand})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jumlah Masuk (Kuantitas)</label>
                                <input type="number" required min="0.01" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Cth: 10" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none font-mono text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Catatan / Supplier</label>
                                <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Cth: Beli dari Toko Grosir Jaya..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"></textarea>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">Simpan Masuk</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockInManager;