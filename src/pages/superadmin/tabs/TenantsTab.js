import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

export default function TenantsTab({ searchQuery }) {
    const [orgs, setOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // State Form
    const [formData, setFormData] = useState({ name: '', subdomain: '', owner_id: '' });

    const fetchTenants = useCallback(async () => {
        const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            // Hitung jumlah cabang per tenant (kolom branches.organization_id)
            const { data: branchRows } = await supabase.from('branches').select('organization_id');
            const branchCountMap = {};
            (branchRows || []).forEach(b => {
                branchCountMap[b.organization_id] = (branchCountMap[b.organization_id] || 0) + 1;
            });
            setOrgs(data.map(org => ({ ...org, branch_count: branchCountMap[org.id] || 0 })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    const toggleTenantStatus = async (id, currentStatus) => {
        if (window.confirm(`Yakin ingin ${currentStatus ? 'Nonaktifkan' : 'Aktifkan'} tenant ini?`)) {
            await supabase.from('organizations').update({ is_active: !currentStatus }).eq('id', id);
            fetchTenants();
        }
    };

    const handleCreateTenant = async (e) => {
        e.preventDefault();
        // Insert Real ke Supabase
        const { error } = await supabase.from('organizations').insert([{
            name: formData.name,
            subdomain: formData.subdomain,
            owner_id: formData.owner_id, // Wajib diisi ID User Valid
            subscription_plan: 'trial',
            subscription_status: 'unpaid'
        }]);

        if (error) {
            alert("Gagal Tambah Tenant. Pastikan Owner ID Valid!\nError: " + error.message);
        } else {
            alert("Tenant Berhasil Ditambahkan!");
            setShowModal(false);
            setFormData({ name: '', subdomain: '', owner_id: '' });
            fetchTenants();
        }
    };

    const filteredOrgs = orgs.filter(o => o.name.toLowerCase().includes(searchQuery.toLowerCase()) || o.subdomain.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loading) return <div className="text-isaji-orange font-bold">Memuat Tenant...</div>;

    return (
        <div className="animate-fade-in relative">
            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-sm font-black text-gray-900 uppercase">Daftar Tenant</h2>
                    <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-colors">+ Tambah Tenant</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-100">
                                <th className="p-4 font-black">Nama Tenant</th>
                                <th className="p-4 font-black">Subdomain URL</th>
                                <th className="p-4 font-black">Plan</th>
                                <th className="p-4 font-black">Cabang</th>
                                <th className="p-4 font-black">Trial / Expiry</th>
                                <th className="p-4 font-black">Status</th>
                                <th className="p-4 font-black text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredOrgs.map((org) => (
                                <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4 font-bold text-gray-900">
                                        {org.name}
                                        <div className="text-[10px] font-normal text-gray-400 mt-0.5">{org.id}</div>
                                    </td>
                                    <td className="p-4 text-blue-600 font-mono text-xs">{org.subdomain}.isajipos.com</td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold capitalize text-gray-700">{org.subscription_plan || '-'}</span>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-gray-700">{org.branch_count}</td>
                                    <td className="p-4 text-xs text-gray-500">
                                        {org.trial_ends_at
                                            ? `Trial s/d ${new Date(org.trial_ends_at).toLocaleDateString('id-ID')}`
                                            : org.subscription_expires_at
                                                ? `Exp ${new Date(org.subscription_expires_at).toLocaleDateString('id-ID')}`
                                                : '-'}
                                    </td>
                                    <td className="p-4">
                                        {org.is_active ?
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-600"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Aktif</span> :
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Nonaktif</span>
                                        }
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        <button onClick={() => toggleTenantStatus(org.id, org.is_active)} className="text-[10px] font-bold px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100">
                                            {org.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM TAMBAH TENANT */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                        <h3 className="font-black text-xl mb-1 text-gray-900">Registrasi Tenant Baru</h3>
                        <p className="text-xs text-gray-500 mb-6">Database akan menambah struktur data otomatis untuk tenant ini.</p>

                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nama Brand / Bisnis</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange" placeholder="Kopi Kenangan" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Subdomain</label>
                                <div className="flex">
                                    <input type="text" required value={formData.subdomain} onChange={e => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })} className="w-full px-4 py-3 rounded-l-xl border border-gray-200 border-r-0 text-sm outline-none focus:border-isaji-orange" placeholder="kopikenangan" />
                                    <div className="bg-gray-50 px-4 py-3 border border-gray-200 border-l-0 rounded-r-xl text-gray-500 text-sm">.isajipos.com</div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">ID Supabase Pemilik (UUID)</label>
                                <input type="text" required value={formData.owner_id} onChange={e => setFormData({ ...formData, owner_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs font-mono outline-none focus:border-isaji-orange" placeholder="Contoh: 123e4567-e89b-12d3-..." />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Batal</button>
                                <button type="submit" className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-black">Simpan Tenant</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}