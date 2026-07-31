import React, { useState, useEffect } from 'react';
import supabase from './backend/lib/supabaseClient';

function Register({ onNavigate }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const [orgName, setOrgName] = useState(() => sessionStorage.getItem('regOrgName') || '');
    const [picName, setPicName] = useState(() => sessionStorage.getItem('regPicName') || '');
    const [email, setEmail] = useState(() => sessionStorage.getItem('regEmail') || '');
    const [password, setPassword] = useState(() => sessionStorage.getItem('regPassword') || '');

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    useEffect(() => {
        sessionStorage.setItem('regOrgName', orgName);
        sessionStorage.setItem('regPicName', picName);
        sessionStorage.setItem('regEmail', email);
        sessionStorage.setItem('regPassword', password);
    }, [orgName, picName, email, password]);

    const sliderImages = [
        "https://images.unsplash.com/photo-1521017432531-fbd92d768814?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % sliderImages.length), 3000);
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);

        const { error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: { data: { organization_name: orgName, full_name: picName } }
        });

        if (error) {
            setErrorMsg(error.message);
            setIsLoading(false);
        } else {
            setSuccessMsg("Pendaftaran berhasil! Mengalihkan ke halaman Login...");
            sessionStorage.clear(); // Bersihkan form
            // Otomatis pindah ke login setelah 2 detik
            setTimeout(() => {
                onNavigate('login');
            }, 2000);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) setErrorMsg(error.message);
    };

    return (
        <div className="min-h-screen flex bg-white flex-row-reverse">
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-isaji-navy">
                {sliderImages.map((img, index) => (
                    <div key={index} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}>
                        <img src={img} alt="Cafe POS" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-isaji-navy via-isaji-navy/40 to-transparent"></div>
                    </div>
                ))}
                <div className="absolute bottom-16 left-12 right-12 z-10">
                    <h2 className="text-4xl font-extrabold text-white mb-4">Bergabunglah Bersama<br />Ribuan Cafe Lainnya</h2>
                    <div className="flex gap-2 mt-6">
                        {sliderImages.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-isaji-orange' : 'w-2 bg-white/40'}`} />))}
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12 relative overflow-y-auto max-h-screen">
                <button onClick={() => onNavigate('home')} className="absolute top-8 left-8 sm:left-16 flex items-center gap-2 text-sm text-gray-500 hover:text-isaji-cyan font-medium transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg> Kembali
                </button>

                <div className="max-w-md w-full mx-auto mt-12 lg:mt-0">
                    <img src="/LOGO.png" alt="ISAJI Logo" className="h-12 mb-6 object-contain" />
                    <h2 className="text-3xl font-extrabold text-isaji-navy mb-2">Buat Akun Baru</h2>
                    <p className="text-gray-500 mb-6 font-medium">Daftar sekarang dan nikmati masa percobaan 14 Hari.</p>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">{errorMsg}</div>
                    )}
                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-6 text-sm font-bold border border-green-200">{successMsg}</div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nama Organisasi / Cafe</label>
                            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} required placeholder="Kopi Senja" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-orange bg-gray-50 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap PIC</label>
                            <input type="text" value={picName} onChange={(e) => setPicName(e.target.value)} required placeholder="Budi Santoso" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-orange bg-gray-50 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@cafeanda.com" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-orange bg-gray-50 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                            <div className="relative flex items-center">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter" className="w-full px-5 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-orange bg-gray-50 focus:bg-white outline-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-400 hover:text-isaji-orange transition-colors">
                                    {showPassword ? <span className="text-xs font-bold">SEMBUNYIKAN</span> : <span className="text-xs font-bold">LIHAT</span>}
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-isaji-orange text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-1 mt-2 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? "Memproses..." : "Daftar Sekarang"}
                        </button>

                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-gray-200"></div><span className="mx-4 text-gray-400 text-sm font-medium">atau</span><div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <button type="button" onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-3 transition-all shadow-sm">
                            Google
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500 font-medium pb-8 lg:pb-0">
                        Sudah punya akun? <button onClick={() => onNavigate('login')} className="text-isaji-cyan font-bold hover:underline">Masuk di sini</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;