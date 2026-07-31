import React, { useState, useEffect } from 'react';

function Home({ onNavigate }) {
    // State untuk Slider Gambar Hero
    const [currentSlide, setCurrentSlide] = useState(0);

    const sliderImages = [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
        "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
        "https://images.unsplash.com/photo-1521017432531-fbd92d768814?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
    ];

    // Animasi Slider Hero
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
        }, 3000);
        return () => clearInterval(timer);
    }, [sliderImages.length]);

    // Data Paket Harga
    const pricingPlans = [
        {
            title: "Trial 7 Hari",
            desc: "Coba seluruh fitur ISAJI tanpa komitmen.",
            price: "Gratis",
            period: "",
            features: ["Maksimal 1 Cabang", "Dukungan Dasar"],
            buttonText: "Pernah Digunakan",
            isDisabled: true,
            isPopular: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            )
        },
        {
            title: "Paket Pro",
            desc: "Cocok untuk kedai kecil yang merintis.",
            price: "Rp 99rb",
            period: "/bulan",
            features: ["Maksimal 2 Cabang", "Manajemen 5 Karyawan"],
            buttonText: "Pilih Paket Ini",
            isDisabled: false,
            isPopular: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75v-3.75a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
            )
        },
        {
            title: "Professional",
            desc: "Sempurna untuk bisnis berkembang.",
            price: "Rp 199rb",
            period: "/bulan",
            features: ["Maksimal 5 Cabang", "Karyawan Unlimited"],
            buttonText: "Pilih Paket Ini",
            isDisabled: false,
            isPopular: true, // Akan me-render tampilan khusus
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-isaji-orange">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.452.9.9 0 0 0-1.6.096L4 12" />
                </svg>
            )
        },
        {
            title: "Ultra",
            desc: "Solusi untuk jaringan bisnis besar.",
            price: "Rp 299rb",
            period: "/bulan",
            features: ["Cabang Unlimited", "Dedicated Manager"],
            buttonText: "Pilih Paket Ini",
            isDisabled: false,
            isPopular: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-purple-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
            )
        }
    ];

    return (
        <div className="font-sans text-gray-800 bg-gray-50 min-h-screen selection:bg-isaji-cyan selection:text-white">
            {/* NAVBAR */}
            <nav className="fixed w-full top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 py-4 px-6 md:px-12 flex justify-between items-center transition-all duration-300">
                <div className="cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                    <img src="/LOGO.png" alt="ISAJI Logo" className="h-10 md:h-12 object-contain" />
                </div>
                <ul className="hidden md:flex gap-10 font-semibold text-isaji-navy">
                    <li><a href="#beranda" className="hover:text-isaji-cyan transition-colors duration-300">Beranda</a></li>
                    <li><a href="#fitur" className="hover:text-isaji-cyan transition-colors duration-300">Fitur</a></li>
                    <li><a href="#harga" className="hover:text-isaji-cyan transition-colors duration-300">Harga</a></li>
                    <li><a href="#syarat" className="hover:text-isaji-cyan transition-colors duration-300">Syarat</a></li>
                </ul>
                <button
                    onClick={() => onNavigate('login')}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-7 py-2.5 rounded-full font-bold shadow-lg shadow-isaji-navy/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                >
                    Coba Sekarang
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                </button>
            </nav>

            {/* HERO SECTION */}
            <section id="beranda" className="relative w-full min-h-screen flex items-center pt-20 overflow-hidden bg-isaji-navy">
                {sliderImages.map((img, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
                        style={{ transitionProperty: 'opacity, transform' }}
                    >
                        <img src={img} alt={`Slider ${index}`} className="w-full h-full object-cover" />
                    </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-isaji-navy/95 via-isaji-navy/80 to-transparent z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full flex flex-col md:flex-row items-center">
                    <div className="w-full md:w-2/3 text-left space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-isaji-cyan font-semibold text-sm mb-4">
                            <span className="w-2 h-2 rounded-full bg-isaji-orange animate-ping"></span>
                            Sistem SaaS POS Generasi Baru
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight">
                            Revolusi Bisnis F&B <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-isaji-cyan to-isaji-orange">Dalam Satu Sentuhan</span>
                        </h1>
                        <p className="text-lg md:text-2xl text-gray-200 max-w-2xl font-light">
                            Kelola kasir, inventori bahan baku, multi-cabang, hingga penggajian karyawan lebih mudah, cepat, dan akurat.
                        </p>
                        <div className="pt-4 flex flex-col sm:flex-row gap-5">
                            <button
                                onClick={() => onNavigate('login')}
                                className="bg-gradient-to-r from-isaji-orange to-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl shadow-orange-500/40 hover:-translate-y-1 hover:scale-105 transition-all duration-300"
                            >
                                Mulai Demo Gratis
                            </button>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 flex gap-3">
                    {sliderImages.map((_, i) => (
                        <button key={i} onClick={() => setCurrentSlide(i)} className={`h-2.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-10 bg-isaji-cyan' : 'w-2.5 bg-white/40 hover:bg-white/70'}`} />
                    ))}
                </div>
            </section>

            {/* CLIENTS LOGO */}
            <section className="py-12 bg-white border-b border-gray-100 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm font-bold text-gray-400 tracking-widest uppercase mb-8">Dipercaya Oleh Berbagai Cafe & Resto</p>
                    <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <img key={num} src={`https://via.placeholder.com/200x80/ffffff/0F2040?text=LOGO+KLIEN+${num}`} alt={`Client ${num}`} className="h-12 md:h-16 object-contain grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100" />
                        ))}
                    </div>
                </div>
            </section>

            {/* FITUR SECTION */}
            <section id="fitur" className="py-24 px-6 md:px-12 bg-gray-50">
                <div className="max-w-7xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-isaji-navy mb-6">Ekosistem Super Lengkap</h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto mb-16">
                        Arsitektur database yang dirancang khusus untuk memenuhi kompleksitas operasional F&B, dari front-end kasir hingga back-office.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            { title: "Kasir & Transaksi", desc: "Manajemen order, modifier, cashier shifts, hingga laporan finansial harian.", color: "text-isaji-cyan", bg: "bg-blue-50" },
                            { title: "Inventori & Resep", desc: "Kontrol ingredient stocks, resep produk, dan histori pembelian stok.", color: "text-isaji-orange", bg: "bg-orange-50" },
                            { title: "HR & Payroll", desc: "Atur data employees, absensi cuti, hingga pembuatan payslips otomatis.", color: "text-blue-600", bg: "bg-blue-50" },
                            { title: "Multi-Cabang", desc: "Satu organisasi profile untuk banyak cabang. Setting tax dan harga dinamis.", color: "text-isaji-cyan", bg: "bg-cyan-50" }
                        ].map((item, idx) => (
                            <div key={idx} className="p-8 rounded-3xl bg-white border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 text-left">
                                <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-6`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>
                                </div>
                                <h4 className="text-xl font-bold text-isaji-navy mb-3">{item.title}</h4>
                                <p className="text-gray-600 font-medium">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING / HARGA SECTION */}
            <section id="harga" className="py-24 px-6 md:px-12 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-isaji-navy mb-4">Pilih Paket Untuk Bisnis Anda</h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            Pilih paket yang paling sesuai dengan skala dan kebutuhan operasional cabang Anda.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
                        {pricingPlans.map((plan, index) => (
                            <div
                                key={index}
                                className={`relative flex flex-col p-8 rounded-3xl bg-white border transition-all duration-300 ${plan.isPopular
                                        ? 'border-isaji-orange shadow-2xl shadow-orange-500/20 md:scale-105 z-10'
                                        : 'border-gray-200 hover:shadow-xl hover:-translate-y-1'
                                    }`}
                            >
                                {plan.isPopular && (
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                        <span className="bg-gradient-to-r from-isaji-orange to-orange-500 text-white text-xs font-bold uppercase tracking-widest py-1.5 px-4 rounded-full shadow-lg">
                                            Paling Laris
                                        </span>
                                    </div>
                                )}

                                <div className="mb-6 flex justify-between items-start">
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{plan.title}</h3>
                                        <p className="text-sm text-gray-500 mt-2">{plan.desc}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-2xl">
                                        {plan.icon}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500 font-medium">{plan.period}</span>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature, fIndex) => (
                                        <li key={fIndex} className="flex items-center gap-3 text-gray-700 font-medium">
                                            <svg className={`w-5 h-5 flex-shrink-0 ${plan.isPopular ? 'text-isaji-orange' : 'text-green-500'}`} fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${plan.isDisabled
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : plan.isPopular
                                                ? 'bg-isaji-orange text-white hover:bg-orange-600 shadow-lg shadow-orange-500/30 hover:-translate-y-0.5'
                                                : 'bg-isaji-navy text-white hover:bg-blue-900 shadow-lg shadow-isaji-navy/20 hover:-translate-y-0.5'
                                        }`}
                                >
                                    {plan.buttonText}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* SYARAT LAYANAN / MONETISASI */}
            <section id="syarat" className="py-24 px-6 md:px-12 bg-gray-50">
                <div className="max-w-5xl mx-auto">
                    <div className="bg-white p-10 md:p-14 rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-isaji-cyan/5 rounded-full blur-3xl group-hover:bg-isaji-cyan/10 transition-colors duration-700"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-blue-50 rounded-xl text-isaji-navy">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-isaji-navy">Syarat Monetisasi & Keamanan</h2>
                            </div>
                            <div className="text-gray-600 space-y-6 text-lg leading-relaxed font-medium">
                                <p>Proses KYC (Know Your Customer) untuk mengaktifkan fitur Payment Gateway:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                    <div className="flex gap-4 items-start">
                                        <svg className="w-6 h-6 text-isaji-orange mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                                        <div><strong className="block text-gray-800">Identitas KTP</strong><span className="text-sm block mt-1">Upload KTP pemilik/penanggung jawab.</span></div>
                                    </div>
                                    <div className="flex gap-4 items-start">
                                        <svg className="w-6 h-6 text-isaji-orange mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                        <div><strong className="block text-gray-800">Legalitas NIB</strong><span className="text-sm block mt-1">Wajib NIB untuk paket Business & Ultra.</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEEDBACK SECTION */}
            <section className="py-24 px-6 md:px-12 bg-isaji-navy relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-isaji-cyan rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-isaji-orange rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>

                <div className="max-w-4xl mx-auto relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 text-white text-left">
                        <h2 className="text-4xl font-extrabold mb-4">Kami Mendengar Anda.</h2>
                        <p className="text-gray-300 font-medium text-lg mb-6">Punya kritik, saran, atau butuh bantuan teknis? Tim kami siap merespon dalam waktu kurang dari 24 jam.</p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><svg className="w-5 h-5 text-isaji-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div>
                                <span className="font-semibold">support@isaji.com</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full bg-white rounded-3xl p-8 shadow-2xl">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">Kirim Pesan</h3>
                        <form className="space-y-5">
                            <div><input type="text" placeholder="Nama Lengkap" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-isaji-cyan bg-gray-50 focus:bg-white transition-all font-medium" /></div>
                            <div><input type="email" placeholder="Email Address" className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-isaji-cyan bg-gray-50 focus:bg-white transition-all font-medium" /></div>
                            <div><textarea rows="4" placeholder="Ketik kritik atau saran Anda disini..." className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-isaji-cyan bg-gray-50 focus:bg-white transition-all font-medium resize-none"></textarea></div>
                            <button type="button" className="w-full bg-isaji-orange text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 hover:-translate-y-1 transition-all duration-300">Kirim Pesan</button>
                        </form>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-gray-900 pt-16 pb-8 text-center text-gray-400">
                <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
                    <img src="/LOGO.png" alt="ISAJI Logo" className="h-14 mb-6 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300 object-contain" />
                    <p className="font-medium mb-8">Inovasi Sistem Saji - Empowering F&B Businesses.</p>
                    <div className="w-24 h-1 bg-gray-800 rounded-full mb-8"></div>
                    <p className="text-sm font-medium">&copy; {new Date().getFullYear()} ISAJI. All rights reserved.</p>

                    <div className="mt-4 pt-4 border-t border-gray-800 w-full flex justify-center items-center gap-2">
                        <span className="text-xs text-gray-500">System crafted with precision by</span>
                        <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-isaji-cyan to-blue-400 tracking-wider">FUTURA LINK</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;