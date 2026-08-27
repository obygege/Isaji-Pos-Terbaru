import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

// Atur jam masuk & jam pulang (shift) khusus cabang manajer ini.
// PENTING: semua query di-filter .eq('branch_id', branchId) biar shift cabang lain gak ikut kebawa/keubah.
function ShiftManager({ branchId }) {
    const [shifts, setShifts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [form, setForm] = useState({ name: '', start_time: '08:00', end_time: '17:00', employee_id: '' });
    const [editingId, setEditingId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [savingEmpId, setSavingEmpId] = useState(null);

    const fetchAll = useCallback(async () => {
        setIsLoading(true);
        const [{ data: sh }, { data: emp }] = await Promise.all([
            supabase.from('shifts').select('*').eq('branch_id', branchId).order('start_time', { ascending: true }),
            // Ambil karyawan yang MEMANG sudah terdaftar di cabang ini saja (manajer & staff), jadi tinggal pilih nama, gak input manual
            supabase.from('employees').select('id, full_name, position, default_shift_id').eq('branch_id', branchId).eq('is_active', true).order('full_name', { ascending: true }),
        ]);
        setShifts(sh || []);
        setEmployees(emp || []);
        setIsLoading(false);
    }, [branchId]);

    useEffect(() => { if (branchId) fetchAll(); }, [branchId, fetchAll]);

    const resetForm = () => {
        setForm({ name: '', start_time: '08:00', end_time: '17:00', employee_id: '' });
        setEditingId(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return alert('Nama shift wajib diisi.');
        setIsSaving(true);
        try {
            let shiftId = editingId;
            if (editingId) {
                const { error } = await supabase
                    .from('shifts')
                    .update({ name: form.name, start_time: form.start_time, end_time: form.end_time })
                    .eq('id', editingId)
                    .eq('branch_id', branchId); // jaga-jaga: gak bisa edit shift cabang lain
                if (error) throw error;
            } else {
                const { data: inserted, error } = await supabase
                    .from('shifts')
                    .insert([{ name: form.name, start_time: form.start_time, end_time: form.end_time, branch_id: branchId }])
                    .select()
                    .single();
                if (error) throw error;
                shiftId = inserted.id;
            }

            // Kalau manajer sekalian pilih nama karyawan di form ini, langsung pasangkan shift ke karyawan itu
            if (form.employee_id) {
                const { error: assignErr } = await supabase
                    .from('employees')
                    .update({ default_shift_id: shiftId })
                    .eq('id', form.employee_id)
                    .eq('branch_id', branchId);
                if (assignErr) throw assignErr;
            }

            resetForm();
            fetchAll();
        } catch (err) {
            alert('Gagal menyimpan shift: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (shift) => {
        setEditingId(shift.id);
        setForm({ name: shift.name, start_time: shift.start_time?.slice(0, 5) || '08:00', end_time: shift.end_time?.slice(0, 5) || '17:00' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus shift ini?')) return;
        const { error } = await supabase.from('shifts').delete().eq('id', id).eq('branch_id', branchId);
        if (error) return alert('Gagal hapus: ' + error.message);
        fetchAll();
    };

    const assignShiftToEmployee = async (employeeId, shiftId) => {
        setSavingEmpId(employeeId);
        const { error } = await supabase
            .from('employees')
            .update({ default_shift_id: shiftId || null })
            .eq('id', employeeId)
            .eq('branch_id', branchId); // gak bisa ubah karyawan cabang lain
        if (error) alert('Gagal simpan: ' + error.message + '\n\nPastikan kolom employees.default_shift_id sudah ditambahkan (lihat migration).');
        else fetchAll();
        setSavingEmpId(null);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Atur Shift Kerja</h3>
                <p className="text-sm text-gray-500 mt-0.5">Jam masuk & jam pulang khusus cabang ini. Dipakai kiosk absensi untuk hitung telat.</p>

                <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                        type="text" placeholder="Nama shift (mis. Shift Pagi)"
                        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none md:col-span-2"
                    />
                    <input
                        type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none"
                    />
                    <input
                        type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none"
                    />

                    <div className="md:col-span-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">Pasangkan langsung ke karyawan (opsional)</label>
                        <select
                            value={form.employee_id}
                            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                            className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none bg-white"
                        >
                            <option value="">- Pilih Nama Karyawan (opsional) -</option>
                            {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}{emp.position ? ` — ${emp.position}` : ''}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Daftar nama diambil langsung dari karyawan yang sudah terdaftar di cabang ini. Kalau dipilih, shift ini otomatis jadi jam kerja karyawan tsb.</p>
                    </div>

                    <div className="md:col-span-4 flex gap-2">
                        <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-isaji-navy text-white text-sm font-bold disabled:opacity-50">
                            {isSaving ? 'Menyimpan...' : editingId ? 'Update Shift' : '+ Tambah Shift'}
                        </button>
                        {editingId && (
                            <button type="button" onClick={resetForm} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">
                                Batal
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Pasang Shift ke Karyawan</h3>
                <p className="text-sm text-gray-500 mt-0.5">Tinggal pilih nama karyawan yang sudah terdaftar di cabang ini, lalu pilih shiftnya. Tidak perlu input manual.</p>

                <div className="mt-4 overflow-hidden rounded-xl border border-gray-100">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3">Nama Karyawan</th>
                                <th className="px-6 py-3">Posisi</th>
                                <th className="px-6 py-3">Shift</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Memuat...</td></tr>
                            ) : employees.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Belum ada karyawan aktif di cabang ini. Tambahkan dulu di menu Karyawan.</td></tr>
                            ) : shifts.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-400">Buat shift dulu di atas, baru bisa dipasangkan ke karyawan.</td></tr>
                            ) : employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-3 font-bold text-gray-900">{emp.full_name}</td>
                                    <td className="px-6 py-3 text-gray-500 capitalize">{emp.position || '-'}</td>
                                    <td className="px-6 py-3">
                                        <select
                                            value={emp.default_shift_id || ''}
                                            disabled={savingEmpId === emp.id}
                                            onChange={(e) => assignShiftToEmployee(emp.id, e.target.value)}
                                            className="text-sm font-bold border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-gray-50 disabled:opacity-50"
                                        >
                                            <option value="">- Belum dipasang -</option>
                                            {shifts.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.start_time?.slice(0, 5)}-{s.end_time?.slice(0, 5)})</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Nama Shift</th>
                            <th className="px-6 py-4">Jam Masuk</th>
                            <th className="px-6 py-4">Jam Pulang</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-400">Memuat...</td></tr>
                        ) : shifts.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-10 text-center text-gray-400">Belum ada shift untuk cabang ini.</td></tr>
                        ) : shifts.map((s) => (
                            <tr key={s.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-bold text-gray-900">{s.name}</td>
                                <td className="px-6 py-4 font-mono text-gray-600">{s.start_time?.slice(0, 5)}</td>
                                <td className="px-6 py-4 font-mono text-gray-600">{s.end_time?.slice(0, 5)}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEdit(s)} className="text-xs font-bold text-isaji-navy hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(s.id)} className="text-xs font-bold text-red-500 hover:underline">Hapus</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default ShiftManager;