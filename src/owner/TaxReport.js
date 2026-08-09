import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function formatRupiah(value) {
    return Number(value || 0).toLocaleString('id-ID');
}

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function TaxReport({ orgData }) {
    const [taxSettings, setTaxSettings] = useState(null);
    const [branches, setBranches] = useState([]);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth()); // 0-11

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const [taxRes, branchRes] = await Promise.all([
                supabase.from('tax_settings').select('*').eq('organization_id', orgData.id).maybeSingle(),
                supabase.from('branches').select('id, name, tax_mode').eq('organization_id', orgData.id),
            ]);
            setTaxSettings(taxRes.data);
            setBranches(branchRes.data || []);

            const start = new Date(year, month, 1).toISOString();
            const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            const { data: orderData, error } = await supabase
                .from('orders')
                .select('id, branch_id, subtotal, discount_amount, tax_amount, total_amount, status, created_at, order_number')
                .eq('organization_id', orgData.id)
                .neq('status', 'cancelled')
                .gte('created_at', start)
                .lte('created_at', end);

            if (error) throw error;
            setOrders(orderData || []);
        } catch (err) {
            console.error('Gagal memuat laporan pajak:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData, year, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const branchName = (id) => branches.find((b) => b.id === id)?.name || '-';

    // DPP (Dasar Pengenaan Pajak) = subtotal dikurangi diskon, sebelum pajak.
    const dpp = orders.reduce((sum, o) => sum + Number(o.subtotal || 0) - Number(o.discount_amount || 0), 0);
    const totalTax = orders.reduce((sum, o) => sum + Number(o.tax_amount || 0), 0);
    const grandTotal = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const perBranch = branches.map((b) => {
        const branchOrders = orders.filter((o) => o.branch_id === b.id);
        return {
            id: b.id,
            name: b.name,
            dpp: branchOrders.reduce((s, o) => s + Number(o.subtotal || 0) - Number(o.discount_amount || 0), 0),
            tax: branchOrders.reduce((s, o) => s + Number(o.tax_amount || 0), 0),
            orderCount: branchOrders.length,
        };
    });

    const handleExportCSV = () => {
        const periodLabel = `${MONTHS[month]}-${year}`;
        const rows = [
            ['Masa Pajak', 'NPWP', 'Nama Wajib Pajak / Usaha', 'Cabang', 'Jumlah Transaksi', 'DPP (Dasar Pengenaan Pajak)', 'PPN / Pajak Terutang', 'Total (DPP + Pajak)'],
            ...perBranch.map((b) => [
                periodLabel,
                taxSettings?.npwp || '-',
                orgData?.name || '-',
                b.name,
                b.orderCount,
                Math.round(b.dpp),
                Math.round(b.tax),
                Math.round(b.dpp + b.tax),
            ]),
            [],
            ['TOTAL', '', '', '', orders.length, Math.round(dpp), Math.round(totalTax), Math.round(grandTotal)],
        ];

        const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Laporan_Pajak_${orgData?.name?.replace(/\s+/g, '_') || 'Isaji'}_${periodLabel}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Laporan Pajak</h2>
                    <p className="text-sm text-gray-500">Rekap DPP & PPN per periode, siap export/print.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                        {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-200 text-sm">
                        {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={handleExportCSV} className="bg-isaji-navy hover:bg-blue-900 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm">
                        Export CSV
                    </button>
                    <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-50">
                        Print
                    </button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 print:hidden">
                ⚠️ <strong>Penting:</strong> Rekap ini dihitung otomatis dari data transaksi kamu dan formatnya mengikuti struktur SPT Masa PPN yang umum dipakai. Karena format upload resmi DJK (Coretax/e-Faktur) bisa berubah dari waktu ke waktu, <strong>tetap cek/verifikasi ke akuntan atau konsultan pajak kamu</strong> sebelum melaporkan resmi, supaya sesuai ketentuan terbaru.
            </div>

            {!taxSettings?.npwp && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 print:hidden">
                    NPWP organisasi belum diisi. Lengkapi dulu di halaman Pengaturan Toko supaya muncul di laporan ini.
                </div>
            )}

            {/* Kop Laporan -- muncul juga saat print */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                    <div>
                        <h3 className="font-black text-lg text-gray-900">{orgData?.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">NPWP: {taxSettings?.npwp || '-'}</p>
                        <p className="text-xs text-gray-500">Status PKP: {taxSettings?.is_pkp ? 'Ya' : 'Tidak'} • Skema: {taxSettings?.scheme || 'none'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase font-bold">Masa Pajak</p>
                        <p className="font-black text-gray-900">{MONTHS[month]} {year}</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-400 text-sm">Memuat data...</div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">DPP (Dasar Pengenaan Pajak)</p>
                                <p className="text-lg font-black text-gray-900 mt-1">Rp {formatRupiah(dpp)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pajak Terutang</p>
                                <p className="text-lg font-black text-isaji-navy mt-1">Rp {formatRupiah(totalTax)}</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total (DPP + Pajak)</p>
                                <p className="text-lg font-black text-gray-900 mt-1">Rp {formatRupiah(grandTotal)}</p>
                            </div>
                        </div>

                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-3 py-2">Cabang</th>
                                    <th className="px-3 py-2">Jml Transaksi</th>
                                    <th className="px-3 py-2 text-right">DPP</th>
                                    <th className="px-3 py-2 text-right">Pajak</th>
                                    <th className="px-3 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {perBranch.map((b) => (
                                    <tr key={b.id} className="border-b border-gray-100">
                                        <td className="px-3 py-2 font-bold text-gray-900">{b.name}</td>
                                        <td className="px-3 py-2 text-gray-600">{b.orderCount}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">Rp {formatRupiah(b.dpp)}</td>
                                        <td className="px-3 py-2 text-right text-gray-700">Rp {formatRupiah(b.tax)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-gray-900">Rp {formatRupiah(b.dpp + b.tax)}</td>
                                    </tr>
                                ))}
                                <tr className="font-black text-gray-900">
                                    <td className="px-3 py-3">TOTAL</td>
                                    <td className="px-3 py-3">{orders.length}</td>
                                    <td className="px-3 py-3 text-right">Rp {formatRupiah(dpp)}</td>
                                    <td className="px-3 py-3 text-right">Rp {formatRupiah(totalTax)}</td>
                                    <td className="px-3 py-3 text-right">Rp {formatRupiah(grandTotal)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                )}
            </div>
        </div>
    );
}

export default TaxReport;
