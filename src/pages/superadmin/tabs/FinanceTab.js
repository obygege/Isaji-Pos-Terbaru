import React, { useState, useEffect } from 'react';
import supabase from '../../../backend/lib/supabaseClient';

export default function FinanceTab() {
    const [grossRevenue, setGrossRevenue] = useState(0);

    useEffect(() => {
        const fetchFinances = async () => {
            const { data } = await supabase.from('organizations').select('subscription_status');
            if (data) {
                const paidCount = data.filter(o => o.subscription_status === 'paid').length;
                setGrossRevenue(paidCount * 150000);
            }
        };
        fetchFinances();
    }, []);

    const taxAmount = grossRevenue * 0.11;
    const serverCapital = 350000;
    const netProfit = grossRevenue - taxAmount - serverCapital;

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-black text-gray-900">SaaS Financial Report (Real Database Based)</h2>
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