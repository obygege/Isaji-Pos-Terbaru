import React from 'react';

function SuperAdminHeader({ searchQuery, setSearchQuery }) {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
            <div>
                <h1 className="text-xl font-black text-gray-900">Command Center</h1>
                <p className="text-xs font-medium text-gray-500">Isaji POS Global Infrastructure</p>
            </div>

            <div className="flex items-center gap-6">
                <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 focus-within:border-isaji-orange focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search tenants or domains..."
                        className="bg-transparent text-sm text-gray-900 outline-none w-56 placeholder-gray-400"
                    />
                </div>

                <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-black text-gray-900">Rusdianah</p>
                        <p className="text-[10px] text-isaji-orange font-bold uppercase">System Owner</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white border-2 border-isaji-orange shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default SuperAdminHeader;