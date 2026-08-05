import React, { useState } from 'react';
import supabase from '../../backend/lib/supabaseClient';

function CustomerRegisterPage() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [subscribePromo, setSubscribePromo] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (fullName.trim().length < 3) return setErrorMsg('Nama minimal 3 karakter.');
        if (phone.replace(/\D/g, '').length < 10) return setErrorMsg('Nomor WhatsApp minimal 10 digit.');
        if (password.length < 6) return setErrorMsg('Password minimal 6 karakter.');

        setIsLoading(true);

        // 1. Buat akun Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
            setErrorMsg('Gagal daftar: ' + signUpError.message);
            setIsLoading(false);
            return;
        }

        const userId = authData.user?.id;
        if (!userId) {
            setErrorMsg('Pendaftaran gagal, coba lagi.');
            setIsLoading(false);
            return;
        }

        // 2. Simpan profil customer ke database real (bukan localStorage)
        const { error: profileError } = await supabase.from('customers').insert({
            user_id: userId,
            full_name: fullName.trim(),
            phone: phone.replace(/\D/g, ''),
            subscribe_promo: subscribePromo,
        });

        if (profileError) {
            setErrorMsg('Akun dibuat, tapi gagal simpan profil: ' + profileError.message);
            setIsLoading(false);
            return;
        }

        // 3. Kalau project Supabase tidak mewajibkan konfirmasi email, langsung bisa login
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
            window.history.back(); // langsung balik ke halaman self-order sebelumnya
            setIsLoading(false);
            return;
        }

        setSuccessMsg('Pendaftaran berhasil! Silakan cek email untuk konfirmasi, lalu login.');
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-isaji-orange to-orange-400 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg transform rotate-3">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-black text-gray-900">Daftar Member</h1>
                    <p className="text-sm text-gray-500 mt-1">Kumpulkan poin & dapat info promo lebih dulu.</p>
                </div>

                {errorMsg && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-100">{errorMsg}</div>}
                {successMsg && <div className="bg-green-50 text-green-600 text-xs font-bold p-3 rounded-xl mb-4 border border-green-100">{successMsg}</div>}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Nama Lengkap</label>
                        <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange" placeholder="Nama kamu" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Alamat Email</label>
                        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange" placeholder="nama@email.com" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">No. WhatsApp</label>
                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 14))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none font-mono focus:border-isaji-orange" placeholder="08xxxxxxxxxx" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5">Kata Sandi</label>
                        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-isaji-orange" placeholder="Minimal 6 karakter" />
                    </div>

                    <label className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100 cursor-pointer">
                        <input type="checkbox" checked={subscribePromo} onChange={(e) => setSubscribePromo(e.target.checked)}
                            className="w-4 h-4 mt-0.5 accent-isaji-orange" />
                        <span className="text-xs text-gray-700 font-medium">Ya, kirimi saya info diskon & promo terbaru lewat email/WhatsApp.</span>
                    </label>

                    <button type="submit" disabled={isLoading}
                        className="w-full bg-isaji-navy hover:bg-blue-900 text-white py-3.5 rounded-xl font-black shadow-md mt-2 transition-all disabled:opacity-50">
                        {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500 font-medium">
                        Sudah punya akun? <button onClick={() => { window.location.href = '/customer-login'; }} className="font-bold text-isaji-orange hover:underline">Login di sini</button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default CustomerRegisterPage;
