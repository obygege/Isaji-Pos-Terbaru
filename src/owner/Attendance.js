import React, { useState, useEffect } from 'react';
import supabase from '../backend/lib/supabaseClient';

function Attendance({ orgData }) {
    const [activeTab, setActiveTab] = useState('records'); // 'records' atau 'settings'
    const [isLoading, setIsLoading] = useState(true);

    const [attendances, setAttendances] = useState([]);
    const [branches, setBranches] = useState([]);
    const [shifts, setShifts] = useState([]);

    // Form Aturan Absensi
    const [rules, setRules] = useState({
        late_tolerance_minutes: 15,
        late_deduction_amount: 0,
        sp_trigger_minutes: 60
    });

    // Form Tambah Shift
    const [newShift, setNewShift] = useState({ branch_id: '', name: '', start_time: '', end_time: '' });

    useEffect(() => {
        if (orgData && orgData.id) {
            fetchAttendanceData(orgData.id);
        } else {
            setIsLoading(false);
        }
    }, [orgData]);

    const fetchAttendanceData = async (orgId) => {
        setIsLoading(true);
        try {
            // 1. Ambil Aturan Absensi
            const { data: ruleData } = await supabase.from('attendance_rules').select('*').eq('organization_id', orgId).single();
            if (ruleData) setRules(ruleData);

            // 2. Ambil Daftar Cabang
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgId);
            setBranches(branchData || []);

            if (branchData && branchData.length > 0) {
                const branchIds = branchData.map(b => b.id);

                // 3. Ambil Daftar Shift
                const { data: shiftData } = await supabase.from('shifts').select('*').in('branch_id', branchIds);
                setShifts(shiftData || []);

                // 4. Ambil Data Absensi Hari Ini
                const today = new Date().toISOString().split('T')[0];
                const { data: attData } = await supabase
                    .from('attendances')
                    .select(`*, employees(full_name, position), shifts(name)`)
                    .in('branch_id', branchIds)
                    .eq('attendance_date', today)
                    .order('clock_in', { ascending: false });
                setAttendances(attData || []);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveRules = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = {
                organization_id: orgData.id,
                ...rules
            };
            const { error } = await supabase.from('attendance_rules').upsert(payload, { onConflict: 'organization_id' });
            if (error) throw error;
            alert('Aturan absensi berhasil diperbarui!');
        } catch (error) {
            alert('Gagal menyimpan aturan: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddShift = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.from('shifts').insert([newShift]);
            if (error) throw error;
            setNewShift({ branch_id: '', name: '', start_time: '', end_time: '' });
            fetchAttendanceData(orgData.id);
            alert('Shift berhasil ditambahkan!');
        } catch (error) {
            alert('Gagal menambah shift: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Absensi & Shift</h2>
                    <p className="text-sm text-gray-500 mt-1">Pantau kehadiran harian, kelola shift, dan aturan denda.</p>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-gray-200">
                <button onClick={() => setActiveTab('records')} className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'records' ? 'border-isaji-navy text-isaji-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Rekap Absensi Hari Ini
                </button>
                <button onClick={() => setActiveTab('settings')} className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'settings' ? 'border-isaji-navy text-isaji-navy' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Pengaturan Shift & Aturan
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-t-isaji-navy rounded-full animate-spin"></div></div>
            ) : (
                <>
                    {/* TAB 1: REKAP ABSENSI */}
                    {activeTab === 'records' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">Nama Karyawan</th>
                                            <th className="px-6 py-4 font-bold">Shift</th>
                                            <th className="px-6 py-4 font-bold">Jam Masuk</th>
                                            <th className="px-6 py-4 font-bold">Keterlambatan</th>
                                            <th className="px-6 py-4 font-bold">Potongan / SP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendances.length === 0 ? (
                                            <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-500">Belum ada karyawan yang absen hari ini.</td></tr>
                                        ) : (
                                            attendances.map((att) => (
                                                <tr key={att.id} className="border-b border-gray-50">
                                                    <td className="px-6 py-4 font-bold text-gray-900">
                                                        {att.employees?.full_name} <br />
                                                        <span className="text-xs font-normal text-gray-500">{att.employees?.position}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700">{att.shifts?.name || '-'}</td>
                                                    <td className="px-6 py-4 font-mono">{new Date(att.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-4">
                                                        {att.late_minutes > 0 ? (
                                                            <span className="text-red-600 font-bold">Telat {att.late_minutes} Menit</span>
                                                        ) : (
                                                            <span className="text-green-600 font-bold">Tepat Waktu</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {att.deduction_amount > 0 && <p className="text-red-600 font-bold text-xs">- Rp {att.deduction_amount.toLocaleString()}</p>}
                                                        {att.sp_issued && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded font-bold uppercase mt-1 inline-block">SP Terkirim</span>}
                                                        {!att.deduction_amount && !att.sp_issued && <span className="text-gray-400">-</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: PENGATURAN SHIFT & ATURAN */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Form Aturan Keterlambatan */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-isaji-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    Aturan Keterlambatan & SP
                                </h3>
                                <form onSubmit={handleSaveRules} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Toleransi Keterlambatan (Menit)</label>
                                        <input type="number" value={rules.late_tolerance_minutes} onChange={e => setRules({ ...rules, late_tolerance_minutes: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Denda Keterlambatan (Rp)</label>
                                        <input type="number" value={rules.late_deduction_amount} onChange={e => setRules({ ...rules, late_deduction_amount: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Otomatis Kirim SP Email Jika Telat (Menit)</label>
                                        <input type="number" value={rules.sp_trigger_minutes} onChange={e => setRules({ ...rules, sp_trigger_minutes: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                    </div>
                                    <button type="submit" className="w-full bg-isaji-navy text-white py-2 rounded-lg font-bold">Simpan Aturan</button>
                                </form>
                            </div>

                            {/* Form Tambah Shift */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Manajemen Jam Shift</h3>
                                <form onSubmit={handleAddShift} className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Pilih Cabang</label>
                                        <select required value={newShift.branch_id} onChange={e => setNewShift({ ...newShift, branch_id: e.target.value })} className="w-full px-4 py-2 border rounded-lg">
                                            <option value="">-- Pilih --</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nama Shift</label>
                                        <input required type="text" placeholder="Contoh: Shift Pagi" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Jam Masuk</label>
                                            <input required type="time" value={newShift.start_time} onChange={e => setNewShift({ ...newShift, start_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Jam Pulang</label>
                                            <input required type="time" value={newShift.end_time} onChange={e => setNewShift({ ...newShift, end_time: e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full bg-gray-900 text-white py-2 rounded-lg font-bold">Tambah Shift Baru</button>
                                </form>

                                {/* Daftar Shift yang ada */}
                                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 max-h-40 overflow-y-auto custom-scrollbar">
                                    {shifts.map(s => (
                                        <div key={s.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center text-sm">
                                            <div>
                                                <p className="font-bold text-gray-900">{s.name}</p>
                                                <p className="text-xs text-gray-500">{s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default Attendance;