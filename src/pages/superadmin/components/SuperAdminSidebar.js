import React from 'react';
import { superAdminSignOut } from '../superAdminAuth';

// Helper Komponen SVG Icon agar rapi
const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

function SuperAdminSidebar({ activeMenu, setActiveMenu }) {
    const menus = [
        { id: 'overview', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', label: 'Dasbor' },
        { id: 'tenants', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', label: 'Manajemen Tenant' },
        { id: 'finance', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Keuangan SaaS' },
        { id: 'database', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4', label: 'Jelajah Database' },
        { id: 'monitoring', icon: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01', label: 'Monitoring Database' },
        { id: 'security', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Audit Keamanan' },
        { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: 'Pengaturan Akun' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col justify-between h-screen fixed top-0 left-0 z-50">
            <div>
                {/* Logo Area */}
                <div className="p-6 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-8 h-8 bg-isaji-orange rounded-lg flex items-center justify-center">
                        <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-900 tracking-wide">ISAJI<span className="text-isaji-orange">POS</span></h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Super Admin</p>
                    </div>
                </div>

                <nav className="p-4 space-y-1">
                    {menus.map(menu => (
                        <button
                            key={menu.id}
                            onClick={() => setActiveMenu(menu.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeMenu === menu.id
                                    ? 'bg-orange-50 text-isaji-orange'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            <Icon path={menu.icon} />
                            {menu.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-4 border-t border-gray-100">
                <button onClick={async () => { await superAdminSignOut(); window.location.href = '/isaji-command-center'; }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors">
                    <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    Kunci Sistem
                </button>
            </div>
        </aside>
    );
}

export default SuperAdminSidebar;