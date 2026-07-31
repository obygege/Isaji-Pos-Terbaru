import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function PaymentMethodManager({ branchId, organizationId }) {
    const [activeTab, setActiveTab] = useState('methods'); // 'methods' atau 'gateway_config'

    // State Metode Pembayaran
    const [methods, setMethods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        name: '',
        type: 'cash',
        provider_details: '',
        qr_image_url: '',
        is_active: true
    });

    // State Konfigurasi Payment Gateway (API Keys)
    const [gatewayForm, setGatewayForm] = useState({
        provider_name: 'midtrans',
        is_active: false,
        environment: 'sandbox',
        merchant_id: '',
        client_key: '',
        server_key: ''
    });
    const [isSavingGateway, setIsSavingGateway] = useState(false);

    const fetchData = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            // 1. Ambil metode pembayaran cabang
            const { data: methodData, error: methodError } = await supabase
                .from('payment_methods')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });

            if (methodError) throw methodError;
            setMethods(methodData || []);

            // 2. Ambil konfigurasi API Gateway cabang/organisasi
            const { data: gwData } = await supabase
                .from('payment_gateways_config')
                .select('*')
                .eq('branch_id', branchId)
                .limit(1);

            if (gwData && gwData.length > 0) {
                setGatewayForm(gwData[0]);
            }
        } catch (err) {
            console.error("Gagal memuat data pembayaran:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSaveMethod = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            organization_id: organizationId,
            branch_id: branchId,
            name: form.name,
            type: form.type,
            provider_details: form.provider_details,
            qr_image_url: form.qr_image_url,
            is_active: form.is_active
        };

        try {
            if (editingId) {
                const { error } = await supabase.from('payment_methods').update(payload).eq('id', editingId).eq('branch_id', branchId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('payment_methods').insert([payload]);
                if (error) throw error;
            }

            await fetchData();
            setIsModalOpen(false);
            alert("Metode pembayaran berhasil disimpan!");
        } catch (err) {
            alert("Gagal menyimpan: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveGatewayConfig = async (e) => {
        e.preventDefault();
        setIsSavingGateway(true);

        try {
            // Cek apakah sudah ada config sebelumnya
            const { data: existing } = await supabase
                .from('payment_gateways_config')
                .select('id')
                .eq('branch_id', branchId)
                .limit(1);

            const payload = {
                organization_id: organizationId,
                branch_id: branchId,
                provider_name: gatewayForm.provider_name,
                is_active: gatewayForm.is_active,
                environment: gatewayForm.environment,
                merchant_id: gatewayForm.merchant_id,
                client_key: gatewayForm.client_key,
                server_key: gatewayForm.server_key,
                updated_at: new Date().toISOString()
            };

            if (existing && existing.length > 0) {
                const { error } = await supabase.from('payment_gateways_config').update(payload).eq('id', existing[0].id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('payment_gateways_config').insert([payload]);
                if (error) throw error;
            }

            alert("Kunci API Payment Gateway berhasil disimpan dengan aman!");
        } catch (err) {
            alert("Gagal menyimpan kunci API: " + err.message);
        } finally {
            setIsSavingGateway(false);
        }
    };

    const handleDeleteMethod = async (id, name) => {
        if (window.confirm(`Hapus metode "${name}"?`)) {
            await supabase.from('payment_methods').delete().eq('id', id);
            setMethods(methods.filter(m => m.id !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Manajemen Pembayaran & Integrasi Gateway</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Atur metode kasir, upload QRIS statis, atau hubungkan kunci API Payment Gateway langsung dari web.</p>
                </div>
                {/* Tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('methods')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'methods' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Metode Kasir & QRIS
                    </button>
                    <button
                        onClick={() => setActiveTab('gateway_config')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'gateway_config' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Pengaturan API Gateway
                    </button>
                </div>
            </div>

            {activeTab === 'methods' ? (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                setEditingId(null);
                                setForm({ name: '', type: 'cash', provider_details: '', qr_image_url: '', is_active: true });
                                setIsModalOpen(true);
                            }}
                            className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                        >
                            + Tambah Metode Pembayaran
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-16 text-gray-400 font-medium">Memuat metode pembayaran...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {methods.length === 0 ? (
                                <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                                    Belum ada metode pembayaran. Klik tombol di atas untuk menambah.
                                </div>
                            ) : (
                                methods.map((item) => (
                                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                                        <div className="p-6 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-orange-50 text-isaji-orange border border-orange-200">
                                                    {item.type.replace('_', ' ')}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${item.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className="font-extrabold text-gray-900 text-lg">{item.name}</h4>
                                                <p className="text-xs text-gray-500 mt-1">{item.provider_details || '-'}</p>
                                            </div>
                                            {item.qr_image_url && (
                                                <div className="h-28 w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center">
                                                    <img src={item.qr_image_url} alt="QR" className="h-full object-contain p-2" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
                                            <button onClick={() => {
                                                setEditingId(item.id);
                                                setForm({ name: item.name, type: item.type, provider_details: item.provider_details, qr_image_url: item.qr_image_url, is_active: item.is_active });
                                                setIsModalOpen(true);
                                            }} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100">Edit</button>
                                            <button onClick={() => handleDeleteMethod(item.id, item.name)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100">Hapus</button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* TAB KUNCI API PAYMENT GATEWAY (DIBUAT RAMAH KLIEN VIA WEB) */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl space-y-6">
                    <div>
                        <h4 className="text-lg font-black text-gray-900">Konfigurasi Payment Gateway Otomatis</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Masukkan kredensial API dari provider pilihan Anda (Midtrans/Xendit) agar sistem otomatis menghasilkan QRIS Dinamis saat pelanggan melakukan <i>self-order</i>. Klien cukup isi form di bawah tanpa perlu menyentuh database.
                        </p>
                    </div>

                    <form onSubmit={handleSaveGatewayConfig} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Provider Gateway</label>
                            <select
                                value={gatewayForm.provider_name}
                                onChange={(e) => setGatewayForm({ ...gatewayForm, provider_name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                            >
                                <option value="midtrans">Midtrans (QRIS & VA Dinamis)</option>
                                <option value="xendit">Xendit (Payment Gateway)</option>
                                <option value="doku">DOKU Payment</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mode Lingkungan</label>
                                <select
                                    value={gatewayForm.environment}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, environment: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                                >
                                    <option value="sandbox">Sandbox (Uji Coba)</option>
                                    <option value="production">Production (Live / Asli)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Merchant ID</label>
                                <input
                                    type="text"
                                    value={gatewayForm.merchant_id || ''}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, merchant_id: e.target.value })}
                                    placeholder="Cth: G123456789"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Key</label>
                            <input
                                type="text"
                                value={gatewayForm.client_key || ''}
                                onChange={(e) => setGatewayForm({ ...gatewayForm, client_key: e.target.value })}
                                placeholder="SB-Mid-client-xxxx..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Server Key / Secret Key</label>
                            <input
                                type="password"
                                value={gatewayForm.server_key || ''}
                                onChange={(e) => setGatewayForm({ ...gatewayForm, server_key: e.target.value })}
                                placeholder="SB-Mid-server-xxxx..."
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input
                                    type="checkbox"
                                    checked={gatewayForm.is_active}
                                    onChange={(e) => setGatewayForm({ ...gatewayForm, is_active: e.target.checked })}
                                    className="w-4 h-4 accent-isaji-navy rounded"
                                />
                                <span className="text-xs font-bold text-gray-700">Aktifkan Payment Gateway ini untuk seluruh transaksi cabang</span>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSavingGateway}
                                className="bg-isaji-navy hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm"
                            >
                                {isSavingGateway ? 'Menyimpan Kunci API...' : 'Simpan Kunci API Gateway'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal Tambah/Edit Metode Kasir */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900">{editingId ? 'Edit Metode' : 'Tambah Metode Pembayaran'}</h3>
                        <form onSubmit={handleSaveMethod} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Tampilan</label>
                                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cth: QRIS Toko Utama" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Jenis Tipe</label>
                                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white">
                                    <option value="cash">Cash / Tunai</option>
                                    <option value="static_qris">QRIS Statis (Upload Gambar)</option>
                                    <option value="bank_transfer">Transfer Bank</option>
                                    <option value="ewallet">E-Wallet (OVO/GoPay/Dana)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Keterangan / Rekening</label>
                                <textarea rows="2" value={form.provider_details} onChange={(e) => setForm({ ...form, provider_details: e.target.value })} placeholder="No Rek / Catatan kasir..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm"></textarea>
                            </div>
                            {form.type === 'static_qris' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Gambar QR Code</label>
                                    <input type="url" value={form.qr_image_url} onChange={(e) => setForm({ ...form, qr_image_url: e.target.value })} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
                                </div>
                            )}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer pt-2">
                                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-isaji-navy rounded" />
                                    <span className="text-xs font-bold text-gray-700">Aktifkan metode ini</span>
                                </label>
                            </div>
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy text-white py-2.5 rounded-xl font-bold text-sm">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Cek apakah file ini diekspor dengan benar
export default PaymentMethodManager;