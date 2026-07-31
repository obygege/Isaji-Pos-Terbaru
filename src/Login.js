import React, { useState, useEffect } from 'react';
import supabase from './backend/lib/supabaseClient';

function Login({ onNavigate }) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const [email, setEmail] = useState(() => sessionStorage.getItem('loginEmail') || '');
    const [password, setPassword] = useState(() => sessionStorage.getItem('loginPassword') || '');
    const [rememberMe, setRememberMe] = useState(() => sessionStorage.getItem('loginRemember') === 'true');

    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        sessionStorage.setItem('loginEmail', email);
        sessionStorage.setItem('loginPassword', password);
        sessionStorage.setItem('loginRemember', rememberMe);
    }, [email, password, rememberMe]);

    const sliderImages = [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % sliderImages.length), 3000);
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg(null);

        try {
            // 1. Autentikasi Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            const userId = authData.user.id;
            sessionStorage.removeItem('loginPassword');

            // 2. CEK APAKAH DIA OWNER
            const { data: orgData } = await supabase
                .from('organizations')
                .select('id')
                .or(`id.eq.${userId},owner_id.eq.${userId}`)
                .limit(1);

            if (orgData && orgData.length > 0) {
                onNavigate('dashboard'); // Lempar ke Owner Dashboard
                return;
            }

            // 3. CEK APAKAH DIA MANAJER CABANG
            const { data: empData } = await supabase
                .from('employees')
                .select('position')
                .eq('user_id', userId)
                .limit(1);

            if (empData && empData.length > 0) {
                const position = empData[0].position;
                if (position === 'manajer') {
                    onNavigate('manager-dashboard'); // Lempar ke Manager Dashboard khusus
                    return;
                } else {
                    alert("Akses web ini khusus untuk Owner dan Manajer Cabang.");
                    await supabase.auth.signOut();
                    onNavigate('login');
                    return;
                }
            }

            throw new Error("Akun ini tidak terdaftar memiliki hak akses backoffice.");

        } catch (error) {
            setErrorMsg(error.message);
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) setErrorMsg(error.message);
    };

    return (
        <div className="min-h-screen flex bg-white">
            <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-isaji-navy">
                {sliderImages.map((img, index) => (
                    <div key={index} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}>
                        <img src={img} alt="Cafe POS" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-isaji-navy via-isaji-navy/40 to-transparent"></div>
                    </div>
                ))}
                <div className="absolute bottom-16 left-12 right-12 z-10">
                    <h2 className="text-4xl font-extrabold text-white mb-4">Kelola Cafe Anda <br />Lebih Profesional</h2>
                    <div className="flex gap-2 mt-6">
                        {sliderImages.map((_, i) => (<div key={i} className={`h-2 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-8 bg-isaji-cyan' : 'w-2 bg-white/40'}`} />))}
                    </div>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 py-12 relative">
                <button onClick={() => onNavigate('home')} className="absolute top-8 left-8 sm:left-16 flex items-center gap-2 text-sm text-gray-500 hover:text-isaji-cyan font-medium transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg> Kembali
                </button>

                <div className="max-w-md w-full mx-auto">
                    <img src="/LOGO.png" alt="ISAJI Logo" className="h-12 mb-8 object-contain" />
                    <h2 className="text-3xl font-extrabold text-isaji-navy mb-2">Selamat Datang</h2>
                    <p className="text-gray-500 mb-6 font-medium">Masuk untuk mengelola operasional organisasi Anda.</p>

                    {errorMsg && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-100">{errorMsg}</div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@cafeanda.com" className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-cyan bg-gray-50 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <div className="relative flex items-center">
                                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-5 py-3.5 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-cyan bg-gray-50 focus:bg-white outline-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-400 hover:text-isaji-cyan transition-colors">
                                    {showPassword ? <span className="text-xs font-bold">SEMBUNYIKAN</span> : <span className="text-xs font-bold">LIHAT</span>}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-medium">
                                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded text-isaji-cyan focus:ring-isaji-cyan w-4 h-4 border-gray-300" /> Ingat Saya
                            </label>
                            <button type="button" onClick={() => onNavigate('forgot_password')} className="text-isaji-cyan hover:text-blue-700 font-bold transition-colors">Lupa Password?</button>
                        </div>

                        <button type="submit" disabled={isLoading} className="w-full bg-isaji-navy text-white font-bold py-3.5 rounded-xl hover:bg-blue-900 shadow-lg shadow-isaji-navy/30 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoading ? "Memproses..." : "Masuk Sekarang"}
                        </button>

                        <div className="relative flex items-center py-4">
                            <div className="flex-grow border-t border-gray-200"></div><span className="mx-4 text-gray-400 text-sm font-medium">atau</span><div className="flex-grow border-t border-gray-200"></div>
                        </div>

                        <button type="button" onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3.5 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-3 transition-all shadow-sm">
                            Google
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-gray-500 font-medium">
                        Belum punya akun? <button onClick={() => onNavigate('register')} className="text-isaji-orange font-bold hover:underline">Daftar Sekarang</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;