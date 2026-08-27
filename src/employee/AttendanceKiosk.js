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

    // Form pengajuan izin/cuti/sakit (dibuka lewat tombol di kiosk yang sama, pakai PIN yang sama)
    const [showLeaveForm, setShowLeaveForm] = useState(false);
    const [leaveForm, setLeaveForm] = useState({ pin: '', leave_type: 'sakit', start_date: todayStr(), end_date: todayStr(), reason: '' });
    const [leaveProofFile, setLeaveProofFile] = useState(null);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const [leaveMsg, setLeaveMsg] = useState(null);

    const submitLeaveRequest = async (e) => {
        e.preventDefault();
        if (!leaveForm.pin) return setLeaveMsg({ type: 'error', text: 'Masukkan PIN karyawan dulu.' });
        setIsSubmittingLeave(true);
        setLeaveMsg(null);
        try {
            const { data: employee } = await supabase.from('employees').select('id, full_name').eq('branch_id', branch.id).eq('pin', leaveForm.pin).eq('is_active', true).maybeSingle();
            if (!employee) throw new Error('PIN tidak dikenali.');

            let proof_url = null;
            if (leaveProofFile) {
                const filePath = `${employee.id}/${Date.now()}_${leaveProofFile.name}`;
                const { error: upErr } = await supabase.storage.from('leave-proofs').upload(filePath, leaveProofFile);
                if (!upErr) {
                    const { data: pub } = supabase.storage.from('leave-proofs').getPublicUrl(filePath);
                    proof_url = pub?.publicUrl || null;
                }
            }

            const { error } = await supabase.from('leave_requests').insert([{
                employee_id: employee.id,
                branch_id: branch.id,
                leave_type: leaveForm.leave_type,
                start_date: leaveForm.start_date,
                end_date: leaveForm.end_date,
                reason: leaveForm.reason,
                proof_url,
                status: 'pending',
            }]);
            if (error) throw error;
            setLeaveMsg({ type: 'success', text: `Pengajuan ${leaveForm.leave_type} untuk ${employee.full_name} terkirim, menunggu persetujuan manajer.` });
            setLeaveForm({ pin: '', leave_type: 'sakit', start_date: todayStr(), end_date: todayStr(), reason: '' });
            setLeaveProofFile(null);
        } catch (err) {
            setLeaveMsg({ type: 'error', text: 'Gagal mengajukan: ' + err.message });
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    // Kamera untuk foto verifikasi wajah saat absen (belum face-match AI, baru rekam foto sbg bukti kehadiran)
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    useEffect(() => {
        const t = setInterval(() => setClockNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let stream;
        (async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraReady(true);
                }
            } catch (err) {
                setCameraError('Kamera tidak bisa diakses. Absen tetap bisa lanjut pakai PIN saja.');
            }
        })();
        return () => { stream?.getTracks()?.forEach(t => t.stop()); };
    }, []);

    // Ambil snapshot dari video sbg bukti foto absen, upload ke storage bucket 'attendance-faces'
    const captureFacePhoto = async (employeeId) => {
        if (!cameraReady || !videoRef.current || !canvasRef.current) return null;
        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 240;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
            if (!blob) return null;
            const filePath = `${employeeId}/${Date.now()}.jpg`;
            const { error } = await supabase.storage.from('attendance-faces').upload(filePath, blob, { contentType: 'image/jpeg' });
            if (error) return null; // bucket belum dibuat -> lewati foto, absen tetap jalan
            const { data: pub } = supabase.storage.from('attendance-faces').getPublicUrl(filePath);
            return pub?.publicUrl || null;
        } catch {
            return null;
        }
    };

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
            const facePhotoUrl = await captureFacePhoto(employee.id);

            if (!existingAtt) {
                // ===== CLOCK IN =====
                // Pakai shift yang sudah dipasang manajer ke karyawan ini (default_shift_id) kalau ada,
                // baru fallback ke shift terdekat dari jam sekarang.
                const employeeShift = shifts.find((s) => s.id === employee.default_shift_id);
                const shift = employeeShift || pickClosestShift(shifts, now);
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
                    clock_in_photo_url: facePhotoUrl,
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
                    .update({ clock_out: now.toISOString(), clock_out_location: locationPayload, clock_out_photo_url: facePhotoUrl })
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
        return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-10 h-10 border-4 border-isaji-navy border-t-transparent rounded-full"></div></div>;
    }
    if (errorMsg) {
        return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center"><h2 className="text-lg font-black text-red-600 mb-1">Kiosk Tidak Bisa Dibuka</h2><p className="text-sm text-gray-700">{errorMsg}</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans text-gray-900">
            <div className="w-full max-w-sm">
                <div className="text-center mb-6">
                    {branch?.logo_url && <img src={branch.logo_url} alt={branch.name} className="w-14 h-14 object-contain mx-auto mb-3 rounded-xl bg-white p-1 border border-gray-100 shadow-sm" />}
                    <h1 className="text-xl font-black text-gray-900">{branch?.name || 'Absensi Karyawan'}</h1>
                    <p className="text-xs text-gray-500 mt-1">{clockNow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="text-3xl font-black font-mono mt-2 tracking-wider text-isaji-navy">{clockNow.toLocaleTimeString('id-ID')}</p>
                </div>

                <div className="relative w-28 h-28 mx-auto mb-4 rounded-2xl overflow-hidden border-2 border-gray-200 bg-gray-100 shadow-sm">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    {!cameraReady && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 font-bold text-center px-2">{cameraError || 'Mengaktifkan kamera...'}</div>}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {locationError && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-xl p-3 mb-4 text-center">
                        ⚠️ {locationError}
                    </div>
                )}

                {statusMsg && (
                    <div className={`rounded-2xl p-4 mb-4 text-center text-sm font-bold animate-pop-in border ${statusMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                        statusMsg.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                            'bg-red-50 border-red-200 text-red-600'
                        }`}>
                        {statusMsg.text}
                        {todayAttendance && (
                            <div className="mt-2 text-xs font-medium text-gray-500 space-y-0.5">
                                {todayAttendance.clock_in && <p>Masuk: {new Date(todayAttendance.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}
                                {todayAttendance.clock_out && <p>Pulang: {new Date(todayAttendance.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>}
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                    <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Masukkan PIN Karyawan</p>
                    <div className="flex justify-center gap-2 mb-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className={`w-9 h-11 rounded-xl flex items-center justify-center text-lg font-black border ${pin[i] ? 'bg-isaji-navy text-white border-isaji-navy' : 'bg-gray-50 border-gray-200'}`}>
                                {pin[i] ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                            <button key={d} onClick={() => handleDigit(d)} disabled={isChecking} className="py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 font-black text-lg text-gray-800 active:scale-95 transition-transform disabled:opacity-40">
                                {d}
                            </button>
                        ))}
                        <button onClick={handleClearPin} disabled={isChecking} className="py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 font-bold text-xs text-gray-500 active:scale-95 transition-transform disabled:opacity-40">Hapus</button>
                        <button onClick={() => handleDigit('0')} disabled={isChecking} className="py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 font-black text-lg text-gray-800 active:scale-95 transition-transform disabled:opacity-40">0</button>
                        <button onClick={handleBackspace} disabled={isChecking} className="py-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-100 font-bold text-xs text-gray-500 active:scale-95 transition-transform disabled:opacity-40">⌫</button>
                    </div>

                    <button
                        onClick={handleSubmitPin}
                        disabled={isChecking || pin.length < 4}
                        className="w-full mt-4 py-4 rounded-2xl bg-isaji-orange text-white font-black text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-40"
                    >
                        {isChecking ? 'Memproses...' : 'Absen Sekarang'}
                    </button>
                </div>

                <p className="text-center text-[10px] text-gray-400 font-semibold mt-5">
                    Sistem akan otomatis mendeteksi Clock-In / Clock-Out berdasarkan status absensi Anda hari ini.
                </p>

                <button onClick={() => { setShowLeaveForm(v => !v); setLeaveMsg(null); }} className="w-full mt-4 py-3 rounded-2xl bg-white hover:bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 shadow-sm">
                    {showLeaveForm ? 'Tutup Form Izin/Cuti/Sakit' : 'Tidak bisa masuk? Ajukan Izin / Cuti / Sakit'}
                </button>

                {showLeaveForm && (
                    <form onSubmit={submitLeaveRequest} className="mt-3 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-3 text-left">
                        <input type="password" inputMode="numeric" placeholder="PIN Karyawan" value={leaveForm.pin} onChange={(e) => setLeaveForm({ ...leaveForm, pin: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-isaji-navy text-sm font-bold outline-none" />
                        <select value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-isaji-navy text-sm font-bold outline-none">
                            <option value="sakit">Sakit</option>
                            <option value="izin">Izin</option>
                            <option value="cuti">Cuti</option>
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-isaji-navy text-xs font-bold outline-none" />
                            <input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-isaji-navy text-xs font-bold outline-none" />
                        </div>
                        <textarea placeholder="Alasan" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-isaji-navy text-sm font-semibold outline-none" />
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Bukti Surat (opsional, foto/pdf)</label>
                            <input type="file" accept="image/*,.pdf" onChange={(e) => setLeaveProofFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-500 mt-1" />
                        </div>
                        {leaveMsg && (
                            <p className={`text-xs font-bold ${leaveMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{leaveMsg.text}</p>
                        )}
                        <button type="submit" disabled={isSubmittingLeave} className="w-full py-3 rounded-2xl bg-isaji-orange text-white font-black text-sm disabled:opacity-40">
                            {isSubmittingLeave ? 'Mengirim...' : 'Kirim Pengajuan'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default AttendanceKiosk;