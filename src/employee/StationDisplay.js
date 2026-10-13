import React, { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../backend/lib/supabaseClient';

// Kata kunci nama kategori produk yang masuk jalur MINUMAN (barista).
// Selain kata kunci ini, semua kategori dianggap MAKANAN (kitchen) -
// termasuk yang belum jelas kategorinya, biar tidak ada pesanan "hilang".
const BARISTA_KEYWORDS = ['minum', 'drink', 'kopi', 'coffee', 'tea', 'teh', 'jus', 'juice', 'susu', 'milkshake', 'squash', 'soda', 'es '];

function isBaristaCategory(categoryName) {
    if (!categoryName) return false;
    const n = categoryName.toLowerCase();
    return BARISTA_KEYWORDS.some(k => n.includes(k));
}

function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    const hrs = Math.floor(mins / 60);
    return `${hrs} jam ${mins % 60} menit lalu`;
}

const STATION_LABEL = { kitchen: 'Kitchen', barista: 'Barista' };
const NEXT_STATUS = { pending: 'preparing', preparing: 'ready' };
const STATUS_LABEL = { pending: 'Baru Masuk', preparing: 'Diproses', ready: 'Siap Diambil' };
const STATUS_BADGE = { pending: 'bg-red-100 text-red-700 border-red-300', preparing: 'bg-amber-100 text-amber-700 border-amber-300', ready: 'bg-green-100 text-green-700 border-green-300' };
const ACTION_LABEL = { pending: 'Mulai Proses', preparing: 'Tandai Siap' };

function StationDisplay({ station }) {
    const urlParams = new URLSearchParams(window.location.search);
    const branchId = urlParams.get('branch');

    const [branch, setBranch] = useState(null);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);
    const [clockNow, setClockNow] = useState(new Date());
    const [updatingId, setUpdatingId] = useState(null);
    const audioRef = useRef(null);
    const knownOrderIds = useRef(new Set());

    useEffect(() => {
        const t = setInterval(() => setClockNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const fetchOrders = useCallback(async (isFirstLoad) => {
        if (!branchId) return;
        const { data, error } = await supabase
            .from('orders')
            .select('id, order_number, status, payment_status, customer_name, table_id, notes, created_at, tables(name), order_items(id, qty, notes, products(name, category_id, product_categories(name)))')
            .eq('branch_id', branchId)
            .in('status', ['pending', 'preparing'])
            .order('created_at', { ascending: true });

        if (error) {
            setErrorMsg('Gagal ambil data pesanan: ' + error.message);
            setIsLoading(false);
            return;
        }

        const relevant = (data || [])
            .map(o => ({
                ...o,
                items: (o.order_items || []).filter(it => {
                    const catName = it.products?.product_categories?.name;
                    const isBarista = isBaristaCategory(catName);
                    return station === 'barista' ? isBarista : !isBarista;
                })
            }))
            .filter(o => o.items.length > 0);

        if (!isFirstLoad) {
            const hasNew = relevant.some(o => !knownOrderIds.current.has(o.id));
            if (hasNew && audioRef.current) {
                audioRef.current.play().catch(() => { });
            }
        }
        knownOrderIds.current = new Set(relevant.map(o => o.id));

        setOrders(relevant);
        setIsLoading(false);
    }, [branchId, station]);

    useEffect(() => {
        if (!branchId) {
            setErrorMsg('Parameter ?branch=<id_cabang> wajib diisi di URL.');
            setIsLoading(false);
            return;
        }
        supabase.from('branches').select('id, name, logo_url').eq('id', branchId).single()
            .then(({ data }) => setBranch(data));

        fetchOrders(true);

        const channel = supabase
            .channel(`station-${station}-${branchId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, () => fetchOrders(false))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => fetchOrders(false))
            .subscribe();

        const poll = setInterval(() => fetchOrders(false), 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(poll);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branchId, station]);

    const advanceStatus = async (order) => {
        const next = NEXT_STATUS[order.status];
        if (!next) return;
        setUpdatingId(order.id);
        const { error } = await supabase.from('orders').update({ status: next, updated_at: new Date().toISOString() }).eq('id', order.id);
        setUpdatingId(null);
        if (error) {
            alert('Gagal update status: ' + error.message);
            return;
        }
        fetchOrders(false);
    };

    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white font-bold">Memuat antrian {STATION_LABEL[station]}...</div>;
    }

    if (errorMsg) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-400 font-bold p-6 text-center">{errorMsg}</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <audio ref={audioRef} src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" preload="auto" />

            <div className="bg-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-gray-700 shadow-lg">
                <div className="flex items-center gap-3">
                    {branch?.logo_url && <img src={branch.logo_url} alt="Logo" className="w-9 h-9 rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />}
                    <div>
                        <h1 className="text-xl font-black leading-tight">{STATION_LABEL[station]} Display</h1>
                        <p className="text-xs text-gray-400">{branch?.name || 'Cabang'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{clockNow.toLocaleTimeString('id-ID')}</p>
                    <p className="text-xs text-gray-400">{orders.length} antrian aktif</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                    <p className="text-lg font-bold">Tidak ada antrian</p>
                    <p className="text-sm">Pesanan baru akan muncul otomatis di sini.</p>
                </div>
            ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map(order => (
                        <div key={order.id} className={`rounded-2xl border-2 p-4 flex flex-col gap-3 ${order.status === 'pending' ? 'bg-gray-800 border-red-500/60' : order.status === 'preparing' ? 'bg-gray-800 border-amber-500/60' : 'bg-gray-800 border-green-500/60'}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-black text-lg">{order.order_number}</p>
                                    <p className="text-xs text-gray-400">{order.tables?.name || order.customer_name || '-'} &middot; {timeAgo(order.created_at)}</p>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_BADGE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                            </div>

                            <ul className="flex flex-col gap-1.5">
                                {order.items.map(it => (
                                    <li key={it.id} className="flex justify-between text-sm bg-gray-900/60 rounded-lg px-3 py-2">
                                        <span className="font-semibold">{it.qty}x {it.products?.name || 'Item'}</span>
                                    </li>
                                ))}
                            </ul>
                            {order.items.some(it => it.notes) && (
                                <div className="text-xs text-amber-300 bg-amber-900/30 rounded-lg px-3 py-2">
                                    {order.items.filter(it => it.notes).map(it => it.notes).join(' | ')}
                                </div>
                            )}

                            {order.status !== 'ready' && (
                                <button
                                    onClick={() => advanceStatus(order)}
                                    disabled={updatingId === order.id}
                                    className={`mt-auto w-full py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50 ${order.status === 'pending' ? 'bg-amber-500 text-gray-900' : 'bg-green-500 text-gray-900'}`}
                                >
                                    {updatingId === order.id ? 'Menyimpan...' : ACTION_LABEL[order.status]}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default StationDisplay;