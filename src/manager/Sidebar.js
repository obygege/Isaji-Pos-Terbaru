import React, { useState } from 'react';

function Sidebar({ activeMenu, setActiveMenu }) {
    const [isInventoryOpen, setIsInventoryOpen] = useState(
        activeMenu === 'inventory' || activeMenu === 'stock_in' || activeMenu === 'stock_out'
    );

    const MenuItem = ({ id, label, icon }) => {
        const isActive = activeMenu === id;
        return (
            <button
                onClick={() => setActiveMenu(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 mb-1.5 rounded-lg transition-all duration-200 text-sm font-bold ${isActive
                    ? 'bg-isaji-navy/10 text-isaji-navy shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
            >
                <span className={`${isActive ? 'text-isaji-orange' : 'text-gray-400'}`}>
                    {icon}
                </span>
                <span className="flex-grow text-left">{label}</span>
            </button>
        );
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-20 hidden md:flex h-screen">
            <div className="h-20 flex items-center px-8 border-b border-gray-100 shrink-0">
                <img src="/LOGO.png" alt="ISAJI Logo" className="h-8 object-contain" />
                <span className="ml-2 text-xs font-extrabold text-gray-400 uppercase tracking-widest border-l border-gray-300 pl-2">Branch</span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto mt-2 custom-scrollbar space-y-6">
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Utama</p>
                    <MenuItem
                        id="dashboard"
                        label="Ringkasan Hari Ini"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>}
                    />
                </div>

                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Katalog & Stok</p>
                    <MenuItem
                        id="menu"
                        label="Manajemen Menu"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>}
                    />

                    {/* DROPDOWN STOK & BAHAN BAKU */}
                    <div className="space-y-1">
                        <button
                            onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-sm font-bold ${['inventory', 'stock_in', 'stock_out'].includes(activeMenu)
                                ? 'bg-isaji-navy/10 text-isaji-navy'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={['inventory', 'stock_in', 'stock_out'].includes(activeMenu) ? 'text-isaji-orange' : 'text-gray-400'}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                </span>
                                <span>Stok & Bahan Baku</span>
                            </div>
                            <svg className={`w-4 h-4 transition-transform ${isInventoryOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>

                        {isInventoryOpen && (
                            <div className="pl-6 space-y-1 border-l-2 border-gray-100 ml-4 my-1">
                                <button
                                    onClick={() => setActiveMenu('inventory')}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold transition-colors ${activeMenu === 'inventory' ? 'text-isaji-orange bg-orange-50/50' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    • Ringkasan Stok
                                </button>
                                <button
                                    onClick={() => setActiveMenu('stock_in')}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold transition-colors ${activeMenu === 'stock_in' ? 'text-isaji-orange bg-orange-50/50' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    • Barang Masuk (Restock)
                                </button>
                                <button
                                    onClick={() => setActiveMenu('stock_out')}
                                    className={`w-full text-left px-3 py-2 rounded-md text-xs font-bold transition-colors ${activeMenu === 'stock_out' ? 'text-isaji-orange bg-orange-50/50' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    • Barang Keluar (Usage)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">Pemasaran & Penjualan</p>
                    <MenuItem
                        id="discounts"
                        label="Diskon & Voucher"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>}
                    />
                    <MenuItem
                        id="customers"
                        label="Manajemen Pelanggan"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
                    />
                    <MenuItem
                        id="location_tracking"
                        label="Tracking Lokasi QR"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>}
                    />
                    <MenuItem
                        id="payment_methods"
                        label="Manajemen Pembayaran"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>}
                    />
                    {/* MENU BARU: MANAJEMEN QR MEJA */}
                    <MenuItem
                        id="table_qr"
                        label="Manajemen QR Meja"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>}
                    />
                    <MenuItem
                        id="recipe"
                        label="Resep Menu"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
                    />
                </div>

                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 mb-2 px-4 uppercase tracking-widest">SDM & Tim</p>
                    <MenuItem
                        id="team"
                        label="Data Karyawan"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>}
                    />
                    <MenuItem
                        id="attendance"
                        label="Absensi Karyawan"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    />
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;