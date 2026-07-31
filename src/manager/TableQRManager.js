import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function TableQRManager({ branchId, branchName }) {
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ name: '', capacity: '4' });

    const fetchTables = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tables')
                .select('*')
                .eq('branch_id', branchId)
                .order('name', { ascending: true });

            if (error) throw error;
            setTables(data || []);
        } catch (err) {
            console.error("Gagal memuat meja:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleSaveTable = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Generate token unik secara otomatis untuk memenuhi constraint not-null qr_code_token
            const uniqueQrToken = 'qr_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const { error } = await supabase.from('tables').insert([{
                branch_id: branchId,
                name: form.name.trim(),
                capacity: parseInt(form.capacity) || 4,
                qr_code_token: uniqueQrToken,
                is_active: true
            }]);

            if (error) throw error;
            await fetchTables();
            setIsModalOpen(false);
            setForm({ name: '', capacity: '4' });
            alert("Meja & QR Code berhasil dibuat!");
        } catch (err) {
            alert("Gagal menambah meja: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteTable = async (id, tableName) => {
        if (window.confirm(`Hapus Meja "${tableName}"?`)) {
            const { error } = await supabase.from('tables').delete().eq('id', id);
            if (error) alert("Gagal menghapus: " + error.message);
            else setTables(tables.filter(t => t.id !== id));
        }
    };

    // Menggunakan kolom qr_code_token dari database
    const getCustomerOrderUrl = (qrToken) => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/self-order?branch=${branchId}&token=${qrToken}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Manajemen QR Meja - {branchName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Buat QR code meja untuk pelanggan scan, pesan menu, dan bayar langsung dari HP tanpa salah cabang.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Meja Baru
                </button>
            </div>

            {/* Grid Daftar Meja */}
            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat data meja...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tables.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                            Belum ada meja terdaftar. Silakan buat meja baru.
                        </div>
                    ) : (
                        tables.map((table) => {
                            const token = table.qr_code_token || table.qr_token;
                            const orderUrl = getCustomerOrderUrl(token);
                            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(orderUrl)}`;

                            return (
                                <div key={table.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                                    <div className="p-6 space-y-4 text-center">
                                        <div className="flex justify-between items-center">
                                            <span className="px-3 py-1 bg-orange-50 text-isaji-orange border border-orange-200 rounded-lg text-xs font-black uppercase">
                                                Meja {table.name}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400">
                                                Kapasitas: {table.capacity || 4} Orang
                                            </span>
                                        </div>

                                        {/* Tampilan Gambar QR Code */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block mx-auto">
                                            <img src={qrApiUrl} alt={`QR Meja ${table.name}`} className="w-36 h-36 object-contain mx-auto" />
                                        </div>

                                        <p className="text-[11px] text-gray-400 font-mono break-all bg-gray-50 p-2 rounded-lg">
                                            {orderUrl}
                                        </p>
                                    </div>
                                    <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
                                        <a
                                            href={qrApiUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-isaji-navy hover:underline"
                                        >
                                            Unduh Gambar QR
                                        </a>
                                        <button
                                            onClick={() => handleDeleteTable(table.id, table.name)}
                                            className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors"
                                        >
                                            Hapus Meja
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Modal Tambah Meja */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Tambah Meja & QR Baru</h3>
                        <form onSubmit={handleSaveTable} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nomor / Nama Meja</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Cth: 01, VIP-A, Outdoor-3"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kapasitas Kursi</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={form.capacity}
                                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                    placeholder="Cth: 2 untuk meja date, 4 untuk regular"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none font-mono"
                                />
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">Simpan Meja</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TableQRManager;