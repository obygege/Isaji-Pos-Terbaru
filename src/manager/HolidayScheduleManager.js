import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];

// Catatan: butuh tabel `branch_holidays` & `employee_schedules`.
// Lihat supabase/migrations/2026_attendance_upgrade.sql
function HolidayScheduleManager({ branchId }) {
    const [tab, setTab] = useState('holiday'); // holiday | schedule

    const [holidays, setHolidays] = useState([]);
    const [holidayForm, setHolidayForm] = useState({ holiday_date: '', name: '' });
    const [loadingHolidays, setLoadingHolidays] = useState(true);

    const [employees, setEmployees] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loadingSchedule, setLoadingSchedule] = useState(true);

    const fetchHolidays = useCallback(async () => {
        setLoadingHolidays(true);
        const { data, error } = await supabase
            .from('branch_holidays')
            .select('*')
            .eq('branch_id', branchId)
            .order('holiday_date', { ascending: true });
        if (!error) setHolidays(data || []);
        setLoadingHolidays(false);
    }, [branchId]);

    const fetchScheduleData = useCallback(async () => {
        setLoadingSchedule(true);
        const [{ data: emp }, { data: sh }, { data: sc }] = await Promise.all([
            supabase.from('employees').select('id, full_name, position').eq('branch_id', branchId).eq('is_active', true),
            supabase.from('shifts').select('*').eq('branch_id', branchId),
            supabase.from('employee_schedules').select('*').eq('branch_id', branchId),
        ]);
        setEmployees(emp || []);
        setShifts(sh || []);
        setSchedules(sc || []);
        setLoadingSchedule(false);
    }, [branchId]);

    useEffect(() => {
        if (!branchId) return;
        fetchHolidays();
        fetchScheduleData();
    }, [branchId, fetchHolidays, fetchScheduleData]);

    const addHoliday = async (e) => {
        e.preventDefault();
        if (!holidayForm.holiday_date || !holidayForm.name.trim()) return alert('Tanggal & nama libur wajib diisi.');
        const { error } = await supabase.from('branch_holidays').insert([{ ...holidayForm, branch_id: branchId }]);
        if (error) return alert('Gagal simpan hari libur: ' + error.message);
        setHolidayForm({ holiday_date: '', name: '' });
        fetchHolidays();
    };

    const deleteHoliday = async (id) => {
        if (!window.confirm('Hapus hari libur ini?')) return;
        const { error } = await supabase.from('branch_holidays').delete().eq('id', id).eq('branch_id', branchId);
        if (error) return alert('Gagal hapus: ' + error.message);
        fetchHolidays();
    };

    // cari jadwal existing utk kombinasi employee+hari
    const getSchedule = (employeeId, dayIdx) =>
        schedules.find((s) => s.employee_id === employeeId && s.day_of_week === dayIdx);

    const upsertSchedule = async (employeeId, dayIdx, patch) => {
        const existing = getSchedule(employeeId, dayIdx);
        const payload = {
            employee_id: employeeId,
            branch_id: branchId,
            day_of_week: dayIdx,
            is_day_off: existing?.is_day_off || false,
            shift_id: existing?.shift_id || null,
            ...patch,
        };
        const { error } = await supabase
            .from('employee_schedules')
            .upsert([payload], { onConflict: 'employee_id,day_of_week' });
        if (error) return alert('Gagal update jadwal: ' + error.message);
        fetchScheduleData();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Hari Libur & Jadwal Kerja</h3>
                <p className="text-sm text-gray-500 mt-0.5">Atur tanggal cabang tutup/libur dan jadwal mingguan tiap karyawan (masuk shift apa / libur di hari apa).</p>
                <div className="mt-4 flex gap-2">
                    <button onClick={() => setTab('holiday')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'holiday' ? 'bg-isaji-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Hari Libur</button>
                    <button onClick={() => setTab('schedule')} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === 'schedule' ? 'bg-isaji-navy text-white' : 'bg-gray-100 text-gray-600'}`}>Jadwal Mingguan Karyawan</button>
                </div>
            </div>

            {tab === 'holiday' && (
                <div className="space-y-4">
                    <form onSubmit={addHoliday} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="date" value={holidayForm.holiday_date} onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none" />
                        <input type="text" placeholder="Nama libur (mis. Cuti Bersama)" value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none md:col-span-2" />
                        <button type="submit" className="px-5 py-2.5 rounded-xl bg-isaji-navy text-white text-sm font-bold">+ Tambah Libur</button>
                    </form>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                                <tr><th className="px-6 py-4">Tanggal</th><th className="px-6 py-4">Keterangan</th><th className="px-6 py-4 text-right">Aksi</th></tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loadingHolidays ? (
                                    <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400">Memuat...</td></tr>
                                ) : holidays.length === 0 ? (
                                    <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-400">Belum ada hari libur.</td></tr>
                                ) : holidays.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-mono text-gray-700">{h.holiday_date}</td>
                                        <td className="px-6 py-4 font-bold text-gray-900">{h.name}</td>
                                        <td className="px-6 py-4 text-right"><button onClick={() => deleteHoliday(h.id)} className="text-xs font-bold text-red-500 hover:underline">Hapus</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'schedule' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                    {loadingSchedule ? (
                        <div className="text-center py-12 text-gray-400">Memuat jadwal...</div>
                    ) : employees.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">Belum ada karyawan aktif di cabang ini.</div>
                    ) : (
                        <table className="w-full text-xs text-left min-w-[900px]">
                            <thead className="bg-gray-50 text-gray-400 uppercase font-extrabold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3">Karyawan</th>
                                    {DAYS.map((d) => <th key={d} className="px-4 py-3 text-center">{d}</th>)}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {employees.map((emp) => (
                                    <tr key={emp.id}>
                                        <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{emp.full_name}</td>
                                        {DAYS.map((_, dayIdx) => {
                                            const sc = getSchedule(emp.id, dayIdx);
                                            return (
                                                <td key={dayIdx} className="px-2 py-3 text-center">
                                                    <select
                                                        value={sc?.is_day_off ? 'off' : (sc?.shift_id || '')}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === 'off') upsertSchedule(emp.id, dayIdx, { is_day_off: true, shift_id: null });
                                                            else upsertSchedule(emp.id, dayIdx, { is_day_off: false, shift_id: val || null });
                                                        }}
                                                        className="text-xs font-bold border border-gray-200 rounded-lg px-1.5 py-1 outline-none bg-gray-50"
                                                    >
                                                        <option value="">- Belum diatur -</option>
                                                        <option value="off">Libur</option>
                                                        {shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default HolidayScheduleManager;