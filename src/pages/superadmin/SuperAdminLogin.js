import React, { useState } from 'react';
import supabase from '../../backend/lib/supabaseClient';
import { getVerifiedSuperAdminSession } from './superAdminAuth';

function SuperAdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // 1. Login pakai Supabase Auth asli (email + password)
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

        if (authError) {
            setError('Email atau password salah.');
            setLoading(false);
            return;
        }

        // 2. Verifikasi ulang ke tabel `superadmins` -- login berhasil bukan
        //    berarti otomatis superadmin, harus terdaftar di tabel itu juga.
        const session = await getVerifiedSuperAdminSession();

        if (!session) {
            setError('Akun ini tidak memiliki akses Super Admin.');
            await supabase.auth.signOut();
            setLoading(false);
            return;
        }

        window.location.href = '/superadmin/dashboard';
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-amber-500/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full"></div>

            <div className="z-10 w-full max-w-md p-8 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                        <span className="text-2xl font-black text-[#020617]">S</span>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-wide">Command Center</h1>
                    <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Isaji POS Super Admin</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="superadmin@isajipos.com"
                            className="w-full px-5 py-4 bg-black/30 border border-slate-700 rounded-xl text-white placeholder-slate-600 outline-none focus:border-amber-500 transition-all"
                            autoFocus
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full px-5 py-4 bg-black/30 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-xl text-white placeholder-slate-600 outline-none focus:border-amber-500 transition-all`}
                            required
                        />
                        {error && <p className="text-red-400 text-xs text-center mt-2 animate-pulse">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'MEMVERIFIKASI...' : 'AUTHENTICATE'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SuperAdminLogin;
