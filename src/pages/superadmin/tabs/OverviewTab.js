import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

const Icon = ({ path }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

export default function OverviewTab() {
    const [stats, setStats] = useState({ total: 0, premium: 0, revenue: 0, branches: 0, employees: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRealStats = async () => {
            // Ambil data tenant, jumlah cabang, dan jumlah karyawan aktif secara paralel
            const [orgsRes, branchesRes, employeesRes] = await Promise.all([
                supabase.from('organizations').select('subscription_status'),
                supabase.from('branches').select('id', { count: 'exact', head: true }),
                supabase.from('employees').select('id', { count: 'exact', head: true }).eq('is_active', true),
            ]);

            const orgs = orgsRes.data || [];
            const premiumCount = orgs.filter(org => org.subscription_status === 'paid').length;

            setStats({
                total: orgs.length,
                premium: premiumCount,
                revenue: premiumCount * 150000, // Harga Asumsi per bulan
                branches: branchesRes.count || 0,
                employees: employeesRes.count || 0,
            });
            setLoading(false);
        };
        fetchRealStats();
    }, []);

    if (loading) return <div className="text-isaji-orange font-bold text-center">Memuat Data...</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Total Tenant</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stats.total}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Langganan Aktif</h3>
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

            {/* Real Data: Cabang & Karyawan Aktif dari seluruh tenant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Total Cabang (Seluruh Tenant)</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Icon path="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stats.branches}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Karyawan Aktif (Seluruh Tenant)</h3>
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{stats.employees}</div>
                </div>
            </div>

            {/* Chart Simulation */}
            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                <h3 className="text-gray-900 text-sm font-black mb-6">Tren Pertumbuhan SaaS (Data Real Database)</h3>
                <div className="h-24 w-full bg-gray-50 rounded-xl flex items-center justify-center text-xs font-bold text-gray-400 border-2 border-dashed border-gray-200">
                    Sistem membaca {stats.total} tenant dari Database
                </div>
            </div>
        </div>
    );
}