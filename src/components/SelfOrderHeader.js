import React from 'react';

function SelfOrderHeader({ branch, activeTab, setActiveTab, customerProfile, onLogoutMember }) {
    return (
        <div className="bg-white px-5 py-3 flex justify-between items-center shadow-sm z-40 sticky top-0">
            <div className="flex items-center gap-3">
                {activeTab !== 'menu' && activeTab !== 'success' ? (
                    <button
                        onClick={() => setActiveTab(activeTab === 'checkout' ? 'cart' : 'menu')}
                        className="p-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {branch?.logo_url ? (
                            <img src={branch.logo_url} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-gray-200" onError={(e) => { e.target.style.display = 'none' }} />
                        ) : (
                            <div className="w-8 h-8 bg-gradient-to-tr from-isaji-orange to-orange-400 rounded-full flex items-center justify-center text-white font-black text-xs shadow-sm">
                                {branch?.name?.charAt(0) || 'B'}
                            </div>
                        )}
                        <h1 className="text-sm font-black text-gray-800 line-clamp-1">{branch?.name || 'Memuat...'}</h1>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-1.5">
                {/* Tombol Bantuan WA */}
                <button onClick={() => window.open(`https://wa.me/${branch?.phone || ''}?text=Halo%20Admin,%20saya%20butuh%20bantuan%20di%20Self-Order`, '_blank')} className="p-2 text-isaji-navy hover:bg-blue-50 rounded-full transition-colors" title="Customer Service">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </button>
                {/* Status Member: kalau sudah login tampilkan nama + logout, kalau belum tampilkan tombol Login/Daftar */}
                {customerProfile ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-isaji-navy bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-wider max-w-[100px] truncate" title={customerProfile.full_name}>
                            Halo, {customerProfile.full_name?.split(' ')[0]}
                        </span>
                        <button onClick={onLogoutMember} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors" title="Keluar dari akun member">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                    </div>
                ) : (
                    <button onClick={() => window.location.href = '/customer-login'} className="text-[10px] font-black text-white bg-isaji-navy px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm hover:bg-blue-900 transition-colors">
                        Login / Daftar
                    </button>
                )}
            </div>
        </div>
    );
}

export default SelfOrderHeader;