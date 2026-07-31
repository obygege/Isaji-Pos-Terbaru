import React, { useState, useEffect } from 'react';

function ForgotPassword({ onNavigate }) {
    // State untuk menyimpan email saat refresh
    const [email, setEmail] = useState(() => sessionStorage.getItem('forgotEmail') || '');

    useEffect(() => {
        sessionStorage.setItem('forgotEmail', email);
    }, [email]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 relative overflow-hidden">
            <div className="absolute top-0 -left-20 w-72 h-72 bg-isaji-cyan rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-72 h-72 bg-isaji-orange rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

            <div className="max-w-md w-full bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-gray-100 relative z-10">

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-50 text-isaji-cyan rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-isaji-navy">Lupa Password?</h2>
                    <p className="text-gray-500 mt-3 text-sm font-medium leading-relaxed">
                        Masukkan email yang terdaftar pada akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
                    </p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-isaji-cyan focus:border-transparent transition-all bg-gray-50 focus:bg-white"
                            placeholder="admin@cafeanda.com"
                        />
                    </div>

                    <button
                        type="button"
                        className="w-full bg-isaji-cyan text-white font-bold py-3.5 rounded-xl hover:bg-blue-600 shadow-lg shadow-cyan-500/30 hover:-translate-y-1 transition-all duration-300"
                    >
                        Kirim Link Reset
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => onNavigate('login')}
                        className="text-sm text-gray-500 font-bold hover:text-isaji-navy flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Kembali ke Halaman Login
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ForgotPassword;