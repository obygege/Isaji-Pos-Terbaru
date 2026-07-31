import React, { useState, useEffect } from 'react';
import supabase from '../backend/lib/supabaseClient';

// MENERIMA PROP orgData DARI DASHBOARD
function Branches({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [branchForm, setBranchForm] = useState({
        name: '',
        code: '',
        phone: '',
        address: '',
        city: '',
        province: '',
        tax_mode: 'pb1_10',
        logo_url: '',
        is_active: true
    });

    // LANGSUNG FETCH DATA JIKA orgData SUDAH TERSEDIA
    useEffect(() => {
        if (orgData && orgData.id) {
            fetchBranches(orgData.id);
        } else {
            setIsLoading(false);
        }
    }, [orgData]);

    const fetchBranches = async (orgId) => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('branches')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching branches:', error);
        } else {
            setBranches(data || []);
        }
        setIsLoading(false);
    };

    const handleFormChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setBranchForm({ ...branchForm, [e.target.name]: value });
    };

    const openAddModal = () => {
        setEditingId(null);
        setBranchForm({
            name: '', code: '', phone: '', address: '', city: '', province: '',
            tax_mode: 'pb1_10', logo_url: '', is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (branch) => {
        setEditingId(branch.id);
        setBranchForm({
            name: branch.name || '',
            code: branch.code || '',
            phone: branch.phone || '',
            address: branch.address || '',
            city: branch.city || '',
            province: branch.province || '',
            tax_mode: branch.tax_mode || 'pb1_10',
            logo_url: branch.logo_url || '',
            is_active: branch.is_active !== false
        });
        setIsModalOpen(true);
    };

    const handleDeleteBranch = async (id, branchName) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus cabang "${branchName}"?`)) {
            setIsLoading(true);
            const { error } = await supabase.from('branches').delete().eq('id', id);

            if (error) {
                alert("Gagal menghapus cabang: " + error.message);
            } else {
                setBranches(branches.filter(b => b.id !== id));
            }
            setIsLoading(false);
        }
    };

    const handleSaveBranch = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // PASTIKAN ID ORGANISASI ADA
        if (!orgData || !orgData.id) {
            alert("Error: Data Organisasi belum dimuat. Silakan muat ulang halaman.");
            setIsLoading(false);
            return;
        }

        const payload = {
            organization_id: orgData.id,
            name: branchForm.name,
            code: branchForm.code,
            phone: branchForm.phone,
            address: branchForm.address,
            city: branchForm.city,
            province: branchForm.province,
            tax_mode: branchForm.tax_mode,
            logo_url: branchForm.logo_url,
            is_active: branchForm.is_active,
            updated_at: new Date().toISOString()
        };

        if (editingId) {
            const { error } = await supabase
                .from('branches')
                .update(payload)
                .eq('id', editingId);

            if (error) {
                alert("Gagal memperbarui cabang: " + error.message);
            } else {
                await fetchBranches(orgData.id);
                setIsModalOpen(false);
            }
        } else {
            const { error } = await supabase
                .from('branches')
                .insert([payload]);

            if (error) {
                alert("Gagal menambahkan cabang: " + error.message);
            } else {
                await fetchBranches(orgData.id);
                setIsModalOpen(false);
            }
        }
        setIsLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Daftar Cabang & Profil Usaha</h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola outlet, logo perusahaan, dan konfigurasi pajak penjualan per cabang.</p>
                </div>
                <button onClick={openAddModal} className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Cabang
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-32 space-y-4">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-isaji-navy rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Memuat data cabang...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                        <div key={branch.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all relative group flex flex-col h-full">

                            <div className="absolute top-4 right-4 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(branch)} className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md border border-gray-200 shadow-sm" title="Edit">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button onClick={() => handleDeleteBranch(branch.id, branch.name)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-100 shadow-sm" title="Hapus">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-14 h-14 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {branch.logo_url ? (
                                        <img src={branch.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    )}
                                </div>
                                <div className="pr-12">
                                    <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{branch.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {branch.code && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">{branch.code}</span>}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${branch.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {branch.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 flex-1">
                                {branch.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                        <span>{branch.phone}</span>
                                    </div>
                                )}
                                {branch.address && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                        <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        <span className="line-clamp-2 leading-relaxed">{branch.address} {branch.city && `, ${branch.city}`}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skema Pajak</span>
                                <span className="bg-orange-50 text-isaji-orange border border-orange-100 px-3 py-1 rounded-full text-xs font-bold">
                                    {branch.tax_mode === 'bebas' ? 'Bebas Pajak' :
                                        branch.tax_mode === 'pph_05' ? 'PPh Final 0.5%' :
                                            branch.tax_mode === 'pb1_10' ? 'PB1 Restoran 10%' : 'PPN 11%'}
                                </span>
                            </div>

                        </div>
                    ))}

                    {branches.length === 0 && !isLoading && (
                        <div className="col-span-full bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center text-center">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Belum ada cabang terdaftar</h3>
                            <p className="text-gray-500 text-sm mb-5">Mulai tambahkan cabang pertama Anda.</p>
                            <button onClick={openAddModal} className="bg-isaji-orange text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:bg-orange-600 transition-colors">
                                Tambah Cabang Sekarang
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingId ? 'Edit Data Cabang & Pajak' : 'Tambah Cabang Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-1 rounded-md">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveBranch} className="p-6 space-y-4 overflow-y-auto">

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">URL Logo Cabang / Perusahaan</label>
                                <input type="url" name="logo_url" value={branchForm.logo_url} onChange={handleFormChange} placeholder="https://example.com/logo.png" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all" />
                                <p className="text-xs text-gray-400 mt-1">Masukkan tautan langsung gambar logo Anda (PNG/JPG).</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Nama Cabang / Outlet <span className="text-red-500">*</span></label>
                                    <input type="text" name="name" value={branchForm.name} onChange={handleFormChange} required placeholder="Cth: Kopi Senja - Kemang" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all" />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Kode Cabang</label>
                                    <input type="text" name="code" value={branchForm.code} onChange={handleFormChange} placeholder="Cth: KMG01" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all uppercase" />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Nomor Telepon</label>
                                    <input type="tel" name="phone" value={branchForm.phone} onChange={handleFormChange} placeholder="0812xxxxxx" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Alamat Lengkap</label>
                                <textarea name="address" value={branchForm.address} onChange={handleFormChange} rows="2" placeholder="Nama jalan, gedung..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none resize-none text-sm transition-all"></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Kota / Kabupaten</label>
                                    <input type="text" name="city" value={branchForm.city} onChange={handleFormChange} placeholder="Cth: Jakarta Selatan" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Provinsi</label>
                                    <input type="text" name="province" value={branchForm.province} onChange={handleFormChange} placeholder="Cth: DKI Jakarta" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm transition-all" />
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                                <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-isaji-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>
                                    Pengaturan Skema Pajak Usaha
                                </label>
                                <select name="tax_mode" value={branchForm.tax_mode} onChange={handleFormChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy bg-white outline-none text-sm font-medium text-gray-700 cursor-pointer transition-all">
                                    <option value="bebas">UMKM - Bebas Pajak (Omzet &lt; Rp 500 Jt/Thn)</option>
                                    <option value="pph_05">UMKM - PPh Final 0.5% (PP 55/2022)</option>
                                    <option value="pb1_10">Restoran & Cafe - PB1 Maks 10% (Pajak Daerah)</option>
                                    <option value="ppn_11">PKP - PPN 11% (UU HPP)</option>
                                </select>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    *Digunakan untuk otomatisasi perhitungan pada laporan kasir dan cetak struk.
                                </p>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" name="is_active" checked={branchForm.is_active} onChange={handleFormChange} className="w-4 h-4 rounded text-isaji-navy focus:ring-isaji-navy border-gray-300" />
                                    <span className="text-sm font-bold text-gray-900">Cabang Aktif Beroperasi</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-all text-sm disabled:opacity-70">
                                    {editingId ? 'Simpan Perubahan' : 'Simpan Cabang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Branches;