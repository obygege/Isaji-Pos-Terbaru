import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

export default function ProfileTab() {
    const [currentEmail, setCurrentEmail] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentEmail(user.email);
        };
        fetchUser();
    }, []);

    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setEmailMsg({ type: '', text: '' });
        if (!newEmail) return;
        setSavingEmail(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) {
            setEmailMsg({ type: 'error', text: 'Gagal mengubah email: ' + error.message });
        } else {
            setEmailMsg({ type: 'success', text: 'Link konfirmasi sudah dikirim ke email baru. Cek inbox untuk menyelesaikan perubahan.' });
            setNewEmail('');
        }
        setSavingEmail(false);
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setPasswordMsg({ type: '', text: '' });

        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'Password minimal 6 karakter.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'Konfirmasi password tidak sama.' });
            return;
        }

        setSavingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            setPasswordMsg({ type: 'error', text: 'Gagal mengubah password: ' + error.message });
        } else {
            setPasswordMsg({ type: 'success', text: 'Password berhasil diubah.' });
            setNewPassword('');
            setConfirmPassword('');
        }
        setSavingPassword(false);
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl">
            <div>
                <h1 className="text-xl font-black text-gray-900">Pengaturan Akun</h1>
                <p className="text-sm text-gray-500">Kelola email dan password akun Super Admin kamu.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-1">Ubah Email</h3>
                <p className="text-xs text-gray-500 mb-4">Email login saat ini: <span className="font-bold text-gray-700">{currentEmail || '...'}</span></p>

                <form onSubmit={handleUpdateEmail} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Email Baru</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            placeholder="email-baru@contoh.com"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-isaji-orange/40"
                            required
                        />
                    </div>
                    {emailMsg.text && (
                        <p className={`text-xs font-bold ${emailMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{emailMsg.text}</p>
                    )}
                    <button type="submit" disabled={savingEmail} className="px-4 py-2 text-sm font-bold text-white bg-isaji-orange rounded-lg hover:opacity-90 disabled:opacity-50">
                        {savingEmail ? 'Menyimpan...' : 'Simpan Email'}
                    </button>
                </form>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-1">Ubah Password</h3>
                <p className="text-xs text-gray-500 mb-4">Gunakan password yang kuat dan tidak dipakai di tempat lain.</p>

                <form onSubmit={handleUpdatePassword} className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Password Baru</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Minimal 6 karakter"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-isaji-orange/40"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">Konfirmasi Password Baru</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Ulangi password baru"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-isaji-orange/40"
                            required
                        />
                    </div>
                    {passwordMsg.text && (
                        <p className={`text-xs font-bold ${passwordMsg.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{passwordMsg.text}</p>
                    )}
                    <button type="submit" disabled={savingPassword} className="px-4 py-2 text-sm font-bold text-white bg-isaji-orange rounded-lg hover:opacity-90 disabled:opacity-50">
                        {savingPassword ? 'Menyimpan...' : 'Simpan Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
