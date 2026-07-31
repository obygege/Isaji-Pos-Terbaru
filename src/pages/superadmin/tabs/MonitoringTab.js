import React from 'react';

export default function MonitoringTab() {
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-black text-gray-900">Infrastructure Health (Simulated API)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-black p-4"><h3 className="font-bold text-white">Vercel Edge Network</h3></div>
                    <div className="p-6 space-y-5">
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1"><span className="text-gray-500">Bandwidth Usage</span><span className="text-gray-900">42 GB / 100 GB</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-black h-2 rounded-full w-[42%]"></div></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="bg-[#1C1C1C] p-4"><h3 className="font-bold text-white">Supabase Database</h3></div>
                    <div className="p-6 space-y-5">
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1"><span className="text-gray-500">Database Size (PostgreSQL)</span><span className="text-gray-900">320 MB / 500 MB</span></div>
                            <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-[#3ECF8E] h-2 rounded-full w-[64%]"></div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}