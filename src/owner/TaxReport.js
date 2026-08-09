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

const TAX_MODE_LABELS = {
    bebas: 'Bebas Pajak',
    pph_05: 'PPh Final 0,5%',
    pb1_10: 'PB1 10%',
    ppn_11: 'PPN 11%',
};

const TAX_SCHEME_LABELS = {
    none: 'Tidak Ada',
    pph_final: 'PPh Final',
    pb1: 'PB1 (Pajak Restoran/Daerah)',
    ppn: 'PPN',
};

function TaxReport({ orgData }) {
    const [branches, setBranches] = useState([]);
    const [taxSettings, setTaxSettings] = useState(null);
    const [summaries, setSummaries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState(monthStartStr());
    const [dateTo, setDateTo] = useState(todayStr());

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const [branchRes, settingsRes] = await Promise.all([
                supabase.from('branches').select('id, name, tax_mode, city').eq('organization_id', orgData.id),
                supabase.from('tax_settings').select('*').eq('organization_id', orgData.id).maybeSingle(),
            ]);

            const allBranches = branchRes.data || [];
            setBranches(allBranches);
            setTaxSettings(settingsRes.data || null);

            const branchIds = allBranches.map(b => b.id);
            if (branchIds.length > 0) {
                const { data: summaryData } = await supabase
                    .from('daily_financial_summaries')
                    .select('branch_id, summary_date, gross_sales, tax_amount, net_sales')
                    .in('branch_id', branchIds)
                    .gte('summary_date', dateFrom)
                    .lte('summary_date', dateTo);
                setSummaries(summaryData || []);
            } else {
                setSummaries([]);
            }
        } catch (err) {
            console.error('Gagal memuat laporan pajak:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const branchTaxMap = {};
    branches.forEach(b => { branchTaxMap[b.id] = { name: b.name, taxMode: b.tax_mode, totalTax: 0, totalSales: 0 }; });
    summaries.forEach(s => {
        if (branchTaxMap[s.branch_id]) {
            branchTaxMap[s.branch_id].totalTax += Number(s.tax_amount || 0);
            branchTaxMap[s.branch_id].totalSales += Number(s.gross_sales || 0);
        }
    });
    const branchRows = Object.values(branchTaxMap);
    const totalTaxCollected = branchRows.reduce((s, b) => s + b.totalTax, 0);
    const totalSales = branchRows.reduce((s, b) => s + b.totalSales, 0);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-black text-gray-900 mb-4">Skema Pajak Organisasi</h3>
                {isLoading ? (
                    <p className="text-sm text-gray-400">Memuat pengaturan pajak...</p>
                ) : taxSettings ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Skema</p>
                            <p className="font-bold text-gray-900 mt-1">{TAX_SCHEME_LABELS[taxSettings.scheme] || taxSettings.scheme}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Tarif Kustom</p>
                            <p className="font-bold text-gray-900 mt-1">{taxSettings.custom_rate_percent}%</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">NPWP</p>
                            <p className="font-bold text-gray-900 mt-1">{taxSettings.npwp || '-'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Status PKP</p>
                            <p className="font-bold text-gray-900 mt-1">{taxSettings.is_pkp ? 'Pengusaha Kena Pajak' : 'Bukan PKP'}</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Pengaturan pajak organisasi belum dikonfigurasi. Atur di menu Pengaturan Toko.</p>
                )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
                <span className="self-center text-gray-400 text-sm">s/d</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Penjualan (periode)</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatRupiah(totalSales)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-isaji-orange/30 bg-orange-50/40 shadow-sm">
                    <p className="text-xs font-bold text-isaji-orange uppercase tracking-wider">Total Pajak Terkumpul</p>
                    <p className="text-2xl font-black text-gray-900 mt-2">{formatRupiah(totalTaxCollected)}</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Pajak per Cabang</h3>
                </div>
                {isLoading ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Memuat data...</div>
                ) : branchRows.length === 0 ? (
                    <div className="px-6 py-16 text-center text-gray-400 text-sm">Belum ada data cabang.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-3">Cabang</th>
                                    <th className="px-6 py-3">Skema Pajak Cabang</th>
                                    <th className="px-6 py-3 text-right">Total Penjualan</th>
                                    <th className="px-6 py-3 text-right">Pajak Terkumpul</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchRows.map((b, idx) => (
                                    <tr key={idx} className="border-b border-gray-50">
                                        <td className="px-6 py-3 font-bold text-gray-900">{b.name}</td>
                                        <td className="px-6 py-3 text-gray-600">{TAX_MODE_LABELS[b.taxMode] || b.taxMode || '-'}</td>
                                        <td className="px-6 py-3 text-right text-gray-700">{formatRupiah(b.totalSales)}</td>
                                        <td className="px-6 py-3 text-right font-bold text-gray-900">{formatRupiah(b.totalTax)}</td>
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

export default TaxReport;