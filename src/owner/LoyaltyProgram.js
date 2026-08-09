import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

const emptyForm = {
    branch_id: '',
    code: '',
    name: '',
    type: 'percentage',
    value: 0,
    min_purchase: 0,
    max_discount: 0,
    quota: 100,
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    is_active: true,
};

function LoyaltyProgram({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgData.id);
            setBranches(branchData || []);

            const { data, error } = await supabase
                .from('discounts')
                .select('*, branches(name)')
                .eq('organization_id', orgData.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setDiscounts(data || []);
        } catch (err) {
            console.error('Gagal memuat program loyalitas:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleFormChange = (e) => {
        const { name, type, value, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm({ ...emptyForm, branch_id: branches[0]?.id || '' });
        setIsModalOpen(true);
    };

    const openEditModal = (d) => {
        setEditingId(d.id);
        setForm({
            branch_id: d.branch_id,
            code: d.code,
            name: d.name,
            type: d.type,
            value: d.value,
            min_purchase: d.min_purchase || 0,
            max_discount: d.max_discount || 0,
            quota: d.quota || 100,
            start_date: d.start_date,
            end_date: d.end_date,
            is_active: d.is_active,
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.branch_id) { alert('Pilih cabang terlebih dahulu.'); return; }
        setIsSaving(true);
        try {
            const payload = {
                organization_id: orgData.id,
                branch_id: form.branch_id,
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                type: form.type,
                value: parseFloat(form.value) || 0,
                min_purchase: parseFloat(form.min_purchase) || 0,
                max_discount: parseFloat(form.max_discount) || 0,
                quota: parseInt(form.quota, 10) || 0,
                start_date: form.start_date,
                end_date: form.end_date,
                is_active: form.is_active,
            };

            if (editingId) {
                const { error } = await supabase.from('discounts').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('discounts').insert([payload]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            await fetchData();
        } catch (err) {
            alert('Gagal menyimpan kode promo: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (d) => {
        const { error } = await supabase.from('discounts').update({ is_active: !d.is_active }).eq('id', d.id);
        if (error) { alert('Gagal mengubah status: ' + error.message); return; }
        fetchData();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus kode promo ini?')) return;
        const { error } = await supabase.from('discounts').delete().eq('id', id);
        if (error) { alert('Gagal menghapus: ' + error.message); return; }
        fetchData();
    };

    const activeCount = discounts.filter(d => d.is_active).length;
    const today = new Date().toISOString().slice(0, 10);
    const expiredCount = discounts.filter(d => d.end_date < today).length;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Kode Promo</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{discounts.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-green-500 uppercase tracking-wider">Aktif</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{activeCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Kadaluarsa</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{expiredCount}</p>
                </div>
            </div>

            <div className="flex justify-end">
                <button onClick={openAddModal} className="bg-isaji-navy text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-sm hover:bg-blue-900">
                    + Buat Kode Promo
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data promo...</div>
                ) : discounts.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Belum ada kode promo. Klik "Buat Kode Promo" untuk memulai.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Kode</th>
                                    <th className="px-6 py-3">Nama</th>
                                    <th className="px-6 py-3">Cabang</th>
                                    <th className="px-6 py-3">Nilai</th>
                                    <th className="px-6 py-3 text-right">Kuota</th>
                                    <th className="px-6 py-3">Periode</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {discounts.map((d) => (
                                    <tr key={d.id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 font-black text-isaji-navy">{d.code}</td>
                                        <td className="px-6 py-3 text-gray-700">{d.name}</td>
                                        <td className="px-6 py-3 text-gray-500">{d.branches?.name || '-'}</td>
                                        <td className="px-6 py-3 text-gray-700">
                                            {d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)}
                                        </td>
                                        <td className="px-6 py-3 text-right text-gray-500">{d.quota}</td>
                                        <td className="px-6 py-3 text-gray-500 whitespace-nowrap">{d.start_date} s/d {d.end_date}</td>
                                        <td className="px-6 py-3">
                                            <button onClick={() => handleToggleActive(d)} className={`px-2 py-1 rounded-full text-[11px] font-bold ${d.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {d.is_active ? 'Aktif' : 'Nonaktif'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-right space-x-3 whitespace-nowrap">
                                            <button onClick={() => openEditModal(d)} className="text-isaji-navy font-bold text-xs hover:underline">Edit</button>
                                            <button onClick={() => handleDelete(d.id)} className="text-red-500 font-bold text-xs hover:underline">Hapus</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-black text-lg text-gray-900">{editingId ? 'Edit Kode Promo' : 'Buat Kode Promo Baru'}</h3>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Cabang</label>
                            <select name="branch_id" value={form.branch_id} onChange={handleFormChange} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                                <option value="">Pilih cabang</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Kode Promo</label>
                                <input name="code" value={form.code} onChange={handleFormChange} required placeholder="PROMO10" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 uppercase" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nama Promo</label>
                                <input name="name" value={form.name} onChange={handleFormChange} required placeholder="Diskon Loyalitas" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Tipe</label>
                                <select name="type" value={form.type} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
                                    <option value="percentage">Persentase (%)</option>
                                    <option value="fixed">Nominal (Rp)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nilai</label>
                                <input type="number" name="value" value={form.value} onChange={handleFormChange} required min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Min. Pembelian</label>
                                <input type="number" name="min_purchase" value={form.min_purchase} onChange={handleFormChange} min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Maks. Diskon</label>
                                <input type="number" name="max_discount" value={form.max_discount} onChange={handleFormChange} min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Kuota</label>
                                <input type="number" name="quota" value={form.quota} onChange={handleFormChange} min="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Mulai</label>
                                <input type="date" name="start_date" value={form.start_date} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Berakhir</label>
                                <input type="date" name="end_date" value={form.end_date} onChange={handleFormChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" />
                            </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} />
                            Aktifkan promo ini
                        </label>

                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-500 rounded-lg hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-isaji-navy rounded-lg hover:bg-blue-900 disabled:opacity-50">
                                {isSaving ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default LoyaltyProgram;