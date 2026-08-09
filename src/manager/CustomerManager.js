import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function CustomerManager({ branchId, organizationId, branchName }) {
    const [customers, setCustomers] = useState([]);
    const [orderStats, setOrderStats] = useState({}); // phone -> { count, total }
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', phone: '', subscribe_promo: true });
    const [isSaving, setIsSaving] = useState(false);

    // Customer bersifat per-organisasi (akun login sendiri), bukan per-cabang --
    // jadi kita tampilkan seluruh member organisasi, lalu hitung statistik
    // transaksi mereka KHUSUS di cabang ini (dicocokkan lewat nomor telepon,
    // karena tabel orders belum punya relasi langsung ke tabel customers).
    const fetchCustomers = useCallback(async () => {
        if (!organizationId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);

            const phones = (data || []).map((c) => c.phone).filter(Boolean);
            if (phones.length > 0 && branchId) {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('customer_phone, total_amount, status')
                    .eq('branch_id', branchId)
                    .in('customer_phone', phones);

                const stats = {};
                (orders || []).forEach((o) => {
                    if (o.status === 'cancelled') return;
                    if (!stats[o.customer_phone]) stats[o.customer_phone] = { count: 0, total: 0 };
                    stats[o.customer_phone].count += 1;
                    stats[o.customer_phone].total += Number(o.total_amount || 0);
                });
                setOrderStats(stats);
            }
        } catch (err) {
            console.error('Gagal memuat pelanggan:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, branchId]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const openEdit = (customer) => {
        setSelectedCustomer(customer);
        setEditForm({
            full_name: customer.full_name || '',
            phone: customer.phone || '',
            subscribe_promo: customer.subscribe_promo ?? true,
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone,
                    subscribe_promo: editForm.subscribe_promo,
                })
                .eq('user_id', selectedCustomer.user_id);

            if (error) throw error;
            await fetchCustomers();
            setSelectedCustomer(null);
        } catch (err) {
            alert('Gagal menyimpan perubahan: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`Hapus profil member "${customer.full_name}"? Ini hanya menghapus data profilnya (nama/telepon/langganan promo) -- akun login Supabase Auth-nya TIDAK ikut terhapus.`)) return;
        try {
            const { error } = await supabase.from('customers').delete().eq('user_id', customer.user_id);
            if (error) throw error;
            setCustomers((prev) => prev.filter((c) => c.user_id !== customer.user_id));
        } catch (err) {
            alert('Gagal menghapus profil: ' + err.message);
        }
    };

    const filtered = customers.filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.full_name?.toLowerCase().includes(term) || c.phone?.includes(term);
    });

    const totalSubscribed = customers.filter((c) => c.subscribe_promo).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Manajemen Pelanggan (CRM) — {branchName}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Database member yang sudah daftar lewat Self-Order, beserta riwayat transaksi di cabang ini.</p>
                </div>
                <input
                    type="text"
                    placeholder="Cari nama / no. HP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-isaji-navy/20 text-sm w-full md:w-64"
                />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase">Total Member</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">{customers.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase">Langganan Info Promo</p>
                    <p className="text-2xl font-black text-green-600 mt-1">{totalSubscribed}</p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat database pelanggan...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                    Belum ada pelanggan yang daftar sebagai member. Member baru muncul otomatis di sini begitu mereka daftar lewat halaman Self-Order.
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-5 py-3">Nama</th>
                                    <th className="px-5 py-3">No. HP</th>
                                    <th className="px-5 py-3">Promo</th>
                                    <th className="px-5 py-3">Transaksi di Cabang Ini</th>
                                    <th className="px-5 py-3">Total Belanja</th>
                                    <th className="px-5 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => {
                                    const stat = orderStats[c.phone] || { count: 0, total: 0 };
                                    return (
                                        <tr key={c.user_id} className="border-b border-gray-50 hover:bg-gray-50/60">
                                            <td className="px-5 py-3 font-bold text-gray-900">{c.full_name}</td>
                                            <td className="px-5 py-3 text-gray-600 font-mono text-xs">{c.phone || '-'}</td>
                                            <td className="px-5 py-3">
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.subscribe_promo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                    {c.subscribe_promo ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-gray-700">{stat.count}x</td>
                                            <td className="px-5 py-3 font-bold text-isaji-navy">Rp {stat.total.toLocaleString('id-ID')}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => openEdit(c)} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors">
                                                        Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(c)} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">Edit Profil Member</h3>
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.full_name}
                                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-isaji-navy/20 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. HP</label>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-isaji-navy/20 text-sm font-mono"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editForm.subscribe_promo}
                                    onChange={(e) => setEditForm({ ...editForm, subscribe_promo: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-isaji-navy focus:ring-isaji-navy/30"
                                />
                                <span className="text-sm font-bold text-gray-700">Berlangganan info diskon & promo</span>
                            </label>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setSelectedCustomer(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isSaving} className="flex-1 bg-isaji-navy hover:bg-blue-900 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">{isSaving ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerManager;