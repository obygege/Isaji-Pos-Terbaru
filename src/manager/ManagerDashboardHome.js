import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function todayRangeISO() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString(), dateOnly: start.toISOString().slice(0, 10) };
}

function ManagerDashboardHome({ branchData }) {
    const [stats, setStats] = useState({
        salesToday: 0,
        ordersToday: 0,
        lowStockCount: 0,
        presentToday: 0,
        activeEmployees: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!branchData?.id) return;
        setIsLoading(true);
        const { start, end, dateOnly } = todayRangeISO();

        try {
            const [ordersRes, lowStockRes, attendanceRes, employeesRes] = await Promise.all([
                // Semua order cabang ini hari ini (buat hitung omset & jumlah transaksi)
                supabase
                    .from('orders')
                    .select('id, total_amount, status, order_number, customer_name, created_at')
                    .eq('branch_id', branchData.id)
                    .gte('created_at', start)
                    .lte('created_at', end)
                    .order('created_at', { ascending: false }),

                // Stok bahan baku yang sudah di bawah/sama dengan batas minimum
                supabase
                    .from('ingredient_stocks')
                    .select('id, qty_on_hand, min_stock_alert')
                    .eq('branch_id', branchData.id),

                // Karyawan yang sudah absen hadir hari ini
                supabase
                    .from('attendances')
                    .select('id, status')
                    .eq('branch_id', branchData.id)
                    .eq('attendance_date', dateOnly),

                // Total karyawan aktif di cabang ini (buat pembanding "x / y staf")
                supabase
                    .from('employees')
                    .select('id', { count: 'exact', head: true })
                    .eq('branch_id', branchData.id)
                    .eq('is_active', true),
            ]);

            const orders = ordersRes.data || [];
            const validOrders = orders.filter((o) => o.status !== 'cancelled');
            const salesToday = validOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const lowStock = (lowStockRes.data || []).filter((s) => Number(s.qty_on_hand) <= Number(s.min_stock_alert || 5));
            const presentToday = (attendanceRes.data || []).filter((a) => a.status === 'present').length;

            setStats({
                salesToday,
                ordersToday: validOrders.length,
                lowStockCount: lowStock.length,
                presentToday,
                activeEmployees: employeesRes.count || 0,
            });
            setRecentOrders(orders.slice(0, 6));
        } catch (err) {
            console.error('Gagal memuat ringkasan dashboard:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchData]);

    useEffect(() => {
        fetchDashboardData();
        // Refresh otomatis tiap 60 detik biar angka "hari ini" tetap up-to-date
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-isaji-navy to-blue-900 p-8 rounded-2xl text-white shadow-sm">
                <h2 className="text-2xl font-black mb-1">Selamat Datang, Manajer!</h2>
                <p className="text-blue-200 text-sm">
                    Mengelola operasional penuh untuk cabang <strong>{branchData?.name}</strong>.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Hari Ini</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : formatRupiah(stats.salesToday)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : `${stats.ordersToday} Pesanan`}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Stok Menipis</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : `${stats.lowStockCount} Item`}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Kehadiran Tim</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : `${stats.presentToday} / ${stats.activeEmployees} Staf`}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Transaksi Terbaru Hari Ini</h3>
                </div>
                {isLoading ? (
                    <div className="px-6 py-10 text-center text-gray-400 text-sm">Memuat data...</div>
                ) : recentOrders.length === 0 ? (
                    <div className="px-6 py-10 text-center text-gray-400 text-sm">Belum ada transaksi hari ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">No. Order</th>
                                    <th className="px-6 py-3">Pelanggan</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((o) => (
                                    <tr key={o.id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{o.order_number}</td>
                                        <td className="px-6 py-3 text-gray-600">{o.customer_name || '-'}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-[11px] font-bold ${o.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(o.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ManagerDashboardHome;