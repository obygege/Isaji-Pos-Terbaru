import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function EmployeeManager({ branchId, organizationId }) {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        full_name: '',
        position: 'kasir',
        phone: '',
        pin: '',
        is_active: true
    });

    const fetchEmployees = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (err) {
            console.error("Gagal memuat karyawan:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        if (branchId) {
            fetchEmployees();
        }
    }, [branchId, fetchEmployees]);

    const handleFormChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setForm({ ...form, [e.target.name]: value });
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm({
            full_name: '',
            position: 'kasir',
            phone: '',
            pin: '',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const openEditModal = (emp) => {
        setEditingId(emp.id);
        setForm({
            full_name: emp.full_name || '',
            position: emp.position || 'kasir',
            phone: emp.phone || '',
            pin: emp.pin || '',
            is_active: emp.is_active !== false
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Hapus data karyawan "${name}" dari cabang ini?`)) {
            const { error } = await supabase.from('employees').delete().eq('id', id);
            if (error) {
                alert("Gagal menghapus: " + error.message);
            } else {
                setEmployees(employees.filter(e => e.id !== id));
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            organization_id: organizationId,
            branch_id: branchId,
            full_name: form.full_name,
            position: form.position, // Hanya 'kasir' atau 'dapur'
            phone: form.phone,
            pin: form.pin,
            is_active: form.is_active,
            updated_at: new Date().toISOString()
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('employees').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('employees').insert([payload]);
                if (error) throw error;
            }

            await fetchEmployees();
            setIsModalOpen(false);
            alert("Data karyawan berhasil disimpan!");
        } catch (error) {
            alert("Gagal menyimpan: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Tim & Karyawan Cabang</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Kelola staf operasional kasir & dapur beserta PIN login POS.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                >
                    + Tambah Staf Cabang
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-400 font-medium">Memuat data staf...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Nama Staf</th>
                                <th className="px-6 py-4">Posisi</th>
                                <th className="px-6 py-4">PIN POS</th>
                                <th className="px-6 py-4">No. Telp / WA</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {employees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        Belum ada staf terdaftar di cabang ini.
                                    </td>
                                </tr>
                            ) : (
                                employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{emp.full_name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${emp.position === 'kasir' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                                }`}>
                                                {emp.position}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold tracking-widest text-gray-600">{emp.pin || '---'}</td>
                                        <td className="px-6 py-4 text-gray-500">{emp.phone || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${emp.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                {emp.is_active ? 'Aktif' : 'Non-Aktif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openEditModal(emp)} className="text-blue-600 font-bold hover:underline text-xs">Edit</button>
                                            <button onClick={() => handleDelete(emp.id, emp.full_name)} className="text-red-500 font-bold hover:underline text-xs">Hapus</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">{editingId ? 'Edit Staf' : 'Tambah Staf Cabang'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Lengkap</label>
                                <input type="text" name="full_name" required value={form.full_name} onChange={handleFormChange} placeholder="Cth: Siti Aminah" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-isaji-navy/20 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Posisi</label>
                                    <select name="position" value={form.position} onChange={handleFormChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm bg-white">
                                        <option value="kasir">Kasir</option>
                                        <option value="dapur">Dapur / Kitchen</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN POS (4-6 digit)</label>
                                    <input type="text" name="pin" maxLength="6" required value={form.pin} onChange={handleFormChange} placeholder="1234" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none font-mono text-sm tracking-widest" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">No. Telp / WhatsApp</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleFormChange} placeholder="0812..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} className="w-4 h-4 rounded text-isaji-navy" />
                                <span className="text-sm font-bold text-gray-700">Staf Aktif (Dapat Login POS)</span>
                            </label>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy hover:bg-blue-900 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">{isLoading ? 'Menyimpan...' : 'Simpan'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeManager;