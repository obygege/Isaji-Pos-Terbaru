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

function monthStartISO() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
}

function DashboardHome({ orgData, user }) {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [stats, setStats] = useState({
        salesToday: 0,
        ordersToday: 0,
        salesMonth: 0,
        ordersMonth: 0,
        lowStockCount: 0,
        activeEmployees: 0,
        activeBranches: 0,
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [salesByBranch, setSalesByBranch] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        const { start, end } = todayRangeISO();
        const monthStart = monthStartISO();

        try {
            const { data: branchData } = await supabase
                .from('branches')
                .select('id, name, is_active')
                .eq('organization_id', orgData.id);
            const allBranches = branchData || [];
            setBranches(allBranches);
            const branchIds = selectedBranch === 'all' ? allBranches.map(b => b.id) : [selectedBranch];

            if (branchIds.length === 0) {
                setStats(s => ({ ...s, activeBranches: 0 }));
                setIsLoading(false);
                return;
            }

            const [ordersTodayRes, ordersMonthRes, lowStockRes, employeesRes] = await Promise.all([
                supabase
                    .from('orders')
                    .select('id, total_amount, status, order_number, customer_name, created_at, branch_id')
                    .in('branch_id', branchIds)
                    .gte('created_at', start)
                    .lte('created_at', end)
                    .order('created_at', { ascending: false }),

                supabase
                    .from('orders')
                    .select('id, total_amount, status, branch_id, order_items(qty, subtotal, product_id, products(name))')
                    .in('branch_id', branchIds)
                    .gte('created_at', monthStart),

                supabase
                    .from('ingredient_stocks')
                    .select('id, qty_on_hand, min_stock_alert, branch_id')
                    .in('branch_id', branchIds),

                supabase
                    .from('employees')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', orgData.id)
                    .eq('is_active', true),
            ]);

            const ordersToday = ordersTodayRes.data || [];
            const validToday = ordersToday.filter(o => o.status !== 'cancelled');
            const salesToday = validToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const ordersMonth = ordersMonthRes.data || [];
            const validMonth = ordersMonth.filter(o => o.status !== 'cancelled');
            const salesMonth = validMonth.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const lowStock = (lowStockRes.data || []).filter(s => Number(s.qty_on_hand) <= Number(s.min_stock_alert || 5));

            // Produk terlaris bulan ini
            const productMap = {};
            validMonth.forEach(o => {
                (o.order_items || []).forEach(it => {
                    const name = it.products?.name || 'Produk';
                    if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 };
                    productMap[name].qty += Number(it.qty || 0);
                    productMap[name].revenue += Number(it.subtotal || 0);
                });
            });
            const topProds = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

            // Penjualan per cabang bulan ini
            const branchMap = {};
            allBranches.forEach(b => { branchMap[b.id] = { name: b.name, sales: 0, orders: 0 }; });
            validMonth.forEach(o => {
                if (branchMap[o.branch_id]) {
                    branchMap[o.branch_id].sales += Number(o.total_amount || 0);
                    branchMap[o.branch_id].orders += 1;
                }
            });
            const branchSales = Object.values(branchMap).sort((a, b) => b.sales - a.sales);

            setStats({
                salesToday,
                ordersToday: validToday.length,
                salesMonth,
                ordersMonth: validMonth.length,
                lowStockCount: lowStock.length,
                activeEmployees: employeesRes.count || 0,
                activeBranches: allBranches.filter(b => b.is_active).length,
            });
            setRecentOrders(ordersToday.slice(0, 8));
            setTopProducts(topProds);
            setSalesByBranch(branchSales);
        } catch (err) {
            console.error('Gagal memuat ringkasan bisnis:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, selectedBranch]);

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 60000);
        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const maxBranchSales = Math.max(1, ...salesByBranch.map(b => b.sales));

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-isaji-navy to-blue-900 p-8 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black mb-1">Selamat Datang, {user?.user_metadata?.full_name || 'Owner'}!</h2>
                    <p className="text-blue-200 text-sm">
                        Ringkasan performa bisnis <strong>{orgData?.name || 'Anda'}</strong> di seluruh cabang.
                    </p>
                </div>
                {branches.length > 0 && (
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-white/10 border border-white/20 text-white text-sm font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-white/40"
                    >
                        <option className="text-gray-900" value="all">Semua Cabang</option>
                        {branches.map(b => (
                            <option className="text-gray-900" key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Hari Ini</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : formatRupiah(stats.salesToday)}</p>
                    <p className="text-xs text-gray-400 mt-1">{isLoading ? '' : `${stats.ordersToday} transaksi`}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Bulan Ini</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : formatRupiah(stats.salesMonth)}</p>
                    <p className="text-xs text-gray-400 mt-1">{isLoading ? '' : `${stats.ordersMonth} transaksi`}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Stok Menipis</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : `${stats.lowStockCount} Item`}</p>
                    <p className="text-xs text-gray-400 mt-1">di seluruh cabang terpilih</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Cabang & Tim</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{isLoading ? '...' : `${stats.activeBranches} Cabang`}</p>
                    <p className="text-xs text-gray-400 mt-1">{isLoading ? '' : `${stats.activeEmployees} karyawan aktif`}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-black text-gray-900">Penjualan per Cabang (Bulan Ini)</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        {isLoading ? (
                            <p className="text-sm text-gray-400 text-center py-4">Memuat data...</p>
                        ) : salesByBranch.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Belum ada data cabang.</p>
                        ) : (
                            salesByBranch.map((b, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-gray-700">{b.name}</span>
                                        <span className="text-gray-500">{formatRupiah(b.sales)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                                        <div
                                            className="bg-isaji-orange h-2.5 rounded-full"
                                            style={{ width: `${(b.sales / maxBranchSales) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="font-black text-gray-900">Produk Terlaris (Bulan Ini)</h3>
                    </div>
                    {isLoading ? (
                        <div className="px-6 py-10 text-center text-gray-400 text-sm">Memuat data...</div>
                    ) : topProducts.length === 0 ? (
                        <div className="px-6 py-10 text-center text-gray-400 text-sm">Belum ada penjualan produk.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Produk</th>
                                        <th className="px-6 py-3 text-right">Terjual</th>
                                        <th className="px-6 py-3 text-right">Omset</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((p, idx) => (
                                        <tr key={idx} className="border-b border-gray-50">
                                            <td className="px-6 py-3 font-bold text-gray-900">{p.name}</td>
                                            <td className="px-6 py-3 text-right text-gray-600">{p.qty}</td>
                                            <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(p.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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

export default DashboardHome;