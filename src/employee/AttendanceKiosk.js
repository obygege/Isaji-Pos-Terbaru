import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

// Jarak antar 2 koordinat (meter) - dipakai untuk validasi geofence lokasi cabang
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function todayStr() {
    return new Date().toISOString().split('T')[0];
}

// Cari shift terdekat dengan jam sekarang (dipakai untuk hitung telat saat clock-in)
function pickClosestShift(shifts, now) {
    if (!shifts || shifts.length === 0) return null;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let best = null;
    let bestDiff = Infinity;
    for (const s of shifts) {
        const [h, m] = s.start_time.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const diff = Math.abs(nowMinutes - startMinutes);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = s;
        }
    }
    return best;
}

function AttendanceKiosk() {
    const urlParams = new URLSearchParams(window.location.search);
    const branchIdFromUrl = urlParams.get('branch');

    const [branch, setBranch] = useState(null);
    const [attendanceRules, setAttendanceRules] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    const [pin, setPin] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null); // {type:'success'|'error'|'info', text}
    const [foundEmployee, setFoundEmployee] = useState(null);
    const [todayAttendance, setTodayAttendance] = useState(null);

    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);

    const [clockNow, setClockNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setClockNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    // Minta lokasi GPS begitu kiosk dibuka
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError('Perangkat/browser ini tidak mendukung GPS.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            (err) => setLocationError('Izin lokasi ditolak. Aktifkan GPS untuk bisa absen.'),
            { enableHighAccuracy: true }
        );
    }, []);

    const loadBranchData = useCallback(async () => {
        if (!branchIdFromUrl) {
            setErrorMsg('Kiosk absensi butuh parameter ?branch=ID_CABANG pada URL.');
            setIsLoading(false);
            return;
        }
        try {
            const { data: branchData, error: bErr } = await supabase.from('branches').select('*').eq('id', branchIdFromUrl).single();
            if (bErr || !branchData) throw new Error('Cabang tidak ditemukan.');
            setBranch(branchData);

            const { data: rules } = await supabase.from('attendance_rules').select('*').eq('organization_id', branchData.organization_id).maybeSingle();
            setAttendanceRules(rules || { late_tolerance_minutes: 15, late_deduction_amount: 0, sp_trigger_minutes: 60 });

            const { data: shiftData } = await supabase.from('shifts').select('*').eq('branch_id', branchIdFromUrl);
            setShifts(shiftData || []);
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchIdFromUrl]);

    useEffect(() => { loadBranchData(); }, [loadBranchData]);

    const resetKiosk = () => {
        setPin('');
        setFoundEmployee(null);
        setTodayAttendance(null);
        setTimeout(() => setStatusMsg(null), 4000);
    };

    const handleDigit = (d) => {
        if (isChecking) return;
        setStatusMsg(null);
        setPin(prev => (prev.length >= 6 ? prev : prev + d));
    };
    const handleBackspace = () => setPin(prev => prev.slice(0, -1));
    const handleClearPin = () => setPin('');

    // Cari karyawan berdasarkan PIN, cek geofence, lalu proses clock-in/out
    const handleSubmitPin = useCallback(async () => {
        if (!pin || pin.length < 4) {
            setStatusMsg({ type: 'error', text: 'PIN minimal 4 digit.' });
            return;
        }
        if (!branch) return;

        // Validasi radius lokasi cabang (kalau cabang sudah set koordinat)
        if (branch.latitude && branch.longitude) {
            if (!userLocation) {
                setStatusMsg({ type: 'error', text: locationError || 'Menunggu sinyal GPS, coba lagi sebentar.' });
                return;
            }
            const maxRadius = branch.max_radius_meters || 50;
            const distance = getDistanceFromLatLonInMeters(userLocation.lat, userLocation.lng, branch.latitude, branch.longitude);
            if (distance > maxRadius) {
                setStatusMsg({ type: 'error', text: `Anda ${Math.round(distance)}m dari cabang. Absensi hanya bisa dilakukan di area cabang.` });
                setPin('');
                return;
            }
        }

        setIsChecking(true);
        setStatusMsg(null);
        try {
            const { data: employee, error: empErr } = await supabase
                .from('employees')
                .select('*')
                .eq('branch_id', branch.id)
                .eq('pin', pin)
                .eq('is_active', true)
                .maybeSingle();

            if (empErr) throw empErr;
            if (!employee) {
                setStatusMsg({ type: 'error', text: 'PIN tidak dikenali atau karyawan tidak aktif di cabang ini.' });
                setPin('');
                setIsChecking(false);
                return;
            }
            setFoundEmployee(employee);

            const today = todayStr();
            const { data: existingAtt } = await supabase
                .from('attendances')
                .select('*')
                .eq('employee_id', employee.id)
                .eq('attendance_date', today)
                .maybeSingle();

            const now = new Date();
            const locationPayload = userLocation ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: 'gps' } : null;

            if (!existingAtt) {
                // ===== CLOCK IN =====
                const shift = pickClosestShift(shifts, now);
                let lateMinutes = 0;
                let deduction = 0;

                if (shift) {
                    const [h, m] = shift.start_time.split(':').map(Number);
                    const shiftStart = new Date(now);
                    shiftStart.setHours(h, m, 0, 0);
                    const diffMinutes = Math.round((now - shiftStart) / 60000);
                    const tolerance = attendanceRules?.late_tolerance_minutes ?? 15;
                    if (diffMinutes > tolerance) {
                        lateMinutes = diffMinutes;
                        deduction = Number(attendanceRules?.late_deduction_amount || 0);
                    }
                }

                const spIssued = attendanceRules?.sp_trigger_minutes && lateMinutes >= attendanceRules.sp_trigger_minutes;

                const { data: newAtt, error: insErr } = await supabase.from('attendances').insert([{
                    employee_id: employee.id,
                    branch_id: branch.id,
                    attendance_date: today,
                    clock_in: now.toISOString(),
                    status: lateMinutes > 0 ? 'late' : 'present',
                    clock_in_location: locationPayload,
                    shift_id: shift?.id || null,
                    late_minutes: lateMinutes,
                    deduction_amount: deduction,
                    sp_issued: !!spIssued
                }]).select().single();

                if (insErr) throw insErr;
                setTodayAttendance(newAtt);
                setStatusMsg({
                    type: 'success',
                    text: lateMinutes > 0
                        ? `Selamat datang, ${employee.full_name}! Clock-in tercatat, terlambat ${lateMinutes} menit.`
                        : `Selamat datang, ${employee.full_name}! Clock-in berhasil, tepat waktu.`
                });
            } else if (!existingAtt.clock_out) {
                // ===== CLOCK OUT =====
                const { data: updatedAtt, error: updErr } = await supabase
                    .from('attendances')
                    .update({ clock_out: now.toISOString(), clock_out_location: locationPayload })
                    .eq('id', existingAtt.id)
                    .select()
                    .single();

                if (updErr) throw updErr;
                setTodayAttendance(updatedAtt);
                setStatusMsg({ type: 'success', text: `Sampai jumpa, ${employee.full_name}! Clock-out tercatat. Terima kasih atas kerja keras hari ini.` });
            } else {
                // Sudah absen masuk & pulang hari ini
                setTodayAttendance(existingAtt);
                setStatusMsg({ type: 'info', text: `${employee.full_name} sudah menyelesaikan absensi hari ini (masuk & pulang).` });
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Gagal memproses absensi: ' + err.message });
        } finally {
            setIsChecking(false);
            resetKiosk();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin, branch, userLocation, locationError, shifts, attendanceRules]);

    // Submit otomatis begitu PIN mencapai 6 digit (opsional, tetap bisa tekan tombol OK)
    useEffect(() => {
        if (pin.length === 6 && !isChecking) {
            handleSubmitPin();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pin]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-isaji-navy"><div className="animate-spin w-10 h-10 border-4 border-white border-t-transparent rounded-full"></div></div>;
    }
    if (errorMsg) {
        return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center"><h2 className="text-lg font-black text-red-600 mb-1">Kiosk Tidak Bisa Dibuka</h2><p className="text-sm text-gray-700">{errorMsg}</p></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-isaji-navy to-blue-950 flex flex-col items-center justify-center p-6 font-sans text-white">
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    {branch?.logo_url && <img src={branch.logo_url} alt={branch.name} className="w-14 h-14 object-contain mx-auto mb-3 rounded-xl bg-white p-1" />}
                    <h1 className="text-xl font-black">{branch?.name || 'Absensi Karyawan'}</h1>
                    <p className="text-xs text-blue-200 mt-1">{clockNow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-3xl font-black font-mono mt-2 tracking-wider">{clockNow.toLocaleTimeString('id-ID')}</p>
                </div>

                {locationError && (
                    <div className="bg-amber-500/20 border border-amber-400/40 text-amber-100 text-xs font-semibold rounded-xl p-3 mb-4 text-center">
                        ⚠️ {locationError}
                    </div>
                )}

                {statusMsg && (
                    <div className={`rounded-2xl p-4 mb-4 text-center text-sm font-bold animate-pop-in ${statusMsg.type === 'success' ? 'bg-green-500/20 border border-green-400/40 text-green-100' :
                            statusMsg.type === 'info' ? 'bg-blue-500/20 border border-blue-400/40 text-blue-100' :
                                'bg-red-500/20 border border-red-400/40 text-red-100'
                        }`}>
                        {statusMsg.text}
                        {todayAttendance && (
                            <div className="mt-2 text-xs font-medium text-white/80 space-y-0.5">
                                {todayAttendance.clock_in && <p>Masuk: {new Date(todayAttendance.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}
                                {todayAttendance.clock_out && <p>Pulang: {new Date(todayAttendance.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
                    <p className="text-center text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">Masukkan PIN Karyawan</p>
                    <div className="flex justify-center gap-2 mb-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={`w-9 h-11 rounded-xl flex items-center justify-center text-lg font-black border ${pin[i] ? 'bg-white text-isaji-navy border-white' : 'bg-white/5 border-white/20'}`}>
                                {pin[i] ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                            <button key={d} onClick={() => handleDigit(d)} disabled={isChecking} className="py-4 rounded-2xl bg-white/10 hover:bg-white/20 font-black text-lg active:scale-95 transition-transform disabled:opacity-40">
                                {d}
                            </button>
                        ))}
                        <button onClick={handleClearPin} disabled={isChecking} className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-xs active:scale-95 transition-transform disabled:opacity-40">Hapus</button>
                        <button onClick={() => handleDigit('0')} disabled={isChecking} className="py-4 rounded-2xl bg-white/10 hover:bg-white/20 font-black text-lg active:scale-95 transition-transform disabled:opacity-40">0</button>
                        <button onClick={handleBackspace} disabled={isChecking} className="py-4 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-xs active:scale-95 transition-transform disabled:opacity-40">⌫</button>
                    </div>

                    <button
                        onClick={handleSubmitPin}
                        disabled={isChecking || pin.length < 4}
                        className="w-full mt-4 py-4 rounded-2xl bg-isaji-orange text-white font-black text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-40"
                    >
                        {isChecking ? 'Memproses...' : 'Absen Sekarang'}
                    </button>
                </div>

                <p className="text-center text-[10px] text-blue-200/70 font-semibold mt-5">
                    Sistem akan otomatis mendeteksi Clock-In / Clock-Out berdasarkan status absensi Anda hari ini.
                </p>
            </div>
        </div>
    );
}

export default AttendanceKiosk;