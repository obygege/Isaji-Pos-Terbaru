import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function AttendanceManager({ branchId }) {
    const [attendances, setAttendances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchAttendances = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('attendances')
                .select(`
                    *,
                    employees ( full_name, position )
                `)
                .eq('branch_id', branchId)
                .eq('attendance_date', selectedDate)
                .order('clock_in', { ascending: false });

            if (error) throw error;
            setAttendances(data || []);
        } catch (err) {
            console.error("Gagal memuat absensi:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, selectedDate]);

    useEffect(() => {
        if (branchId) {
            fetchAttendances();
        }
    }, [branchId, selectedDate, fetchAttendances]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Absensi & Shift Karyawan</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Pantau rekaman clock-in, keterlambatan, dan denda otomatis.</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Pilih Tanggal:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 outline-none bg-gray-50"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-400 font-medium">Memuat data absensi...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Nama Staf</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Jam Masuk (Clock In)</th>
                                <th className="px-6 py-4">Jam Pulang (Clock Out)</th>
                                <th className="px-6 py-4">Terlambat</th>
                                <th className="px-6 py-4">Potongan Keterlambatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {attendances.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        Tidak ada catatan absensi pada tanggal {selectedDate}.
                                    </td>
                                </tr>
                            ) : (
                                attendances.map((att) => (
                                    <tr key={att.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{att.employees?.full_name || 'Staf Terhapus'}</p>
                                            <p className="text-xs text-gray-400 uppercase font-semibold">{att.employees?.position}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${att.status === 'present' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {att.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {att.clock_in ? new Date(att.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {att.clock_out ? new Date(att.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Belum Absen Pulang'}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-orange-600">
                                            {att.late_minutes > 0 ? `${att.late_minutes} Menit` : <span className="text-green-600 font-normal">Tepat Waktu</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-red-500">
                                            Rp {Number(att.deduction_amount || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AttendanceManager;