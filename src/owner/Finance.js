import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return 'Rp ' + Number(value || 0).toLocaleString('id-ID');
}

function monthStartStr() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

function Finance({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [summaries, setSummaries] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterBranch, setFilterBranch] = useState('all');
    const [dateFrom, setDateFrom] = useState(monthStartStr());
    const [dateTo, setDateTo] = useState(todayStr());

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const { data: branchData } = await supabase.from('branches').select('id, name').eq('organization_id', orgData.id);
            const allBranches = branchData || [];
            setBranches(allBranches);
            const branchIds = filterBranch === 'all' ? allBranches.map(b => b.id) : [filterBranch];
            if (branchIds.length === 0) { setIsLoading(false); return; }

            const [summaryRes, expenseRes] = await Promise.all([
                supabase
                    .from('daily_financial_summaries')
                    .select('*')
                    .in('branch_id', branchIds)
                    .gte('summary_date', dateFrom)
                    .lte('summary_date', dateTo)
                    .order('summary_date', { ascending: true }),
                supabase
                    .from('expenses')
                    .select('*, expense_categories(name), branches(name)')
                    .in('branch_id', branchIds)
                    .gte('expense_date', dateFrom)
                    .lte('expense_date', dateTo)
                    .order('expense_date', { ascending: false }),
            ]);

            setSummaries(summaryRes.data || []);
            setExpenses(expenseRes.data || []);
        } catch (err) {
            console.error('Gagal memuat laporan keuangan:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, filterBranch, dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const totals = summaries.reduce((acc, s) => {
        acc.grossSales += Number(s.gross_sales || 0);
        acc.netSales += Number(s.net_sales || 0);
        acc.cogs += Number(s.total_cogs || 0);
        acc.grossProfit += Number(s.gross_profit || 0);
        acc.expenses += Number(s.total_expenses || 0);
        acc.tax += Number(s.tax_amount || 0);
        acc.netProfit += Number(s.net_profit || 0);
        acc.orders += Number(s.total_orders || 0);
        return acc;
    }, { grossSales: 0, netSales: 0, cogs: 0, grossProfit: 0, expenses: 0, tax: 0, netProfit: 0, orders: 0 });

    const totalManualExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
                <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700">
                    <option value="all">Semua Cabang</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
                <span className="self-center text-gray-400 text-sm">s/d</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Kotor</p>
                    <p className="text-xl font-black text-gray-900 mt-2">{formatRupiah(totals.grossSales)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Bersih</p>
                    <p className="text-xl font-black text-gray-900 mt-2">{formatRupiah(totals.netSales)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Laba Kotor</p>
                    <p className="text-xl font-black text-gray-900 mt-2">{formatRupiah(totals.grossProfit)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-isaji-orange/30 shadow-sm bg-orange-50/40">
                    <p className="text-xs font-bold text-isaji-orange uppercase tracking-wider">Laba Bersih</p>
                    <p className="text-xl font-black text-gray-900 mt-2">{formatRupiah(totals.netProfit)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">HPP</p>
                    <p className="text-lg font-black text-gray-900 mt-2">{formatRupiah(totals.cogs)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Beban Operasional</p>
                    <p className="text-lg font-black text-gray-900 mt-2">{formatRupiah(totals.expenses)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pajak</p>
                    <p className="text-lg font-black text-gray-900 mt-2">{formatRupiah(totals.tax)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
                    <p className="text-lg font-black text-gray-900 mt-2">{totals.orders}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Ringkasan Harian</h3>
                </div>
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data...</div>
                ) : summaries.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">
                        Belum ada data ringkasan keuangan untuk periode ini. Data ini dihasilkan otomatis dari transaksi harian.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Tanggal</th>
                                    <th className="px-6 py-3 text-right">Penjualan Kotor</th>
                                    <th className="px-6 py-3 text-right">Diskon</th>
                                    <th className="px-6 py-3 text-right">HPP</th>
                                    <th className="px-6 py-3 text-right">Beban</th>
                                    <th className="px-6 py-3 text-right">Laba Bersih</th>
                                    <th className="px-6 py-3 text-right">Transaksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {summaries.map((s) => (
                                    <tr key={s.id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{s.summary_date}</td>
                                        <td className="px-6 py-3 text-right text-gray-700">{formatRupiah(s.gross_sales)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{formatRupiah(s.total_discount)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{formatRupiah(s.total_cogs)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{formatRupiah(s.total_expenses)}</td>
                                        <td className={`px-6 py-3 text-right font-bold ${Number(s.net_profit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatRupiah(s.net_profit)}</td>
                                        <td className="px-6 py-3 text-right text-gray-500">{s.total_orders}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-gray-900">Rincian Pengeluaran</h3>
                    <span className="text-sm font-bold text-gray-500">Total: {formatRupiah(totalManualExpenses)}</span>
                </div>
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data...</div>
                ) : expenses.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Tidak ada pengeluaran tercatat pada periode ini.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Tanggal</th>
                                    <th className="px-6 py-3">Cabang</th>
                                    <th className="px-6 py-3">Kategori</th>
                                    <th className="px-6 py-3">Deskripsi</th>
                                    <th className="px-6 py-3 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((e) => (
                                    <tr key={e.id} className="border-b border-gray-50">
                                        <td className="px-6 py-3 text-gray-500">{e.expense_date}</td>
                                        <td className="px-6 py-3 text-gray-600">{e.branches?.name || '-'}</td>
                                        <td className="px-6 py-3 text-gray-700">{e.expense_categories?.name || '-'}</td>
                                        <td className="px-6 py-3 text-gray-600">{e.description || '-'}</td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(e.amount)}</td>
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

export default Finance;