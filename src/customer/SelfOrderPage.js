import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';
import { detectUserRole } from '../backend/lib/roleDetection';
import SelfOrderHeader from '../components/SelfOrderHeader';
import SelfOrderFooter from '../components/SelfOrderFooter';

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function SelfOrderPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const branchId = urlParams.get('branch');
    const qrToken = urlParams.get('token');

    const [branch, setBranch] = useState(null);
    const [tableInfo, setTableInfo] = useState(null);
    const [menus, setMenus] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [gatewayConfig, setGatewayConfig] = useState(null); // payment_gateways_config aktif milik cabang (mis. Midtrans)

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // STATE LOKASI USER
    const [userLocation, setUserLocation] = useState(null);

    const [cart, setCart] = useState({});
    const [activeTab, setActiveTab] = useState('menu');

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    // selectedPayment: 'pm-<id_payment_methods>' untuk metode manual, atau 'gw-midtrans' untuk gateway otomatis
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [isGatewayProcessing, setIsGatewayProcessing] = useState(false);
    const [gatewayError, setGatewayError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // MEMBER YANG SEDANG LOGIN (real Supabase Auth, bukan localStorage)
    const [customerProfile, setCustomerProfile] = useState(null);

    const [showTnCPopup, setShowTnCPopup] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // STATE UNTUK ANIMASI TOMBOL TAMBAH
    const [addedItemId, setAddedItemId] = useState(null);

    // ===== STATE VERIFIKASI PEMBAYARAN (QRIS / Transfer Bank manual) =====
    // activeOrder: order yang masih berjalan di sesi ini (baik baru dibuat
    // maupun ditemukan lagi lewat localStorage saat halaman di-refresh)
    const [activeOrder, setActiveOrder] = useState(null);
    const [activeVerification, setActiveVerification] = useState(null); // baris payment_verifications terbaru utk order ini
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [isUploadingProof, setIsUploadingProof] = useState(false);
    const [proofError, setProofError] = useState(null);

    // ===== RIWAYAT PESANAN & PESANAN SEDANG BERLANGSUNG =====
    // Dilacak pakai nomor HP (tersimpan di device ini), jalan baik buat guest maupun member yang login.
    const [myOrders, setMyOrders] = useState([]);
    const [isLoadingMyOrders, setIsLoadingMyOrders] = useState(false);
    const [myOrdersFilter, setMyOrdersFilter] = useState('ongoing'); // ongoing | history
    const ONGOING_STATUSES = ['awaiting_payment', 'pending', 'preparing', 'ready'];

    const trackedPhone = customerProfile?.phone || (typeof window !== 'undefined' ? localStorage.getItem('isaji_customer_phone') : null);

    const fetchMyOrders = useCallback(async () => {
        if (!trackedPhone || !branchId) return;
        setIsLoadingMyOrders(true);
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, status, payment_status, total_amount, created_at, order_items(id, qty, unit_price, products(name))')
            .eq('branch_id', branchId) // wajib: gak boleh kebawa pesanan cabang lain
            .eq('customer_phone', trackedPhone)
            .order('created_at', { ascending: false })
            .limit(50);
        if (!error) setMyOrders(data || []);
        setIsLoadingMyOrders(false);
    }, [trackedPhone, branchId]);

    const ongoingOrders = myOrders.filter((o) => ONGOING_STATUSES.includes(o.status));
    const historyOrders = myOrders.filter((o) => !ONGOING_STATUSES.includes(o.status));

    // 1. MEMINTA IZIN LOKASI SAAT HALAMAN DIBUKA
    useEffect(() => {
        if (window.isSecureContext === false && window.location.hostname !== 'localhost') {
            console.warn("⚠️ PERINGATAN: Geolocation diblokir karena HTTP lokal. Gunakan ngrok (HTTPS).");
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn("GPS Ditolak / Gagal:", error.message);
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // 2. MENGAMBIL DATA SUPABASE (SaaS Isolation terjamin lewat branch_id & organization_id)
    const loadSessionData = useCallback(async () => {
        if (!branchId || !qrToken) {
            setErrorMsg("QR Code tidak valid.");
            setIsLoading(false);
            return;
        }

        try {
            const { data: branchData, error: bErr } = await supabase.from('branches').select('*').eq('id', branchId).single();
            if (bErr) throw new Error("Akses Cabang Ditolak.");
            setBranch(branchData);

            const { data: tableData, error: tErr } = await supabase.from('tables').select('*').eq('branch_id', branchId).or(`qr_code_token.eq.${qrToken},qr_token.eq.${qrToken}`).single();
            if (tErr || !tableData) throw new Error("Meja tidak terdaftar.");
            setTableInfo(tableData);

            const { data: menuData } = await supabase.from('menus').select('*').eq('branch_id', branchId);
            let finalMenus = menuData || [];
            if (finalMenus.length === 0 && branchData.organization_id) {
                const { data: orgMenus } = await supabase.from('menus').select('*').eq('organization_id', branchData.organization_id);
                if (orgMenus) finalMenus = orgMenus;
            }
            setMenus(finalMenus);

            const { data: payData } = await supabase.from('payment_methods').select('*').eq('branch_id', branchId).eq('is_active', true);
            setPaymentMethods(payData || []);

            // Payment Gateway otomatis (mis. Midtrans) - hanya dipakai kalau manager sudah mengaktifkannya
            // client_key aman ditampilkan ke browser, server_key TIDAK pernah diambil di sini.
            const { data: gwData } = await supabase
                .from('payment_gateways_config')
                .select('id, provider_name, is_active, environment, client_key')
                .eq('branch_id', branchId)
                .eq('is_active', true)
                .maybeSingle();
            setGatewayConfig(gwData || null);

        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, qrToken]);

    useEffect(() => { loadSessionData(); }, [loadSessionData]);

    // 2b. CEK APAKAH PELANGGAN SUDAH LOGIN SEBAGAI MEMBER (real session, bukan localStorage)
    useEffect(() => {
        const loadCustomerProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { role } = await detectUserRole(session.user.id);
            if (role !== 'customer') return; // jaga-jaga: bukan akun member, abaikan

            const { data: profile } = await supabase
                .from('customers')
                .select('full_name, phone, subscribe_promo')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (profile) {
                setCustomerProfile({ email: session.user.email, ...profile });
                setCustomerName(profile.full_name || '');
                setCustomerPhone(profile.phone || '');
            }
        };
        loadCustomerProfile();
    }, []);

    const handleLogoutMember = async () => {
        await supabase.auth.signOut();
        setCustomerProfile(null);
        setCustomerName('');
        setCustomerPhone('');
    };

    // 3. LOGIKA KERANJANG & ANIMASI
    const addToCart = (menu) => {
        setCart(prev => {
            const current = prev[menu.id] ? prev[menu.id].qty : 0;
            return { ...prev, [menu.id]: { ...menu, qty: current + 1 } };
        });

        setAddedItemId(menu.id);
        setTimeout(() => {
            setAddedItemId(null);
        }, 600);
    }

    const updateQty = (menuId, delta) => {
        setCart(prev => {
            const updated = { ...prev };
            if (updated[menuId]) {
                updated[menuId].qty += delta;
                if (updated[menuId].qty <= 0) delete updated[menuId];
            }
            return updated;
        });
    }

    const cartItems = Object.values(cart);
    const menuCategories = ['Semua', ...Array.from(new Set(menus.map(m => m.category).filter(Boolean)))];
    const categoryIcons = ['🍽️', '🍜', '🍛', '🥤', '🍢', '🍰', '☕', '🥗'];
    const filteredMenus = menus
        .filter(m => selectedCategory === 'Semua' || m.category === selectedCategory)
        .filter(m => m.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    // Gabungan semua opsi pembayaran yang tersedia untuk cabang ini: metode manual (cash/qris/transfer/ewallet)
    // dan gateway otomatis (Midtrans) kalau manager sudah mengaktifkannya di Payment Method Manager.
    const paymentOptions = [
        ...paymentMethods.map(pm => ({ key: `pm-${pm.id}`, kind: 'manual', pm })),
        ...(gatewayConfig ? [{ key: `gw-${gatewayConfig.provider_name}`, kind: 'gateway', gw: gatewayConfig }] : [])
    ];
    const selectedOption = paymentOptions.find(o => o.key === selectedPayment);
    const selectedPaymentMethod = selectedOption?.kind === 'manual' ? selectedOption.pm : null;
    const isSelectedCash = selectedOption?.kind === 'manual' && selectedOption.pm.type === 'cash';
    const isSelectedGateway = selectedOption?.kind === 'gateway';
    // Metode yang WAJIB verifikasi kasir dengan upload bukti manual: QRIS statis & Transfer Bank.
    // 'ewallet' diperlakukan sama (butuh bukti) selama belum dihubungkan ke payment gateway asli.
    const isSelectedManualProof = selectedOption?.kind === 'manual' && ['static_qris', 'bank_transfer', 'ewallet'].includes(selectedOption.pm.type);
    const requiresCashBeforeOrder = isSelectedCash && branch?.cash_payment_timing === 'before_order';
    const totalItemsCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const subtotalAmount = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * item.qty), 0);
    const taxAmount = subtotalAmount * 0.10;
    const grandTotal = subtotalAmount + taxAmount;

    // 4. CEK LOKASI, LALU LANJUT KE FORM DATA PEMESAN (bukan langsung ke pilihan pembayaran)
    const checkLocationAndProceed = () => {
        if (cartItems.length === 0) return alert("Keranjang kosong!");

        if (!userLocation) {
            alert("Membutuhkan akses lokasi GPS. Mohon izinkan akses lokasi di browser Anda lalu coba lagi.");
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Coba ambil GPS lagi gagal.")
            );
            return;
        }

        if (branch?.latitude && branch?.longitude) {
            const maxRadius = branch.max_radius_meters || 50;
            const distance = getDistanceFromLatLonInMeters(userLocation.lat, userLocation.lng, branch.latitude, branch.longitude);

            if (distance > maxRadius) {
                alert(`Anda terdeteksi ${Math.round(distance)} meter dari cabang. Anda harus berada di area restoran untuk memesan.`);
                return;
            }
        }

        setActiveTab('order_form');
    };

    // 4b. LANJUT DARI FORM DATA PEMESAN -> HALAMAN PILIH METODE PEMBAYARAN
    const handleContinueToPayment = () => {
        if (customerName.trim().length < 3) return alert("Nama pemesan terlalu pendek.");
        if (customerPhone.length < 11) return alert("Nomor WhatsApp minimal 11 digit.");
        setActiveTab('payment');
    };

    const handleConfirmOrderSubmit = () => {
        if (!selectedPayment) return alert("Pilih metode pembayaran terlebih dahulu.");
        setShowTnCPopup(true);
    };

    const executeFinalOrder = async () => {
        setShowTnCPopup(false);
        setIsSubmitting(true);
        setGatewayError(null);

        try {
            const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const needsProof = isSelectedManualProof;
            const isCash = isSelectedCash;
            const isGateway = isSelectedGateway;

            // Aturan status awal:
            // - QRIS/Transfer/E-wallet manual -> menunggu kasir verifikasi bukti bayar, belum masuk dapur.
            // - Cash -> pelanggan bayar dulu di kasir, order BARU diproses ke dapur setelah kasir
            //   menandai pembayaran diterima (jadi statusnya sama-sama "menunggu verifikasi").
            // - Gateway (Midtrans dkk) -> menunggu pembayaran online selesai (webhook yang mengubah status).
            const initialStatus = (needsProof || isCash || isGateway) ? 'awaiting_payment' : 'pending';
            const initialPaymentStatus = (needsProof || isCash || isGateway) ? 'pending_verification' : 'paid';

            // [PERBAIKAN SaaS] Insert dengan relasi Org ID, Branch ID, Table ID, dan Channel 'self_order'
            const { data: newOrder, error: oErr } = await supabase.from('orders').insert([{
                organization_id: branch.organization_id, // Identitas Toko (Tenant)
                branch_id: branchId,                     // Identitas Cabang
                table_id: tableInfo.id,                  // Identitas Meja
                order_number: orderNumber,
                channel: 'self_order',                   // Penanda sumber transaksi (Kasir/Laporan akan tahu ini dari scan QR)
                status: initialStatus,
                payment_status: initialPaymentStatus,
                customer_name: customerName,
                customer_phone: customerPhone,
                subtotal: subtotalAmount,
                tax_amount: taxAmount,
                total_amount: grandTotal
            }]).select().single();

            if (oErr) throw new Error("Orders Error: " + oErr.message);

            const orderItemsPayload = cartItems.map(item => ({
                order_id: newOrder.id,
                product_id: item.id,
                qty: item.qty,
                unit_price: Number(item.price || 0),
                subtotal: Number(item.price || 0) * item.qty
            }));

            const { error: iErr } = await supabase.from('order_items').insert(orderItemsPayload);
            if (iErr) throw new Error("Order Items Error: " + iErr.message);

            const resultPayload = {
                orderId: newOrder.id,
                orderNumber: orderNumber,
                status: newOrder.status,
                payment_status: newOrder.payment_status,
                isCash: isCash,
                isGateway: isGateway,
                methodId: selectedPaymentMethod?.id || null,
                methodType: selectedPaymentMethod?.type || null,
                gatewayProvider: isGateway ? selectedOption.gw.provider_name : null,
                amount: grandTotal
            };
            setOrderResult(resultPayload);
            setCart({});
            setActiveOrder(newOrder);
            localStorage.setItem(`isaji_active_order_${tableInfo.id}`, JSON.stringify(resultPayload));
            // simpan nomor HP di device ini biar bisa lacak "Pesanan Saya" / riwayat tanpa harus login
            localStorage.setItem('isaji_customer_phone', customerPhone);

            if (needsProof) {
                setActiveTab('payment_proof');
            } else if (isCash) {
                // Cash: TIDAK butuh upload bukti, cukup bayar di kasir. Kasir yang menandai lunas.
                setActiveTab('cash_wait');
            } else if (isGateway) {
                setActiveTab('gateway_wait');
                await startGatewayPayment(newOrder, orderNumber);
            } else {
                setActiveTab('success');
            }
        } catch (err) {
            alert("Gagal memproses pesanan: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ===== PEMBAYARAN OTOMATIS VIA PAYMENT GATEWAY (mis. MIDTRANS SNAP) =====
    // server_key TIDAK PERNAH dipakai di browser. Pembuatan transaksi & snap_token
    // dilakukan lewat Supabase Edge Function `create-midtrans-payment` (lihat folder
    // supabase/functions/) yang menyimpan hasilnya ke tabel `midtrans_transactions`.
    // Pelunasan final tetap divalidasi oleh Edge Function `midtrans-webhook`, BUKAN oleh browser.
    const loadMidtransSnapScript = (clientKey, environment) => {
        return new Promise((resolve, reject) => {
            if (window.snap) return resolve();
            const existing = document.getElementById('midtrans-snap-script');
            if (existing) { existing.addEventListener('load', () => resolve()); return; }
            const script = document.createElement('script');
            script.id = 'midtrans-snap-script';
            script.src = environment === 'production'
                ? 'https://app.midtrans.com/snap/snap.js'
                : 'https://app.sandbox.midtrans.com/snap/snap.js';
            script.setAttribute('data-client-key', clientKey);
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Gagal memuat skrip pembayaran Midtrans.'));
            document.body.appendChild(script);
        });
    };

    const startGatewayPayment = async (order, orderNumber) => {
        setIsGatewayProcessing(true);
        setGatewayError(null);
        try {
            const { data, error } = await supabase.functions.invoke('create-midtrans-payment', {
                body: {
                    branch_id: branchId,
                    order_id: order.id,
                    order_number: orderNumber,
                    gross_amount: Math.round(grandTotal),
                    customer_name: customerName,
                    customer_phone: customerPhone
                }
            });
            if (error) throw error;
            if (!data?.snap_token) throw new Error('Token pembayaran tidak diterima dari server.');

            await loadMidtransSnapScript(gatewayConfig.client_key, gatewayConfig.environment);

            window.snap.pay(data.snap_token, {
                onSuccess: () => { /* status final tetap menunggu konfirmasi webhook, polling di bawah yang akan update UI */ },
                onPending: () => { /* tetap menunggu, polling akan menangkap perubahan */ },
                onError: () => setGatewayError('Pembayaran gagal diproses. Silakan coba lagi.'),
                onClose: () => setGatewayError('Anda menutup jendela pembayaran sebelum selesai. Klik "Coba Bayar Lagi" untuk mengulang.')
            });
        } catch (err) {
            setGatewayError('Gagal membuka halaman pembayaran: ' + err.message + '. Pastikan Edge Function "create-midtrans-payment" sudah di-deploy dan gateway sudah dikonfigurasi manager.');
        } finally {
            setIsGatewayProcessing(false);
        }
    };

    // ===== UPLOAD BUKTI BAYAR (QRIS / Transfer Bank manual) =====
    const handleProofFileChange = (e) => {
        const file = e.target.files?.[0];
        setProofError(null);
        if (!file) return;
        if (!file.type.startsWith('image/')) { setProofError("File harus berupa gambar (screenshot/foto bukti transfer)."); return; }
        if (file.size > 5 * 1024 * 1024) { setProofError("Ukuran gambar maksimal 5MB."); return; }
        setProofFile(file);
        setProofPreview(URL.createObjectURL(file));
    };

    const submitPaymentProof = async () => {
        if (!orderResult) return;
        if (!proofFile) { setProofError("Silakan pilih/foto bukti pembayaran terlebih dahulu."); return; }

        setIsUploadingProof(true);
        setProofError(null);
        try {
            const ext = proofFile.name.split('.').pop() || 'jpg';
            const filePath = `${branchId}/${orderResult.orderId}/${Date.now()}.${ext}`;

            const { error: upErr } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, proofFile, { cacheControl: '3600', upsert: false });
            if (upErr) throw upErr;

            const { data: pub } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);

            const { data: { session } } = await supabase.auth.getSession();

            const { data: verifRow, error: vErr } = await supabase.from('payment_verifications').insert([{
                order_id: orderResult.orderId,
                branch_id: branchId,
                payment_method_id: orderResult.methodId,
                method_type: orderResult.methodType,
                amount: orderResult.amount,
                proof_url: pub.publicUrl,
                status: 'pending',
                submitted_by: session?.user?.id || null
            }]).select().single();
            if (vErr) throw vErr;

            // Pastikan status order kembali "menunggu verifikasi" (relevan saat ini adalah upload ULANG setelah ditolak)
            await supabase.from('orders').update({
                payment_status: 'pending_verification',
                active_payment_verification_id: verifRow.id
            }).eq('id', orderResult.orderId);

            setActiveVerification(verifRow);
            setProofFile(null);
            setProofPreview(null);
            setActiveTab('payment_status');
        } catch (err) {
            setProofError("Gagal mengunggah bukti: " + err.message);
        } finally {
            setIsUploadingProof(false);
        }
    };

    // ===== POLLING STATUS VERIFIKASI (tiap 5 detik selagi ada order aktif menunggu) =====
    // Dipakai untuk 3 alur: upload bukti manual, cash (bayar di kasir), dan gateway otomatis (Midtrans).
    useEffect(() => {
        if (!orderResult?.orderId) return;
        if (!['payment_proof', 'payment_status', 'cash_wait', 'gateway_wait'].includes(activeTab)) return;

        let cancelled = false;

        const checkStatus = async () => {
            const { data: latestVerif } = await supabase
                .from('payment_verifications')
                .select('*')
                .eq('order_id', orderResult.orderId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const { data: latestOrder } = await supabase
                .from('orders')
                .select('status, payment_status')
                .eq('id', orderResult.orderId)
                .single();

            if (cancelled) return;

            if (latestVerif) setActiveVerification(latestVerif);

            if (latestOrder?.payment_status === 'paid') {
                localStorage.removeItem(`isaji_active_order_${tableInfo?.id}`);
                setOrderResult(prev => ({ ...prev, status: latestOrder.status, payment_status: latestOrder.payment_status }));
                setActiveTab('success');
            } else if (latestVerif?.status === 'rejected' && latestOrder?.payment_status === 'rejected') {
                setActiveTab('payment_status');
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [orderResult?.orderId, activeTab, tableInfo?.id]);

    // ===== RESUME ORDER YANG MASIH MENUNGGU VERIFIKASI SETELAH REFRESH =====
    useEffect(() => {
        if (!tableInfo?.id) return;
        const saved = localStorage.getItem(`isaji_active_order_${tableInfo.id}`);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (parsed?.orderId) {
                setOrderResult(parsed);
                // Kalau statusnya sudah lunas simpanan lama, langsung ke success; kalau belum, arahkan
                // ke layar tunggu yang sesuai jenis pembayarannya supaya polling status jalan lagi.
                if (parsed.payment_status === 'paid') {
                    setActiveTab('success');
                } else {
                    setActiveTab('payment_status');
                }
            }
        } catch (e) { /* localStorage rusak, abaikan */ }
    }, [tableInfo?.id]);

    // Ambil status pesanan tiap kali tab "Pesanan Saya" dibuka, dan sekali di awal buat badge notifikasi
    useEffect(() => { if (trackedPhone && branchId) fetchMyOrders(); }, [trackedPhone, branchId, fetchMyOrders]);
    useEffect(() => { if (activeTab === 'my_orders') fetchMyOrders(); }, [activeTab, fetchMyOrders]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-isaji-orange border-t-transparent rounded-full"></div></div>;
    if (errorMsg) return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center"><h2 className="text-lg font-black text-red-600 mb-1">Akses Ditolak</h2><p className="text-sm text-gray-700">{errorMsg}</p></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden font-sans">
            <SelfOrderHeader branch={branch} tableInfo={tableInfo} activeTab={activeTab} setActiveTab={setActiveTab} customerProfile={customerProfile} onLogoutMember={handleLogoutMember} />

            <div className="flex-1 pb-28 overflow-y-auto">
                {activeTab === 'menu' && (
                    <div className="animate-fade-in">
                        <div className="px-5 pt-4">
                            {trackedPhone && (
                                <button
                                    onClick={() => setActiveTab('my_orders')}
                                    className="w-full mb-4 flex items-center justify-between px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
                                >
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-isaji-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        <span className="text-xs font-black text-gray-800">Pesanan Saya</span>
                                    </div>
                                    {ongoingOrders.length > 0 ? (
                                        <span className="text-[10px] font-black bg-isaji-orange text-white px-2 py-1 rounded-full">{ongoingOrders.length} berlangsung</span>
                                    ) : (
                                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                    )}
                                </button>
                            )}
                            {!trackedPhone && (
                                <button
                                    onClick={() => {
                                        const phoneInput = window.prompt('Masukkan nomor HP yang dipakai saat pesan sebelumnya:');
                                        if (phoneInput && phoneInput.trim()) {
                                            localStorage.setItem('isaji_customer_phone', phoneInput.trim());
                                            setActiveTab('my_orders');
                                            window.location.reload(); // refresh biar trackedPhone kebaca ulang
                                        }
                                    }}
                                    className="w-full mb-4 text-center text-[11px] font-bold text-isaji-navy underline underline-offset-2"
                                >
                                    Sudah pernah pesan? Cek status pesananmu
                                </button>
                            )}
                            {/* Search bar */}
                            <div className="relative mb-4">
                                <svg className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari menu favoritmu..."
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm text-sm outline-none transition-all focus:border-isaji-orange focus:shadow-md"
                                />
                            </div>

                            {/* Promo banner */}
                            <div className="bg-gradient-to-br from-isaji-navy to-blue-900 rounded-3xl px-5 py-5 shadow-md text-white relative overflow-hidden mb-5">
                                <div className="absolute -right-6 -top-6 w-28 h-28 bg-isaji-orange/20 rounded-full"></div>
                                <div className="absolute -right-2 bottom-0 w-16 h-16 bg-white/5 rounded-full"></div>
                                <p className="text-[10px] font-black text-isaji-orange uppercase tracking-widest mb-1 relative">Meja {tableInfo?.name}</p>
                                <h2 className="text-lg font-black leading-tight mb-1 relative">Pesan Langsung<br />dari Meja Anda</h2>
                                <p className="text-[11px] text-blue-200 relative">Pesanan otomatis masuk ke dapur, tanpa antri.</p>
                            </div>

                            {/* Kategori (grid ikon, gaya "after") */}
                            {menuCategories.length > 1 && (
                                <div className="mb-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-black text-gray-900">Kategori</h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-3">
                                        {menuCategories.map((cat, idx) => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                style={{ animationDelay: `${idx * 40}ms` }}
                                                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-[10px] font-black capitalize transition-all active:scale-90 animate-pop-in ${selectedCategory === cat
                                                    ? 'bg-isaji-navy border-isaji-navy text-white shadow-md'
                                                    : 'bg-white border-gray-100 text-gray-600 shadow-sm'
                                                    }`}
                                            >
                                                <span className="text-lg">{categoryIcons[idx % categoryIcons.length]}</span>
                                                <span className="truncate max-w-[56px]">{cat}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-black text-gray-900">
                                    {selectedCategory === 'Semua' ? 'Menu Populer' : selectedCategory}
                                </h3>
                                <span className="text-[10px] font-bold text-gray-400">{filteredMenus.length} item</span>
                            </div>

                            {filteredMenus.length === 0 && (
                                <div className="text-center py-10 text-gray-400 text-xs font-bold animate-fade-in">
                                    Menu tidak ditemukan.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {filteredMenus.map((menu, idx) => {
                                    const inCart = cart[menu.id]?.qty || 0;
                                    const isJustAdded = addedItemId === menu.id;

                                    return (
                                        <div
                                            key={menu.id}
                                            style={{ animationDelay: `${Math.min(idx, 10) * 45}ms` }}
                                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between group animate-slide-up transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div>
                                                <div className="h-32 bg-gray-100 relative">
                                                    {menu.image_url ? (
                                                        <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Food'; }} />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-300 font-bold text-xs">🍽️ Menu</div>
                                                    )}
                                                    {inCart > 0 && <span className="absolute top-2 right-2 bg-isaji-orange text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md animate-bounce">{inCart}</span>}
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="font-black text-gray-900 text-xs line-clamp-2">{menu.name}</h3>
                                                    <p className="text-xs font-black text-isaji-orange mt-1">Rp {Number(menu.price || 0).toLocaleString('id-ID')}</p>
                                                </div>
                                            </div>
                                            <div className="px-3 pb-3">
                                                <button
                                                    onClick={() => addToCart(menu)}
                                                    className={`w-full py-2 rounded-xl text-xs font-bold border transition-all duration-300 active:scale-95 ${isJustAdded
                                                        ? 'bg-green-500 text-white border-green-500'
                                                        : 'bg-orange-50 text-isaji-orange border-orange-200 hover:bg-isaji-orange hover:text-white'
                                                        }`}
                                                >
                                                    {isJustAdded ? '✓ Ditambahkan' : '+ Tambah'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'my_orders' && (
                    <div className="animate-fade-in px-5 pt-4">
                        <h2 className="text-lg font-black text-gray-900 mb-1">Pesanan Saya</h2>
                        <p className="text-xs text-gray-400 mb-4">Khusus pesanan dari nomor HP <span className="font-bold">{trackedPhone}</span> di cabang ini.</p>

                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setMyOrdersFilter('ongoing')} className={`flex-1 py-2.5 rounded-xl text-xs font-black ${myOrdersFilter === 'ongoing' ? 'bg-isaji-navy text-white' : 'bg-white border border-gray-100 text-gray-500'}`}>
                                Sedang Berlangsung {ongoingOrders.length > 0 && `(${ongoingOrders.length})`}
                            </button>
                            <button onClick={() => setMyOrdersFilter('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-black ${myOrdersFilter === 'history' ? 'bg-isaji-navy text-white' : 'bg-white border border-gray-100 text-gray-500'}`}>
                                Riwayat
                            </button>
                        </div>

                        {isLoadingMyOrders ? (
                            <p className="text-center text-xs text-gray-400 py-10">Memuat pesanan...</p>
                        ) : (myOrdersFilter === 'ongoing' ? ongoingOrders : historyOrders).length === 0 ? (
                            <p className="text-center text-xs text-gray-400 py-10">
                                {myOrdersFilter === 'ongoing' ? 'Tidak ada pesanan yang sedang berlangsung.' : 'Belum ada riwayat pesanan.'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {(myOrdersFilter === 'ongoing' ? ongoingOrders : historyOrders).map((o) => (
                                    <div key={o.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{o.order_number}</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(o.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${o.status === 'cancelled' ? 'bg-red-50 text-red-500' : o.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {o.status === 'awaiting_payment' ? 'Menunggu Bayar' : o.status === 'pending' ? 'Diterima' : o.status === 'preparing' ? 'Disiapkan' : o.status === 'ready' ? 'Siap Diambil' : o.status === 'completed' ? 'Selesai' : o.status === 'cancelled' ? 'Dibatalkan' : o.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                                            {(o.order_items || []).map((it) => `${it.qty}x ${it.products?.name || 'Item'}`).join(', ')}
                                        </p>
                                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">{o.payment_status === 'paid' ? 'Sudah Dibayar' : 'Belum Dibayar'}</span>
                                            <span className="text-sm font-black text-isaji-navy">Rp {Number(o.total_amount || 0).toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cart' && (
                    <div className="p-5 space-y-4 animate-fade-in">
                        <h2 className="text-base font-black text-gray-900">Keranjang Anda</h2>
                        <div className="space-y-3">
                            {cartItems.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between transition-all">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">{item.name}</h4>
                                        <p className="text-xs text-isaji-orange font-black">Rp {Number(item.price).toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 p-1.5 rounded-xl">
                                        <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-white rounded-lg shadow-sm font-bold text-xs active:scale-90 transition-transform">-</button>
                                        <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                                        <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-isaji-navy text-white rounded-lg shadow-sm font-bold text-xs active:scale-90 transition-transform">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5 mt-6">
                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                <span>Subtotal</span>
                                <span>Rp {subtotalAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 font-medium">
                                <span>Pajak & Layanan (10%)</span>
                                <span>Rp {taxAmount.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-gray-900 font-black text-base pt-3 border-t border-gray-100">
                                <span>Total Tagihan</span>
                                <span className="text-isaji-orange">Rp {grandTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                        {cartItems.length > 0 && (
                            <button onClick={checkLocationAndProceed} className="w-full bg-isaji-navy text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform">
                                Lanjut ke Data Pemesan
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'order_form' && (
                    <div className="p-5 space-y-5 animate-fade-in">
                        <h2 className="text-base font-black text-gray-900">Data Pemesan</h2>
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nama Pemesan</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="Hanya huruf" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none transition-colors focus:border-isaji-orange" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">No. WhatsApp</label>
                                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Minimal 11 Angka" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none font-mono transition-colors focus:border-isaji-orange" />
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
                            <div className="flex justify-between text-gray-900 font-black text-base">
                                <span>Total Tagihan</span>
                                <span className="text-isaji-orange">Rp {grandTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setActiveTab('cart')} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Kembali</button>
                            <button onClick={handleContinueToPayment} className="flex-[1.5] bg-isaji-navy text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform">Lanjut ke Pembayaran</button>
                        </div>
                    </div>
                )}

                {activeTab === 'payment' && (
                    <div className="p-5 space-y-5 animate-fade-in">
                        <h2 className="text-base font-black text-gray-900">Pilih Metode Pembayaran</h2>
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2">
                            {paymentOptions.length === 0 && (
                                <p className="text-xs text-gray-400 italic px-1">Cabang ini belum mengatur metode pembayaran.</p>
                            )}

                            {/* Metode manual: cash / qris statis / transfer bank / e-wallet - diatur manager di Payment Method Manager */}
                            {paymentOptions.map(opt => {
                                const isSelected = selectedPayment === opt.key;
                                if (opt.kind === 'manual') {
                                    const pm = opt.pm;
                                    const isCash = pm.type === 'cash';
                                    return (
                                        <label key={opt.key} className={`block p-4 rounded-2xl border cursor-pointer transition-colors active:scale-95 ${isSelected ? 'border-isaji-orange bg-orange-50' : 'border-gray-200'}`}>
                                            <div className="flex items-center gap-3">
                                                <input type="radio" name="payment" value={opt.key} checked={isSelected} onChange={() => setSelectedPayment(opt.key)} className="w-4 h-4 accent-isaji-orange shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-bold text-gray-700 block truncate">{pm.name}</span>
                                                    {isCash && (
                                                        <span className="text-[10px] text-gray-400 font-semibold">
                                                            {branch?.cash_payment_timing === 'before_order' ? 'Bayar dulu di kasir, pesanan diproses setelah dikonfirmasi' : 'Bayar di kasir, dikonfirmasi kasir sebelum masuk dapur'}
                                                        </span>
                                                    )}
                                                    {!isCash && (
                                                        <span className="text-[10px] text-gray-400 font-semibold block">Upload bukti bayar, diverifikasi kasir</span>
                                                    )}
                                                    {!isCash && pm.provider_details && (
                                                        <span className="text-[10px] text-gray-400 font-semibold block truncate">{pm.provider_details}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {isSelected && pm.type === 'static_qris' && pm.qr_image_url && (
                                                <div className="mt-3 flex justify-center animate-pop-in">
                                                    <img src={pm.qr_image_url} alt={`QRIS ${pm.name}`} className="w-40 h-40 object-contain rounded-xl border border-gray-100 bg-white p-2" />
                                                </div>
                                            )}
                                        </label>
                                    );
                                }
                                // Gateway otomatis (mis. Midtrans) - langsung bayar online, tanpa upload bukti
                                return (
                                    <label key={opt.key} className={`block p-4 rounded-2xl border cursor-pointer transition-colors active:scale-95 ${isSelected ? 'border-isaji-orange bg-orange-50' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <input type="radio" name="payment" value={opt.key} checked={isSelected} onChange={() => setSelectedPayment(opt.key)} className="w-4 h-4 accent-isaji-orange shrink-0" />
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold text-gray-700 block truncate capitalize">Bayar Online ({opt.gw.provider_name})</span>
                                                <span className="text-[10px] text-gray-400 font-semibold block">Kartu / VA / QRIS otomatis, langsung terverifikasi</span>
                                            </div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setActiveTab('order_form')} className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Kembali</button>
                            <button onClick={handleConfirmOrderSubmit} className="flex-[1.5] bg-isaji-navy text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform">
                                {isSelectedCash && branch?.cash_payment_timing !== 'before_order'
                                    ? `Rp ${grandTotal.toLocaleString('id-ID')} - Pesan, Bayar di Kasir`
                                    : `Rp ${grandTotal.toLocaleString('id-ID')} - Bayar Sekarang`}
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'payment_proof' && orderResult && (
                    <div className="p-5 space-y-5 animate-fade-in">
                        <div className="text-center">
                            <h2 className="text-base font-black text-gray-900">Upload Bukti Pembayaran</h2>
                            <p className="text-xs text-gray-500 mt-1">Pesanan <span className="font-bold">{orderResult.orderNumber}</span> akan diproses ke dapur setelah kasir memverifikasi bukti bayar Anda.</p>
                        </div>

                        {selectedPaymentMethod?.type === 'static_qris' && selectedPaymentMethod?.qr_image_url && (
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center">
                                <img src={selectedPaymentMethod.qr_image_url} alt="QRIS" className="w-44 h-44 object-contain rounded-xl border border-gray-100 bg-white p-2" />
                                <p className="text-[11px] text-gray-400 font-semibold mt-2">Scan QRIS di atas, lalu unggah screenshot bukti pembayaran.</p>
                            </div>
                        )}
                        {selectedPaymentMethod?.type === 'bank_transfer' && selectedPaymentMethod?.provider_details && (
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Transfer ke</p>
                                <p className="text-sm font-bold text-gray-800 whitespace-pre-line">{selectedPaymentMethod.provider_details}</p>
                            </div>
                        )}

                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2.5">
                            <div className="flex justify-between text-gray-900 font-black text-base">
                                <span>Total Tagihan</span>
                                <span className="text-isaji-orange">Rp {Number(orderResult.amount || grandTotal).toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase">Bukti Pembayaran</label>
                            {proofPreview ? (
                                <img src={proofPreview} alt="Preview bukti bayar" className="w-full h-48 object-contain rounded-xl border border-gray-100 bg-gray-50" />
                            ) : (
                                <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-xs font-bold">Belum ada gambar dipilih</div>
                            )}
                            <input type="file" accept="image/*" capture="environment" onChange={handleProofFileChange} className="w-full text-xs" />
                            {proofError && <p className="text-xs text-red-500 font-bold">{proofError}</p>}
                        </div>

                        <button onClick={submitPaymentProof} disabled={isUploadingProof} className="w-full bg-isaji-navy text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-60">
                            {isUploadingProof ? 'Mengunggah...' : 'Kirim Bukti Pembayaran'}
                        </button>
                    </div>
                )}

                {activeTab === 'cash_wait' && orderResult && (
                    <div className="p-6 text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">💵</div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Silakan Bayar di Kasir</h2>
                            <p className="text-sm text-gray-600 mt-2">
                                Tunjukkan nomor pesanan <span className="font-bold">{orderResult.orderNumber}</span> ke kasir dan lakukan pembayaran tunai sebesar
                                <span className="font-black text-isaji-orange"> Rp {Number(orderResult.amount || grandTotal).toLocaleString('id-ID')}</span>.
                            </p>
                            <p className="text-xs text-gray-400 mt-2">Pesanan akan otomatis masuk ke dapur setelah kasir mengonfirmasi pembayaran Anda diterima.</p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-amber-500">
                            <div className="animate-spin w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full"></div>
                            <span className="text-xs font-bold">Menunggu konfirmasi kasir...</span>
                        </div>
                    </div>
                )}

                {activeTab === 'gateway_wait' && orderResult && (
                    <div className="p-6 text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">💳</div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Menunggu Pembayaran Online</h2>
                            <p className="text-sm text-gray-600 mt-2">Pesanan <span className="font-bold">{orderResult.orderNumber}</span> senilai <span className="font-black text-isaji-orange">Rp {Number(orderResult.amount || grandTotal).toLocaleString('id-ID')}</span> menunggu penyelesaian pembayaran.</p>
                        </div>

                        {gatewayError && (
                            <div className="bg-red-50 text-red-600 text-xs font-bold rounded-xl p-3 text-left">{gatewayError}</div>
                        )}

                        {!isGatewayProcessing && (
                            <button
                                onClick={() => startGatewayPayment(activeOrder, orderResult.orderNumber)}
                                className="w-full bg-isaji-navy text-white py-3.5 rounded-2xl font-black active:scale-95 transition-transform"
                            >
                                Coba Bayar Lagi
                            </button>
                        )}

                        <div className="flex items-center justify-center gap-2 text-blue-500">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                            <span className="text-xs font-bold">Memeriksa status pembayaran...</span>
                        </div>
                    </div>
                )}

                {activeTab === 'payment_status' && orderResult && (
                    <div className="p-6 text-center space-y-6 animate-fade-in">
                        {activeVerification?.status === 'rejected' ? (
                            <>
                                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">✕</div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Bukti Pembayaran Ditolak</h2>
                                    <p className="text-sm text-gray-600 mt-2">Alasan dari kasir:</p>
                                    <p className="text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3 mt-1">{activeVerification.rejection_reason || 'Bukti tidak sesuai / tidak terbaca.'}</p>
                                </div>
                                <button onClick={() => { setProofFile(null); setProofPreview(null); setActiveTab('payment_proof'); }} className="w-full bg-isaji-orange text-white py-3.5 rounded-2xl font-black active:scale-95 transition-transform">Upload Ulang Bukti Bayar</button>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                    <div className="animate-spin w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full"></div>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Menunggu Verifikasi Kasir</h2>
                                    <p className="text-sm text-gray-600 mt-2">Pesanan <span className="font-bold">{orderResult.orderNumber}</span> Anda sedang dicek oleh kasir. Halaman ini akan otomatis update begitu bukti Anda diverifikasi.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'success' && orderResult && (
                    <div className="p-6 text-center space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto text-3xl font-black shadow-inner">✓</div>
                        <h2 className="text-xl font-black">Pesanan Berhasil!</h2>
                        <button onClick={() => { setActiveTab('menu'); setOrderResult(null); setCart({}); }} className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-bold active:scale-95 transition-transform">Pesan Lagi</button>
                    </div>
                )}

                <SelfOrderFooter />
            </div>

            {activeTab === 'menu' && cartItems.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 p-4 z-40 flex items-center gap-2 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] animate-fade-in">
                    <button onClick={() => setActiveTab('cart')} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-black active:scale-95 transition-transform">Lihat ({totalItemsCount})</button>
                    <button onClick={checkLocationAndProceed} className="flex-[1.5] py-3 bg-isaji-orange text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-transform">
                        Checkout - Rp {subtotalAmount.toLocaleString('id-ID')}
                    </button>
                </div>
            )}

            {showTnCPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-gray-900/70 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 text-center w-full max-w-sm scale-100 animate-fade-in">
                        <h3 className="font-black text-lg mb-2">Konfirmasi Pesanan</h3>
                        <p className="text-xs text-gray-500 mb-5">
                            {requiresCashBeforeOrder
                                ? 'Silakan bayar tunai di kasir terlebih dahulu, lalu tunjukkan nomor pesanan Anda agar diproses ke dapur.'
                                : 'Pesanan tidak dapat dibatalkan setelah masuk dapur.'}
                        </p>
                        <button onClick={executeFinalOrder} disabled={isSubmitting} className="w-full bg-isaji-orange text-white py-3.5 rounded-xl font-black mb-2 active:scale-95 transition-transform">
                            {isSubmitting ? 'Memproses...' : 'Setuju & Proses'}
                        </button>
                        <button onClick={() => setShowTnCPopup(false)} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold active:scale-95 transition-transform">Batal</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SelfOrderPage;