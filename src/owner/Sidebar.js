import React from 'react';

function Sidebar({ activeMenu, setActiveMenu, currentPlan = 'trial' }) {

    const planLevels = {
        basic: 1,
        pro: 2,
        professional: 3,
        ultra: 4
    };

    const MenuItem = ({ id, label, icon, minPlan = 'basic' }) => {
        const isActive = activeMenu === id;
        const isLocked = currentPlan === 'trial' ? false : (planLevels[currentPlan] < planLevels[minPlan]);

        return (
            <button
                onClick={() => !isLocked && setActiveMenu(id)}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 px-4 py-2.5 mb-1 rounded-lg transition-all duration-200 text-sm font-bold ${isLocked
                    ? 'opacity-50 cursor-not-allowed bg-gray-50'
                    : isActive
                        ? 'bg-isaji-navy/10 text-isaji-navy shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
            >
                <span className={`${isActive && !isLocked ? 'text-isaji-orange' : 'text-gray-400'}`}>
                    {icon}
                </span>

                <span className="flex-grow text-left">{label}</span>

                {isLocked && (
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                )}
            </button>
        );
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 hidden md:flex h-screen">
            <div className="h-20 flex items-center px-8 border-b border-gray-100 shrink-0">
                <img src="/LOGO.png" alt="ISAJI Logo" className="h-8 object-contain" />
            </div>

            {/* Tambahkan custom-scrollbar di CSS Anda jika kontennya memanjang */}
            <div className="p-4 flex-1 overflow-y-auto mt-2 custom-scrollbar space-y-6">

                {/* --- 1. KATEGORI UTAMA --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Utama</p>
                    <MenuItem
                        id="dashboard"
                        label="Ringkasan Bisnis"
                        minPlan="basic"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>}
                    />
                    <MenuItem
                        id="branches"
                        label="Daftar Cabang"
                        minPlan="pro"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>}
                    />
                </div>

                {/* --- 2. KATEGORI TRANSAKSI --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Transaksi</p>
                    <MenuItem
                        id="transaction-history"
                        label="Riwayat Transaksi"
                        minPlan="basic"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
                    />
                </div>

                {/* --- 3. KATEGORI KATALOG & STOK --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Katalog & Stok</p>
                    <MenuItem
                        id="products"
                        label="Laporan Menu"
                        minPlan="basic"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>}
                    />
                    <MenuItem
                        id="inventory"
                        label="Laporan Stok"
                        minPlan="pro"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>}
                    />
                </div>

                {/* --- 4. KATEGORI PELANGGAN --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Pelanggan</p>
                    <MenuItem
                        id="customers"
                        label="Data Pelanggan"
                        minPlan="pro"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>}
                    />
                    <MenuItem
                        id="loyalty"
                        label="Program Loyalitas"
                        minPlan="professional"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>}
                    />
                </div>

                {/* --- 5. KATEGORI SDM & OPERASIONAL --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">SDM & Operasional</p>
                    <MenuItem
                        id="employees"
                        label="Daftar Karyawan"
                        minPlan="pro"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>}
                    />
                    <MenuItem
                        id="attendance"
                        label="Absensi Karyawan"
                        minPlan="professional"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    />
                </div>

                {/* --- 6. KATEGORI KEUANGAN & PAJAK --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Keuangan & Pajak</p>
                    <MenuItem
                        id="finance"
                        label="Laporan Keuangan"
                        minPlan="ultra"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>}
                    />
                    <MenuItem
                        id="tax"
                        label="Laporan Pajak"
                        minPlan="ultra"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"></path></svg>}
                    />
                </div>

                {/* --- 7. PENGATURAN --- */}
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Sistem</p>
                    <MenuItem
                        id="settings"
                        label="Pengaturan Toko"
                        minPlan="basic"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                    />
                </div>

            </div>
        </aside>
    );
}

export default Sidebar;