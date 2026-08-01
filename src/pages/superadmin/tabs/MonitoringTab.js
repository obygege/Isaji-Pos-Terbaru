import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';
import { TABLE_SCHEMA } from '../dataSchema';

const Icon = ({ path, className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

// Semua tabel yang ada di database dipantau (diambil dari dataSchema.js)
const WATCHED_TABLES = Object.keys(TABLE_SCHEMA);

function MonitoringTab() {
    const [counts, setCounts] = useState({});
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCounts = async () => {
            const results = await Promise.all(
                WATCHED_TABLES.map(t =>
                    supabase.from(t).select('id', { count: 'exact', head: true }).then(res => ({ table: t, count: res.count || 0 }))
                )
            );
            const map = {};
            results.forEach(r => { map[r.table] = r.count; });
            setCounts(map);

            const { data: orders } = await supabase
                .from('orders')
                .select('order_number, status, payment_status, total_amount, created_at')
                .order('created_at', { ascending: false })
                .limit(8);
            setRecentOrders(orders || []);

            setLoading(false);
        };
        fetchCounts();
    }, []);

    const totalTables = Object.keys(TABLE_SCHEMA).length;
    const totalWatchedRows = Object.values(counts).reduce((a, b) => a + b, 0);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-black text-gray-900">Database Monitoring</h1>
                <p className="text-sm text-gray-500">Pantauan real dari struktur & isi database — {totalTables} tabel terdaftar.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Total Tabel</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Icon path="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{totalTables}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Total Baris (Seluruh Database)</h3>
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><Icon path="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></div>
                    </div>
                    <div className="text-3xl font-black text-gray-900">{loading ? '...' : totalWatchedRows.toLocaleString('id-ID')}</div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-gray-500 text-xs font-bold uppercase">Order Terakhir Masuk</h3>
                        <div className="p-2 bg-orange-50 text-isaji-orange rounded-lg"><Icon path="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></div>
                    </div>
                    <div className="text-sm font-black text-gray-900">
                        {recentOrders[0] ? new Date(recentOrders[0].created_at).toLocaleString('id-ID') : loading ? '...' : 'Belum ada order'}
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Jumlah Baris per Tabel (Seluruh Database)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {WATCHED_TABLES.map(t => (
                        <div key={t} className="border border-gray-100 rounded-xl p-4">
                            <p className="text-[10px] font-bold text-gray-400 uppercase truncate">{t}</p>
                            <p className="text-xl font-black text-gray-900">{loading ? '...' : (counts[t] ?? 0).toLocaleString('id-ID')}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Aktivitas Order Terbaru (Seluruh Tenant)</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                                <th className="p-3 font-black">No. Order</th>
                                <th className="p-3 font-black">Status</th>
                                <th className="p-3 font-black">Pembayaran</th>
                                <th className="p-3 font-black">Total</th>
                                <th className="p-3 font-black">Waktu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="p-6 text-center text-gray-400 text-xs">Memuat...</td></tr>
                            ) : recentOrders.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-gray-400 text-xs">Belum ada order.</td></tr>
                            ) : recentOrders.map((o, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    <td className="p-3 text-xs font-bold text-gray-700">{o.order_number}</td>
                                    <td className="p-3 text-xs capitalize">{o.status}</td>
                                    <td className="p-3 text-xs capitalize">{o.payment_status}</td>
                                    <td className="p-3 text-xs font-bold">Rp {Number(o.total_amount || 0).toLocaleString('id-ID')}</td>
                                    <td className="p-3 text-xs text-gray-400">{new Date(o.created_at).toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default MonitoringTab;
