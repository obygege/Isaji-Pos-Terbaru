import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

// Approve/tolak pengajuan izin, cuti, sakit karyawan cabang ini + lihat bukti surat.
// Butuh kolom leave_requests.branch_id & leave_requests.proof_url (lihat migration).
function LeaveRequestManager({ branchId }) {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    const fetchRequests = useCallback(async () => {
        setIsLoading(true);
        let query = supabase
            .from('leave_requests')
            .select(`*, employees ( full_name, position )`)
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false });
        if (filter !== 'all') query = query.eq('status', filter);
        const { data, error } = await query;
        if (!error) setRequests(data || []);
        setIsLoading(false);
    }, [branchId, filter]);

    useEffect(() => { if (branchId) fetchRequests(); }, [branchId, fetchRequests]);

    const decide = async (id, status) => {
        const { data: { session } } = await supabase.auth.getSession();
        const { error } = await supabase
            .from('leave_requests')
            .update({ status, approved_by: session?.user?.id || null })
            .eq('id', id)
            .eq('branch_id', branchId);
        if (error) return alert('Gagal update: ' + error.message);
        fetchRequests();
    };

    const badgeColor = (s) => s === 'approved' ? 'bg-green-50 text-green-600' : s === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600';

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Pengajuan Izin / Cuti / Sakit</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Termasuk bukti surat yang diupload karyawan.</p>
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected', 'all'].map((f) => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${filter === f ? 'bg-isaji-navy text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase font-extrabold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Karyawan</th>
                            <th className="px-6 py-4">Jenis</th>
                            <th className="px-6 py-4">Tanggal</th>
                            <th className="px-6 py-4">Alasan</th>
                            <th className="px-6 py-4">Bukti</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Memuat...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400">Tidak ada pengajuan.</td></tr>
                        ) : requests.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-bold text-gray-900">{r.employees?.full_name || '-'}</td>
                                <td className="px-6 py-4 capitalize">{r.leave_type}</td>
                                <td className="px-6 py-4 font-mono text-xs text-gray-600">{r.start_date} s/d {r.end_date}</td>
                                <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={r.reason}>{r.reason || '-'}</td>
                                <td className="px-6 py-4">
                                    {r.proof_url ? (
                                        <a href={r.proof_url} target="_blank" rel="noreferrer" className="text-isaji-navy text-xs font-bold underline">Lihat Surat</a>
                                    ) : <span className="text-gray-300 text-xs">-</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${badgeColor(r.status)}`}>{r.status}</span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    {r.status === 'pending' && (
                                        <>
                                            <button onClick={() => decide(r.id, 'approved')} className="text-xs font-bold text-green-600 hover:underline">Setujui</button>
                                            <button onClick={() => decide(r.id, 'rejected')} className="text-xs font-bold text-red-500 hover:underline">Tolak</button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default LeaveRequestManager;