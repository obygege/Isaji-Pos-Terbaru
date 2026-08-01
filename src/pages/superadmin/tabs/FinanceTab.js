import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

export default function FinanceTab() {
    const [grossRevenue, setGrossRevenue] = useState(0);
    const [realTransactions, setRealTransactions] = useState({ grossSales: 0, netProfit: 0, totalOrders: 0 });

    useEffect(() => {
        const fetchFinances = async () => {
            const { data } = await supabase.from('organizations').select('subscription_status');
            if (data) {
                const paidCount = data.filter(o => o.subscription_status === 'paid').length;
                setGrossRevenue(paidCount * 150000);
            }

            // Data transaksi real seluruh tenant, dari tabel daily_financial_summaries
            const { data: summaries } = await supabase
                .from('daily_financial_summaries')
                .select('gross_sales, net_profit, total_orders');

            if (summaries) {
                setRealTransactions({
                    grossSales: summaries.reduce((sum, s) => sum + Number(s.gross_sales || 0), 0),
                    netProfit: summaries.reduce((sum, s) => sum + Number(s.net_profit || 0), 0),
                    totalOrders: summaries.reduce((sum, s) => sum + Number(s.total_orders || 0), 0),
                });
            }
        };
        fetchFinances();
    }, []);

    const taxAmount = grossRevenue * 0.11;
    const serverCapital = 350000;
    const netProfit = grossRevenue - taxAmount - serverCapital;

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-black text-gray-900">Omset Transaksi Real (Seluruh Tenant)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">Gross Sales</h4>
                    <p className="text-xl font-black text-gray-900 mt-2">Rp {realTransactions.grossSales.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">Net Profit</h4>
                    <p className="text-xl font-black text-green-600 mt-2">Rp {realTransactions.netProfit.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase">Total Orders</h4>
                    <p className="text-xl font-black text-gray-900 mt-2">{realTransactions.totalOrders.toLocaleString('id-ID')}</p>
                </div>
            </div>
            <p className="text-xs text-gray-400 max-w-3xl">Data di atas dihitung langsung dari tabel <code>daily_financial_summaries</code> seluruh cabang/tenant.</p>

            <h2 className="text-lg font-black text-gray-900 pt-4">SaaS Subscription Revenue (Estimasi)</h2>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-3xl">
                <div className="flex flex-col gap-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                            <h4 className="font-bold text-gray-900">Gross Subscription Revenue</h4>
                            <p className="text-xs text-gray-500">Omset kotor bulanan (Rp 150.000 / tenant premium)</p>
                        </div>
                        <span className="text-xl font-black text-gray-900">Rp {grossRevenue.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                            <h4 className="font-bold text-gray-900">Pajak Negara (PPN 11%)</h4>
                        </div>
                        <span className="text-lg font-bold text-red-500">- Rp {taxAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <div>
                            <h4 className="font-bold text-gray-900">Biaya Server Bulanan</h4>
                        </div>
                        <span className="text-lg font-bold text-red-500">- Rp {serverCapital.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 bg-green-50 p-6 rounded-xl border border-green-100">
                        <div>
                            <h4 className="font-black text-green-900 text-lg">Laba Bersih SaaS</h4>
                        </div>
                        <span className="text-3xl font-black text-green-600">Rp {netProfit.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}