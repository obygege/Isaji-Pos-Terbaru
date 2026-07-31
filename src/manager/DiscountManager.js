import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function DiscountManager({ branchId, organizationId }) {
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        code: '',
        name: '',
        type: 'percentage',
        value: '',
        min_purchase: '',
        max_discount: '',
        quota: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true
    });

    const fetchDiscounts = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('discounts')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDiscounts(data || []);
        } catch (err) {
            console.error("Gagal memuat diskon:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchDiscounts();
    }, [fetchDiscounts]);

    const handleOpenAddModal = () => {
        setEditingId(null);
        setForm({
            code: '',
            name: '',
            type: 'percentage',
            value: '',
            min_purchase: '',
            max_discount: '',
            quota: '100',
            start_date: new Date().toISOString().split('T')[0],
            end_date: '',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item) => {
        setEditingId(item.id);
        setForm({
            code: item.code || '',
            name: item.name || '',
            type: item.type || 'percentage',
            value: item.value || '',
            min_purchase: item.min_purchase || '',
            max_discount: item.max_discount || '',
            quota: item.quota || 100,
            start_date: item.start_date || '',
            end_date: item.end_date || '',
            is_active: item.is_active ?? true
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Hapus voucher/diskon "${name}" dari cabang ini?`)) {
            const { error } = await supabase
                .from('discounts')
                .delete()
                .eq('id', id)
                .eq('branch_id', branchId);

            if (error) {
                alert("Gagal menghapus: " + error.message);
            } else {
                setDiscounts(discounts.filter(d => d.id !== id));
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            organization_id: organizationId,
            branch_id: branchId,
            code: form.code.toUpperCase().trim(),
            name: form.name,
            type: form.type,
            value: parseFloat(form.value) || 0,
            min_purchase: parseFloat(form.min_purchase) || 0,
            max_discount: parseFloat(form.max_discount) || 0,
            quota: parseInt(form.quota) || 100,
            start_date: form.start_date || null,
            end_date: form.end_date || null,
            is_active: form.is_active
        };

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('discounts')
                    .update(payload)
                    .eq('id', editingId)
                    .eq('branch_id', branchId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('discounts')
                    .insert([payload]);
                if (error) throw error;
            }

            await fetchDiscounts();
            setIsModalOpen(false);
            alert("Voucher / Diskon berhasil disimpan!");
        } catch (err) {
            alert("Gagal menyimpan voucher: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Manajemen Diskon & Voucher Cabang</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Voucher ini otomatis berlaku dan tersinkron untuk POS Kasir, Kiosk, dan Self-Order QR.</p>
                </div>
                <button
                    onClick={handleOpenAddModal}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Buat Voucher Baru
                </button>
            </div>

            {/* List Voucher / Diskon */}
            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat data diskon & voucher...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {discounts.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                            Belum ada voucher atau diskon terdaftar untuk cabang ini.
                        </div>
                    ) : (
                        discounts.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div className="p-6 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="px-3 py-1 bg-orange-50 text-isaji-orange border border-orange-200 rounded-lg text-xs font-black tracking-wider uppercase font-mono">
                                            {item.code}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${item.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-gray-900 text-base">{item.name}</h4>
                                        <p className="text-2xl font-black text-isaji-navy mt-1">
                                            {item.type === 'percentage' ? `${item.value}%` : `Rp ${Number(item.value || 0).toLocaleString('id-ID')}`}
                                            <span className="text-xs font-normal text-gray-400 ml-1">Potongan</span>
                                        </p>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-50">
                                        <p>Min. Belanja: <strong className="text-gray-800">Rp {Number(item.min_purchase || 0).toLocaleString('id-ID')}</strong></p>
                                        <p>Kuota Tersisa: <strong className="text-gray-800">{item.quota}x pakai</strong></p>
                                        <p>Berlaku s/d: <strong className="text-gray-800">{item.end_date || 'Selamanya'}</strong></p>
                                    </div>
                                </div>
                                <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
                                    <button onClick={() => handleOpenEditModal(item)} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(item.id, item.name)} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Modal Form Tambah / Edit Voucher */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-black text-gray-900">{editingId ? 'Edit Voucher / Diskon' : 'Buat Voucher Baru'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kode Voucher</label>
                                    <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Cth: ISAJIHEBAT" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Program</label>
                                    <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: Promo Kemerdekaan" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipe Potongan</label>
                                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                                        <option value="percentage">Persentase (%)</option>
                                        <option value="fixed">Nominal Tetap (Rp)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nilai Potongan ({form.type === 'percentage' ? '%' : 'Rp'})</label>
                                    <input type="number" required min="1" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '15' : '10000'} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Min. Belanja (Rp)</label>
                                    <input type="number" min="0" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} placeholder="50000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kuota Penggunaan</label>
                                    <input type="number" min="1" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} placeholder="100" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Mulai</label>
                                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Berakhir</label>
                                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none bg-white" />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-isaji-navy rounded" />
                                    <span className="text-xs font-bold text-gray-700">Aktifkan voucher ini segera di kasir, kiosk, dan self-order</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">Simpan Voucher</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DiscountManager;