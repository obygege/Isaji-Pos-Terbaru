import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import supabase, { supabaseUrl, supabaseKey } from '../backend/lib/supabaseClient';

function Employees({ orgData }) {
    const [employees, setEmployees] = useState([]);
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        full_name: '',
        position: 'kasir',
        branch_id: '',
        phone: '',
        pin: '',
        email: '',
        password: '',
        is_active: true
    });

    useEffect(() => {
        if (orgData && orgData.id) {
            fetchInitialData(orgData.id);
        } else {
            setIsLoading(false);
        }
    }, [orgData]);

    const fetchInitialData = async (orgId) => {
        setIsLoading(true);
        try {
            const { data: branchData, error: branchError } = await supabase
                .from('branches')
                .select('id, name')
                .eq('organization_id', orgId)
                .eq('is_active', true);
            if (branchError) throw branchError;
            setBranches(branchData || []);

            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select(`*, branches ( name )`)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });
            if (empError) throw empError;
            setEmployees(empData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
            alert("Gagal memuat data: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const openAddModal = () => {
        if (branches.length === 0) {
            alert("Anda belum memiliki Cabang. Silakan buat Cabang terlebih dahulu.");
            return;
        }
        setEditingId(null);
        setForm({
            full_name: '', position: 'kasir', branch_id: branches[0]?.id || '', phone: '', pin: '', email: '', password: '', is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (emp) => {
        setEditingId(emp.id);
        setForm({
            full_name: emp.full_name || '',
            position: emp.position || 'kasir',
            branch_id: emp.branch_id || '',
            phone: emp.phone || '',
            pin: emp.pin || '',
            email: emp.email || '',
            password: '',
            is_active: emp.is_active !== false
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, empName) => {
        if (window.confirm(`Hapus akses karyawan "${empName}" secara permanen?`)) {
            setIsLoading(true);
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) alert("Gagal menghapus data: " + error.message);
            else setEmployees(employees.filter(e => e.id !== id));
            setIsLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!orgData || !orgData.id) {
            alert("Akses ditolak: Data Organisasi tidak valid.");
            setIsLoading(false);
            return;
        }

        let newUserId = null;

        // --- TRIK SILENT SIGNUP DENGAN PENANGKAPAN ERROR EMAIL DOUBLE ---
        if (form.position === 'manajer' && !editingId) {
            if (!form.email || !form.password) {
                alert("Email dan Password WAJIB diisi untuk membuat akun Manajer.");
                setIsLoading(false);
                return;
            }

            try {
                const silentSupabase = createClient(supabaseUrl, supabaseKey, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });

                const { data: authData, error: authError } = await silentSupabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                });

                if (authError) {
                    // Cek apakah error karena email sudah terdaftar / duplikat
                    if (authError.message.toLowerCase().includes('already registered') ||
                        authError.message.toLowerCase().includes('already taken') ||
                        authError.status === 400) {
                        throw new Error(`Email "${form.email}" sudah pernah terdaftar di sistem. Gunakan email lain.`);
                    }
                    throw authError;
                }

                if (authData?.user) {
                    // Memastikan ID benar-benar ada (menghindari ID palsu dari pencegahan enum)
                    if (!authData.user.identities || authData.user.identities.length === 0) {
                        throw new Error(`Email "${form.email}" sudah terdaftar di sistem. Gunakan email lain.`);
                    }
                    newUserId = authData.user.id;
                } else {
                    throw new Error("Gagal mendaftarkan akun. Pastikan format email benar.");
                }
            } catch (err) {
                alert("Peringatan Pendaftaran Manajer:\n\n" + err.message);
                setIsLoading(false);
                return; // Stop proses penyimpanan jika email duplikat
            }
        }

        // --- SIMPAN KE TABEL EMPLOYEES ---
        const payload = {
            organization_id: orgData.id,
            branch_id: form.branch_id,
            full_name: form.full_name,
            position: form.position,
            phone: form.phone,
            pin: form.pin,
            email: form.position === 'manajer' ? form.email : null,
            is_active: form.is_active,
            updated_at: new Date().toISOString()
        };

        if (newUserId) {
            payload.user_id = newUserId;
        }

        try {
            if (editingId) {
                const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('employees').insert([payload]);
                if (error) throw error;
            }

            await fetchInitialData(orgData.id);
            setIsModalOpen(false);
            if (form.position === 'manajer' && !editingId) {
                alert("Berhasil! Akun Manajer sudah aktif dan bisa langsung digunakan untuk Login Web.");
            }
        } catch (error) {
            alert("Gagal menyimpan data ke database: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleBadge = (pos) => {
        switch (pos) {
            case 'manajer': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'dapur': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Tim & Karyawan</h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola akses, posisi, dan PIN login kasir per cabang.</p>
                </div>
                <button onClick={openAddModal} className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Karyawan
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col justify-center items-center py-32 space-y-4">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-isaji-navy rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Memuat data karyawan...</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold tracking-wider">Nama Karyawan</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Penempatan Cabang</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Posisi</th>
                                    <th className="px-6 py-4 font-bold tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-bold tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            Belum ada karyawan terdaftar.<br />Klik "Tambah Karyawan" untuk mulai mengatur tim Anda.
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map((emp) => (
                                        <tr key={emp.id} className="bg-white border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-isaji-navy/10 flex items-center justify-center text-isaji-navy font-bold flex-shrink-0">
                                                        {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{emp.full_name}</p>
                                                        <p className="text-xs text-gray-500">{emp.email || emp.phone || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700">
                                                {emp.branches?.name || <span className="text-red-500 italic">Cabang Terhapus</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border ${getRoleBadge(emp.position)}`}>
                                                    {emp.position}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${emp.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                    <span className={`text-xs font-bold ${emp.is_active ? 'text-green-700' : 'text-red-700'}`}>
                                                        {emp.is_active ? 'Aktif' : 'Non-Aktif'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditModal(emp)} className="text-gray-400 hover:text-isaji-navy px-2 transition-colors" title="Edit">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                </button>
                                                <button onClick={() => handleDelete(emp.id, emp.full_name)} className="text-gray-400 hover:text-red-500 px-2 transition-colors" title="Hapus">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>

                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingId ? 'Edit Data Karyawan' : 'Tambah Karyawan'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-1">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                                <input type="text" name="full_name" value={form.full_name} onChange={handleFormChange} required placeholder="Cth: Budi Santoso" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 focus:border-isaji-navy outline-none text-sm transition-all" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Penempatan Cabang <span className="text-red-500">*</span></label>
                                    <select name="branch_id" value={form.branch_id} onChange={handleFormChange} required className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 outline-none text-sm cursor-pointer bg-white">
                                        <option value="" disabled>Pilih Cabang</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Posisi / Jabatan</label>
                                    <select name="position" value={form.position} onChange={handleFormChange} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 outline-none text-sm cursor-pointer bg-white">
                                        <option value="kasir">Kasir</option>
                                        <option value="dapur">Dapur / Kitchen</option>
                                        <option value="manajer">Manajer Cabang</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">PIN Akses POS <span className="text-red-500">*</span></label>
                                    <input type="text" maxLength="6" pattern="\d*" name="pin" value={form.pin} onChange={handleFormChange} required placeholder="123456" className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 outline-none text-sm tracking-widest font-mono" />
                                    <p className="text-[10px] text-gray-400 mt-1">Wajib u/ Login Mesin Kasir</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">No. Telepon / WA</label>
                                    <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="0812..." className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-isaji-navy/20 outline-none text-sm" />
                                </div>
                            </div>

                            {form.position === 'manajer' && (
                                <div className="bg-orange-50 border border-isaji-orange/30 p-4 rounded-xl space-y-4">
                                    <p className="text-xs font-bold text-isaji-orange uppercase tracking-wider mb-2">Buat Akun Dashboard Manajer</p>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Alamat Email Manajer</label>
                                        <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="manajer@cafe.com" required={form.position === 'manajer'} disabled={!!editingId} className="w-full px-4 py-2.5 rounded-lg border border-orange-200 focus:ring-2 focus:ring-isaji-orange/20 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-400" />
                                    </div>
                                    {!editingId && (
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Buat Password Login</label>
                                            <input type="text" name="password" value={form.password} onChange={handleFormChange} placeholder="Minimal 6 Karakter" required={form.position === 'manajer' && !editingId} minLength="6" className="w-full px-4 py-2.5 rounded-lg border border-orange-200 focus:ring-2 focus:ring-isaji-orange/20 outline-none text-sm" />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2">
                                <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} className="w-4 h-4 rounded text-isaji-navy focus:ring-isaji-navy border-gray-300" />
                                    <span className="text-sm font-bold text-gray-900">Izinkan Karyawan Login (Aktif)</span>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-gray-100 mt-6 shrink-0">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors text-sm">
                                    Batal
                                </button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-lg font-bold hover:bg-blue-900 transition-all text-sm disabled:opacity-70">
                                    {editingId ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Employees;