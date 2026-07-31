import React from 'react';

function Header({ user, branchData, handleLogout }) {
    return (
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 shadow-sm z-10 relative">
            <div className="flex items-center gap-4">
                <div className="bg-isaji-orange/10 p-2.5 rounded-xl">
                    <svg className="w-6 h-6 text-isaji-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                    </svg>
                </div>
                <div>
                    {/* Menampilkan nama cabang tempat manajer bertugas */}
                    <h1 className="text-lg font-black text-gray-900 tracking-tight">
                        {branchData?.name || 'Cabang Manajer'}
                    </h1>
                    <p className="text-xs font-bold text-isaji-orange uppercase tracking-wider">Panel Manajer Cabang</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                    {/* Menampilkan email manajer yang sedang login */}
                    <p className="text-sm font-bold text-gray-900">{user?.email || 'Manajer'}</p>
                    <p className="text-xs text-gray-500">Manajer Operasional</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Keluar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                    </svg>
                </button>
            </div>
        </header>
    );
}

export default Header;