import React from 'react';

function Header({ activeMenu, user, handleLogout }) {
    return (
        <header className="h-20 bg-white border-b border-gray-100 px-8 flex justify-between items-center shrink-0 z-10">
            <h1 className="text-xl font-bold text-gray-800 capitalize">
                {activeMenu === 'dashboard' ? 'Ringkasan Bisnis' :
                    activeMenu === 'branches' ? 'Manajemen Cabang' :
                        activeMenu === 'employees' ? 'Anggota Tim' :
                            activeMenu === 'reports' ? 'Laporan Keuangan' : 'Halaman'}
            </h1>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-800">{user?.user_metadata?.full_name || 'Owner ISAJI'}</p>
                        <p className="text-xs text-gray-500 font-medium">{user?.user_metadata?.organization_name || 'Toko Utama'}</p>
                    </div>
                    <div className="w-9 h-9 bg-isaji-navy rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {user?.user_metadata?.full_name?.charAt(0).toUpperCase() || 'O'}
                    </div>
                </div>
                <div className="w-px h-6 bg-gray-200"></div>
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Keluar">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            </div>
        </header>
    );
}

export default Header;