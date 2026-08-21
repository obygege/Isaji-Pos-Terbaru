import React, { useState } from 'react';

function SelfOrderHeader({ branch, tableInfo, activeTab, setActiveTab, customerProfile, onLogoutMember }) {
    const [showMenu, setShowMenu] = useState(false);
    const initials = (customerProfile?.full_name || 'M').trim().charAt(0).toUpperCase();

    // Peta "kembali" untuk setiap tahap checkout supaya tombol back di header konsisten
    // dengan alur baru: keranjang -> data pemesan -> pilih pembayaran -> (bukti/tunggu).
    const backTargetMap = {
        cart: 'menu',
        order_form: 'cart',
        payment: 'order_form',
        payment_proof: 'payment',
        cash_wait: 'payment',
        gateway_wait: 'payment',
        payment_status: 'menu'
    };
    const handleBack = () => setActiveTab(backTargetMap[activeTab] || 'menu');

    return (
        <div className="bg-isaji-navy px-5 pt-4 pb-5 rounded-b-[1.75rem] shadow-lg z-40 sticky top-0 animate-fade-in">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5 min-w-0">
                    {activeTab !== 'menu' && activeTab !== 'success' ? (
                        <button
                            onClick={handleBack}
                            className="p-2 bg-white/10 text-white rounded-full hover:bg-white/20 active:scale-90 transition-all shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 overflow-hidden border border-white/10">
                            {branch?.logo_url ? (
                                <img src={branch.logo_url} alt="Logo" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                            ) : (
                                <span className="text-white font-black text-xs">{branch?.name?.charAt(0) || 'B'}</span>
                            )}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {branch?.name || 'Memuat...'}
                        </p>
                        <h1 className="text-sm font-black text-white line-clamp-1">
                            {tableInfo?.name ? `Meja ${tableInfo.name}` : 'Self Order'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => window.open(`https://wa.me/${branch?.phone || ''}?text=Halo%20Admin,%20saya%20butuh%20bantuan%20di%20Self-Order`, '_blank')}
                        className="relative p-2 bg-white/10 text-white rounded-full hover:bg-white/20 active:scale-90 transition-all"
                        title="Bantuan"
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </button>

                    {customerProfile ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(v => !v)}
                                className="w-9 h-9 rounded-full bg-gradient-to-tr from-isaji-orange to-orange-400 text-white font-black text-xs flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                                title={customerProfile.full_name}
                            >
                                {initials}
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-50 animate-pop-in origin-top-right">
                                    <p className="px-3 py-2 text-xs font-black text-gray-800 truncate">{customerProfile.full_name}</p>
                                    <button
                                        onClick={() => { setShowMenu(false); onLogoutMember(); }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        Keluar
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => window.location.href = '/customer-login'}
                            className="text-[10px] font-black text-isaji-navy bg-white px-3 py-2 rounded-full uppercase tracking-wider shadow-sm active:scale-95 transition-transform"
                        >
                            Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SelfOrderHeader;