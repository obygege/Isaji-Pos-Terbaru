import React, { useState, useEffect } from 'react';
import supabase from '../backend/lib/supabaseClient';

// MENERIMA PROP BARU: isOptional & onClose
function SubscriptionPlan({ user, orgData, isOptional, onClose }) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedPriceText, setSelectedPriceText] = useState('');
    const [companyName, setCompanyName] = useState(orgData?.name || '');

    const isTrialBlocked = orgData?.subscription_status === 'expired' || orgData?.trial_ends_at;

    useEffect(() => {
        const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
        const clientKey = process.env.REACT_APP_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-XXXXX';

        const script = document.createElement('script');
        script.src = snapScript;
        script.setAttribute('data-client-key', clientKey);
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const processToDatabase = async (payload) => {
        try {
            if (orgData?.id) {
                const { error } = await supabase.from('organizations').update(payload).eq('id', orgData.id);
                if (error) throw error;
            } else {
                payload.id = user.id;
                payload.owner_id = user.id;
                const { error } = await supabase.from('organizations').insert([payload]);
                if (error) throw error;
            }

            window.location.reload();
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan data: " + error.message);
            setLoading(false);
        }
    };

    const handlePlanClick = (planType, priceText) => {
        setSelectedPlan(planType);
        setSelectedPriceText(priceText);
        setStep(2);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) {
            alert("Mohon isi Nama Bisnis / Perusahaan Anda.");
            return;
        }

        setLoading(true);

        const baseSubdomain = companyName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const randomString = Math.random().toString(36).substring(2, 7);
        const generatedSubdomain = `${baseSubdomain}-${randomString}`;

        let payload = {
            name: companyName,
            subdomain: generatedSubdomain,
            subscription_plan: selectedPlan,
        };

        if (selectedPlan === 'trial') {
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);

            payload.subscription_status = 'trialing';
            payload.trial_ends_at = trialEndDate.toISOString();

            await processToDatabase(payload);
            return;
        }

        try {
            const token = "TOKEN_DARI_BACKEND_ANDA";

            if (!window.snap) {
                console.warn("Midtrans Snap tidak ditemukan. Simulasi Bypass Sukses.");
                payload.subscription_status = 'active';
                await processToDatabase(payload);
                return;
            }

            window.snap.pay(token, {
                onSuccess: function (result) {
                    payload.subscription_status = 'active';
                    processToDatabase(payload);
                },
                onPending: function (result) {
                    alert("Menunggu pembayaran Anda.");
                    setLoading(false);
                },
                onError: function (result) {
                    alert("Pembayaran Gagal.");
                    setLoading(false);
                },
                onClose: function () {
                    alert("Anda menutup jendela pembayaran.");
                    setLoading(false);
                }
            });

        } catch (error) {
            alert("Terjadi kesalahan sistem pembayaran.");
            setLoading(false);
        }
    };

    const PlanCard = ({ title, priceText, desc, features, planType, isPopular, isBlocked }) => (
        <div className={`relative bg-white rounded-2xl border ${isBlocked ? 'border-gray-200 bg-gray-50 opacity-70' : isPopular ? 'border-isaji-orange shadow-orange-100/50 shadow-xl scale-105 z-10' : 'border-gray-200 shadow-sm'} p-6 flex flex-col transition-all`}>
            {isPopular && !isBlocked && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-isaji-orange text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Paling Laris</div>}
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 h-10">{desc}</p>
            <div className="my-5">
                <span className="text-3xl font-extrabold text-gray-900">{priceText}</span>
                {priceText !== 'Gratis' && <span className="text-sm text-gray-500 font-medium">/bulan</span>}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
                {features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className={`${isBlocked ? 'text-gray-400' : 'text-green-500'} font-bold`}>✓</span> {feat}
                    </li>
                ))}
            </ul>
            <button
                onClick={() => {
                    if (!isBlocked) handlePlanClick(planType, priceText);
                }}
                disabled={isBlocked}
                className={`w-full py-3 rounded-xl font-bold transition-all ${isBlocked ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : isPopular ? 'bg-isaji-orange text-white hover:bg-orange-600' : 'bg-gray-50 text-gray-900 border border-gray-200 hover:bg-gray-100'}`}
            >
                {isBlocked ? 'Pernah Digunakan' : planType === 'trial' ? 'Mulai Coba Gratis' : 'Pilih Paket Ini'}
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">

            {/* LANGKAH 1 */}
            {step === 1 && (
                <div className="bg-gray-50 w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-3xl p-8 shadow-2xl relative flex flex-col items-center border border-gray-200 animate-in fade-in zoom-in duration-300">

                    {/* TOMBOL X - HANYA MUNCUL JIKA OPTIONAL (Sedang mau upgrade) */}
                    {isOptional && (
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors shadow-sm" title="Tutup Jendela">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}

                    <div className="text-center mb-10 max-w-2xl mt-4">
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-4">
                            {orgData?.subscription_status === 'expired' ? 'Akses Terkunci: Perpanjang Paket' : 'Pilih Paket Untuk Bisnis Anda'}
                        </h1>
                        <p className="text-gray-500">
                            Pilih paket yang paling sesuai dengan skala dan kebutuhan operasional cabang Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-6">
                        <PlanCard title="Trial 7 Hari" priceText="Gratis" planType="trial" desc="Coba seluruh fitur ISAJI tanpa komitmen." features={["Maksimal 1 Cabang", "Dukungan Dasar"]} isBlocked={isTrialBlocked} />
                        <PlanCard title="Paket Pro" priceText="Rp 99rb" planType="pro" desc="Cocok untuk kedai kecil yang merintis." features={["Maksimal 2 Cabang", "Manajemen 5 Karyawan"]} />
                        <PlanCard title="Professional" priceText="Rp 199rb" planType="professional" isPopular={true} desc="Sempurna untuk bisnis berkembang." features={["Maksimal 5 Cabang", "Karyawan Unlimited"]} />
                        <PlanCard title="Ultra" priceText="Rp 299rb" planType="ultra" desc="Solusi untuk jaringan bisnis besar." features={["Cabang Unlimited", "Dedicated Manager"]} />
                    </div>

                    {/* Tombol Bawah Menyesuaikan Kondisi */}
                    {isOptional ? (
                        <button onClick={onClose} className="mt-4 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors pb-4">
                            Kembali ke Dashboard
                        </button>
                    ) : (
                        <button onClick={() => supabase.auth.signOut()} className="mt-4 text-sm font-bold text-gray-500 hover:text-red-500 transition-colors pb-4">
                            Batal & Keluar / Sign Out
                        </button>
                    )}
                </div>
            )}

            {/* LANGKAH 2 */}
            {step === 2 && (
                <div className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl relative flex flex-col border border-gray-200 animate-in slide-in-from-right duration-300">

                    {/* TOMBOL KEMBALI KE LANGKAH 1 */}
                    <button onClick={() => setStep(1)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-800 transition-colors" title="Kembali Pilih Paket">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    </button>

                    {/* TOMBOL X (Tutup total jika optional) */}
                    {isOptional && (
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors" title="Tutup Jendela">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}

                    <div className="text-center mb-6 mt-4">
                        <span className="bg-orange-50 text-isaji-orange px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">
                            Paket Terpilih: {selectedPlan === 'trial' ? 'TRIAL 7 HARI' : selectedPlan.toUpperCase()}
                        </span>
                        <h2 className="text-2xl font-extrabold text-gray-900">Konfirmasi Bisnis</h2>
                        <p className="text-gray-500 text-sm mt-2">Lengkapi data di bawah ini untuk mengaktifkan sistem.</p>
                    </div>

                    <form onSubmit={handleSubmitForm} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Nama Bisnis / Perusahaan Anda <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                                placeholder="Cth: Kopi Senja Nusantara"
                                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-isaji-navy/20 outline-none text-gray-900 font-medium bg-gray-50 focus:bg-white transition-all"
                            />
                        </div>

                        {selectedPlan === 'trial' && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs text-gray-600 leading-relaxed space-y-2">
                                <p className="font-bold text-gray-900">Syarat & Ketentuan Trial:</p>
                                <p>• Akses gratis ke seluruh fitur operasional selama 7 Hari.</p>
                                <p>• Tidak diperlukan informasi kartu kredit.</p>
                                <p>• Setelah 7 hari, akses operasional akan diblokir hingga Anda melakukan *upgrade* paket.</p>
                                <p>• Seluruh data yang dimasukkan (cabang, menu, dll) tidak akan hilang setelah masa trial habis.</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-isaji-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                'Memproses...'
                            ) : selectedPlan === 'trial' ? (
                                'Setuju & Mulai Trial Sekarang'
                            ) : (
                                `Lanjut Bayar - ${selectedPriceText}`
                            )}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default SubscriptionPlan;