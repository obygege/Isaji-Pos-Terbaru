import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

// Aturan telat & potongan gaji. attendance_rules sekarang punya kolom branch_id (lihat migration),
// jadi tiap cabang bisa punya aturan sendiri, fallback ke aturan organisasi (branch_id null) kalau belum diatur.
function AttendanceRulesManager({ branchId, organizationId }) {
    const [rule, setRule] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [enableDeduction, setEnableDeduction] = useState(true);

    const fetchRule = useCallback(async () => {
        setIsLoading(true);
        let { data } = await supabase.from('attendance_rules').select('*').eq('branch_id', branchId).maybeSingle();
        if (!data && organizationId) {
            const org = await supabase.from('attendance_rules').select('*').eq('organization_id', organizationId).is('branch_id', null).maybeSingle();
            data = org.data;
        }
        const r = data || { late_tolerance_minutes: 15, late_deduction_amount: 0, sp_trigger_minutes: 60, absent_deduction_amount: 0 };
        setRule(r);
        setEnableDeduction(Number(r.late_deduction_amount || 0) > 0 || Number(r.absent_deduction_amount || 0) > 0);
        setIsLoading(false);
    }, [branchId, organizationId]);

    useEffect(() => { if (branchId) fetchRule(); }, [branchId, fetchRule]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                branch_id: branchId,
                organization_id: organizationId,
                late_tolerance_minutes: Number(rule.late_tolerance_minutes) || 0,
                late_deduction_amount: enableDeduction ? Number(rule.late_deduction_amount) || 0 : 0,
                absent_deduction_amount: enableDeduction ? Number(rule.absent_deduction_amount) || 0 : 0,
                sp_trigger_minutes: Number(rule.sp_trigger_minutes) || 0,
            };
            const { error } = await supabase.from('attendance_rules').upsert([payload], { onConflict: 'branch_id' });
            if (error) throw error;
            alert('Aturan absensi & potongan gaji tersimpan.');
            fetchRule();
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message + '\n\nPastikan kolom branch_id sudah ditambahkan di tabel attendance_rules (lihat migration).');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading || !rule) return <div className="text-center py-12 text-gray-400">Memuat aturan...</div>;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
            <h3 className="text-xl font-black text-gray-900">Aturan Telat & Potongan Gaji</h3>
            <p className="text-sm text-gray-500 mt-0.5">Khusus cabang ini. Dipakai otomatis saat karyawan absen di kiosk & saat generate slip gaji.</p>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Toleransi Telat (menit)</label>
                    <input type="number" min="0" value={rule.late_tolerance_minutes}
                        onChange={(e) => setRule({ ...rule, late_tolerance_minutes: e.target.value })}
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none" />
                </div>

                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <input type="checkbox" checked={enableDeduction} onChange={(e) => setEnableDeduction(e.target.checked)} className="w-4 h-4" />
                    Potong gaji jika telat / tidak masuk tanpa keterangan
                </label>

                {enableDeduction && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Potongan per Telat (Rp)</label>
                            <input type="number" min="0" value={rule.late_deduction_amount}
                                onChange={(e) => setRule({ ...rule, late_deduction_amount: e.target.value })}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Potongan per Mangkir (Rp)</label>
                            <input type="number" min="0" value={rule.absent_deduction_amount}
                                onChange={(e) => setRule({ ...rule, absent_deduction_amount: e.target.value })}
                                className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none" />
                        </div>
                    </div>
                )}

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Telat Minimal Kena SP (menit)</label>
                    <input type="number" min="0" value={rule.sp_trigger_minutes}
                        onChange={(e) => setRule({ ...rule, sp_trigger_minutes: e.target.value })}
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold outline-none" />
                    <p className="text-xs text-gray-400 mt-1">Karyawan otomatis ditandai butuh Surat Peringatan kalau telat lebih dari ini.</p>
                </div>

                <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-xl bg-isaji-navy text-white text-sm font-bold disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'Simpan Aturan'}
                </button>
            </form>
        </div>
    );
}

export default AttendanceRulesManager;