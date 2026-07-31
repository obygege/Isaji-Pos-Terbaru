import React, { useState } from 'react';

function SuperAdminLogin() {
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        // GANTI PASSKEY INI DENGAN KODE RAHASIA ANDA
        const SECRET_PASSKEY = process.env.REACT_APP_SUPERADMIN_PASSKEY;

        if (passkey === SECRET_PASSKEY) {
            localStorage.setItem('is_superadmin', 'true');
            window.location.href = '/superadmin/dashboard';
        } else {
            setError(true);
            setPasskey('');
            setTimeout(() => setError(false), 2000);
        }
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

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Secret Passkey</label>
                        <input
                            type="password"
                            value={passkey}
                            onChange={(e) => setPasskey(e.target.value)}
                            placeholder="Enter classified key..."
                            className={`w-full px-5 py-4 bg-black/30 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-xl text-white placeholder-slate-600 outline-none focus:border-amber-500 transition-all text-center tracking-widest`}
                            autoFocus
                        />
                        {error && <p className="text-red-400 text-xs text-center mt-2 animate-pulse">Access Denied. Invalid Passkey.</p>}
                    </div>

                    <button type="submit" className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all active:scale-95">
                        AUTHENTICATE
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SuperAdminLogin;