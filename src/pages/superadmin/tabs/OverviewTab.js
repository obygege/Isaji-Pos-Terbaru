import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

const Icon = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

export default function OverviewTab() {
    const [stats, setStats] = useState({ total: 0, premium: 0, revenue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRealStats = async () => {
            const { data, error } = await supabase.from('organizations').select('subscription_status');
            if (!error && data) {
                const premiumCount = data.filter(org => org.subscription_status === 'paid').length;
                setStats({
                    total: data.length,
                    premium: premiumCount,
                    revenue: premiumCount * 150000 // Harga Asumsi per bulan
                });
            }
            setLoading(false);
        };
        fetchRealStats();
    }, []);

    if (loading) return <div className="text-isaji-orange font-bold text-center">Loading Data...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Total Tenants</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Active Subs</h3>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Icon path="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stats.premium}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Monthly Recurring Revenue (MRR)</h3>
                        <div className="p-2 bg-orange-50 text-isaji-orange rounded-lg"><Icon path="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">Rp {stats.revenue.toLocaleString('id-ID')}</div>
                </div>
            </div>

            {/* Chart Simulation */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-gray-900 text-sm font-black mb-6">SaaS Growth Trend (Real Database Count)</h3>
                <div className="h-24 w-full bg-gray-50 rounded-xl flex items-center justify-center text-xs font-bold text-gray-400 border-2 border-dashed border-gray-200">
                    Sistem membaca {stats.total} tenant dari Database
                </div>
            </div>
        </div>
    );
}