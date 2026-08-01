import React, { useState, useEffect } from 'react';
import supabase from '../../backend/lib/supabaseClient';
import { detectUserRole } from '../../backend/lib/roleDetection';

const ROLE_LABEL = {
    owner: 'Owner', manager: 'Manajer', employee: 'Karyawan', superadmin: 'Super Admin',
};

function CustomerLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [verifyingOAuth, setVerifyingOAuth] = useState(true);

    // Cek role setiap kali halaman ini dibuka -- termasuk saat baru saja
    // kembali dari redirect OAuth Google (session sudah otomatis ke-set
    // oleh supabase-js karena detectSessionInUrl: true).
    useEffect(() => {
        const verifyExistingSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                setVerifyingOAuth(false);
                return;
            }

            const { role } = await detectUserRole(session.user.id);
            if (role !== 'customer') {
                await supabase.auth.signOut();
                setErrorMsg(`Akun ini terdaftar sebagai ${ROLE_LABEL[role]}, bukan akun member/customer. Gunakan halaman login khusus ${ROLE_LABEL[role]}.`);
                setVerifyingOAuth(false);
                return;
            }

            // Session valid & memang customer -> lanjutkan ke halaman sebelumnya
            window.history.back();
        };
        verifyExistingSession();
    }, []);

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');

        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setErrorMsg('Gagal login: ' + error.message);
            setIsLoading(false);
            return;
        }

        // Tolak kalau akun ini sebenarnya akun Owner/Manajer/Karyawan/Super Admin
        const { role } = await detectUserRole(authData.user.id);
        if (role !== 'customer') {
            await supabase.auth.signOut();
            setErrorMsg(`Akun ini terdaftar sebagai ${ROLE_LABEL[role]}, bukan akun member/customer. Gunakan halaman login khusus ${ROLE_LABEL[role]}.`);
            setIsLoading(false);
            return;
        }

        // Arahkan kembali ke halaman sebelumnya atau ke menu utama
        window.history.back();
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/customer-login` }
        });
        if (error) alert("Error Google Login: " + error.message);
    };

    const handleForgotPassword = () => {
        // Mengarahkan ke WA CS / Sistem Lupa Password via WA
        const phone = "6281234567890"; // Ganti dengan nomor WA Admin/CS pusat Anda
        const text = encodeURIComponent("Halo Admin, saya lupa password akun member aplikasi. Mohon bantuannya untuk reset.");
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    };

    if (verifyingOAuth) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
                <p className="text-sm font-bold text-gray-400">Memverifikasi sesi...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-isaji-orange to-orange-400 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Login Member</h1>
                    <p className="text-sm text-gray-500 mt-1">Kumpulkan poin & nikmati promo eksklusif.</p>
                </div>

                {/* LOGIN GOOGLE */}
                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 transition-colors mb-6"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Lanjutkan dengan Google
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Atau Email</span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                </div>

                {/* FORM EMAIL & PASSWORD */}
                {errorMsg && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-100">{errorMsg}</div>
                )}
                <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange"
                            placeholder="nama@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Kata Sandi</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="text-right">
                        <button type="button" onClick={handleForgotPassword} className="text-xs font-bold text-isaji-orange hover:underline">
                            Lupa Kata Sandi?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-isaji-navy hover:bg-blue-900 text-white py-3.5 rounded-xl font-black shadow-md mt-2 transition-all"
                    >
                        {isLoading ? 'Memeriksa...' : 'Masuk Sekarang'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 font-medium">
                        Belum punya akun? <button onClick={() => alert("Fitur Pendaftaran Sedang Dibangun")} className="font-bold text-isaji-orange hover:underline">Daftar Member</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CustomerLoginPage;