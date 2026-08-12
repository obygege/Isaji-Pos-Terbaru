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

    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    // STATE LOKASI USER
    const [userLocation, setUserLocation] = useState(null);

    const [cart, setCart] = useState({});
    const [activeTab, setActiveTab] = useState('menu');

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [selectedPayment, setSelectedPayment] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Semua');
    const [searchQuery, setSearchQuery] = useState('');

    // MEMBER YANG SEDANG LOGIN (real Supabase Auth, bukan localStorage)
    const [customerProfile, setCustomerProfile] = useState(null);

    const [showTnCPopup, setShowTnCPopup] = useState(false);
    const [orderResult, setOrderResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // STATE UNTUK ANIMASI TOMBOL TAMBAH
    const [addedItemId, setAddedItemId] = useState(null);

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
    const selectedPaymentMethod = paymentMethods.find(p => p.name === selectedPayment);
    const requiresCashBeforeOrder = selectedPaymentMethod?.type === 'cash' && branch?.cash_payment_timing === 'before_order';
    const totalItemsCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const subtotalAmount = cartItems.reduce((sum, item) => sum + (Number(item.price || 0) * item.qty), 0);
    const taxAmount = subtotalAmount * 0.10;
    const grandTotal = subtotalAmount + taxAmount;

    // 4. CEK LOKASI SEBELUM CHECKOUT
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

        setActiveTab('checkout');
    };

    const handleConfirmOrderSubmit = () => {
        if (customerName.trim().length < 3) return alert("Nama pemesan terlalu pendek.");
        if (customerPhone.length < 11) return alert("Nomor WhatsApp minimal 11 digit.");
        if (!selectedPayment) return alert("Pilih metode pembayaran terlebih dahulu.");
        setShowTnCPopup(true);
    };

    const executeFinalOrder = async () => {
        setShowTnCPopup(false);
        setIsSubmitting(true);

        try {
            const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
            const chosenMethod = paymentMethods.find(p => p.name === selectedPayment);
            const isCash = chosenMethod?.type === 'cash';

            // [PERBAIKAN SaaS] Insert dengan relasi Org ID, Branch ID, Table ID, dan Channel 'self_order'
            const { data: newOrder, error: oErr } = await supabase.from('orders').insert([{
                organization_id: branch.organization_id, // Identitas Toko (Tenant)
                branch_id: branchId,                     // Identitas Cabang
                table_id: tableInfo.id,                  // Identitas Meja
                order_number: orderNumber,
                channel: 'self_order',                   // [UPDATE] Penanda sumber transaksi (Kasir/Laporan akan tahu ini dari scan QR)
                status: 'pending', // NOTE: sengaja tidak dibuat status baru krn belum tahu constraint enum orders.status kamu — lihat catatan di bawah
                payment_status: isCash ? 'unpaid' : 'paid',
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

            setOrderResult({
                orderId: newOrder.id,
                orderNumber: orderNumber,
                status: newOrder.status,
                payment_status: newOrder.payment_status,
                isCash: isCash
            });
            setActiveTab('success');
            setCart({});
        } catch (err) {
            alert("Gagal memproses pesanan: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin w-8 h-8 border-4 border-isaji-orange border-t-transparent rounded-full"></div></div>;
    if (errorMsg) return <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center"><h2 className="text-lg font-black text-red-600 mb-1">Akses Ditolak</h2><p className="text-sm text-gray-700">{errorMsg}</p></div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden font-sans">
            <SelfOrderHeader branch={branch} tableInfo={tableInfo} activeTab={activeTab} setActiveTab={setActiveTab} customerProfile={customerProfile} onLogoutMember={handleLogoutMember} />

            <div className="flex-1 pb-28 overflow-y-auto">
                {activeTab === 'menu' && (
                    <div className="animate-fade-in">
                        <div className="px-5 pt-4">
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
                    </div>
                )}

                {activeTab === 'checkout' && (
                    <div className="p-5 space-y-5 animate-fade-in">
                        <h2 className="text-base font-black text-gray-900">Pembayaran & Data Diri</h2>
                        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nama Pemesan</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))} placeholder="Hanya huruf" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none transition-colors focus:border-isaji-orange" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">No. WhatsApp</label>
                                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="Minimal 11 Angka" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none font-mono transition-colors focus:border-isaji-orange" />
                            </div>

                            <div className="pt-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Metode Pembayaran</label>
                                <div className="space-y-2">
                                    {/* Metode ini datang langsung dari payment_methods milik cabang ini saja (sudah difilter branch_id di loadSessionData) */}
                                    {paymentMethods.length === 0 && (
                                        <p className="text-xs text-gray-400 italic px-1">Cabang ini belum mengatur metode pembayaran.</p>
                                    )}
                                    {paymentMethods.map(pm => {
                                        const isCash = pm.type === 'cash';
                                        const isSelected = selectedPayment === pm.name;
                                        return (
                                            <label key={pm.id} className={`block p-4 rounded-2xl border cursor-pointer transition-colors active:scale-95 ${isSelected ? 'border-isaji-orange bg-orange-50' : 'border-gray-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input type="radio" name="payment" value={pm.name} onChange={() => setSelectedPayment(pm.name)} className="w-4 h-4 accent-isaji-orange shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-bold text-gray-700 block truncate">{pm.name}</span>
                                                        {isCash && (
                                                            <span className="text-[10px] text-gray-400 font-semibold">
                                                                {branch?.cash_payment_timing === 'before_order' ? 'Bayar dulu sebelum pesanan diproses' : 'Bayar nanti di kasir'}
                                                            </span>
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
                                    })}
                                </div>
                            </div>
                        </div>

                        <button onClick={handleConfirmOrderSubmit} className="w-full bg-isaji-navy text-white py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform">
                            {selectedPayment && paymentMethods.find(p => p.name === selectedPayment)?.type === 'cash' && branch?.cash_payment_timing !== 'before_order'
                                ? `Rp ${grandTotal.toLocaleString('id-ID')} - Pesan Sekarang, Bayar di Kasir`
                                : `Rp ${grandTotal.toLocaleString('id-ID')} - Bayar Sekarang`}
                        </button>
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