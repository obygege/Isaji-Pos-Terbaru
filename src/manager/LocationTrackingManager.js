import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function LocationTrackingManager({ branchId }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [mapsLinkInput, setMapsLinkInput] = useState('');

    const [form, setForm] = useState({
        latitude: '',
        longitude: '',
        max_radius_meters: 50
    });

    const fetchBranchLocation = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('latitude, longitude, max_radius_meters, name')
                .eq('id', branchId)
                .single();

            if (error) throw error;
            if (data) {
                setForm({
                    latitude: data.latitude || '',
                    longitude: data.longitude || '',
                    max_radius_meters: data.max_radius_meters || 50
                });
            }
        } catch (err) {
            console.error("Gagal memuat data lokasi cabang:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchBranchLocation();
    }, [fetchBranchLocation]);

    // Helper cerdas untuk mengekstrak koordinat lat & lng dari berbagai format link Google Maps
    const handleParseMapsLink = () => {
        if (!mapsLinkInput) return;

        try {
            let lat = null;
            let lng = null;

            // Format 1: URL mengandung @lat,lng
            const atMatch = mapsLinkInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (atMatch) {
                lat = atMatch[1];
                lng = atMatch[2];
            } else {
                // Format 2: URL mengandung q=lat,lng atau query parameter
                const qMatch = mapsLinkInput.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (qMatch) {
                    lat = qMatch[1];
                    lng = qMatch[2];
                } else {
                    // Format 3: Koordinat langsung dipisah koma (Cth: -3.123456, 104.123456)
                    const directCoords = mapsLinkInput.split(',');
                    if (directCoords.length === 2 && !isNaN(directCoords[0]) && !isNaN(directCoords[1])) {
                        lat = directCoords[0].trim();
                        lng = directCoords[1].trim();
                    }
                }
            }

            if (lat && lng) {
                setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
                setMapsLinkInput('');
                alert("Berhasil mengekstrak koordinat dari link/input!");
            } else {
                alert("Format link Google Maps tidak dikenali. Pastikan menyalin link lengkap atau format koordinat 'lat, lng'.");
            }
        } catch (e) {
            alert("Gagal membaca link Maps: " + e.message);
        }
    };

    const handleSaveLocation = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('branches')
                .update({
                    latitude: parseFloat(form.latitude) || null,
                    longitude: parseFloat(form.longitude) || null,
                    max_radius_meters: parseInt(form.max_radius_meters) || 50,
                    updated_at: new Date().toISOString()
                })
                .eq('id', branchId);

            if (error) throw error;
            alert("Pengaturan Geo-Fencing QR Order berhasil disimpan!");
            await fetchBranchLocation();
        } catch (err) {
            alert("Gagal menyimpan lokasi: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Tracking Lokasi QR Order (Geo-Fencing)</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Atur titik GPS dan batas radius agar pelanggan hanya bisa memesan lewat QR saat berada di area toko.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat pengaturan lokasi cabang...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Panel Kiri: Alat Bantu Parse Link */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 md:col-span-1">
                        <h4 className="font-extrabold text-gray-900 text-sm">Ambil Koordinat Cepat</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Buka Google Maps, cari lokasi toko Anda, klik kanan pilih <strong>"What's here?"</strong> atau salin link Google Maps, lalu tempel di bawah:
                        </p>
                        <div className="space-y-2">
                            <textarea
                                rows="3"
                                value={mapsLinkInput}
                                onChange={(e) => setMapsLinkInput(e.target.value)}
                                placeholder="Tempel Link Google Maps / Koordinat..."
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-isaji-navy/20"
                            ></textarea>
                            <button
                                type="button"
                                onClick={handleParseMapsLink}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                                Ekstrak Koordinat
                            </button>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-500 block mb-1">Status Keamanan</span>
                            <p className="text-xs text-gray-600">
                                {form.latitude && form.longitude ? '✅ Titik GPS Toko Terdaftar' : '⚠️ Titik GPS Belum Diatur'}
                            </p>
                        </div>
                    </div>

                    {/* Panel Kanan: Form Utama Pengaturan Radius */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 md:col-span-2">
                        <form onSubmit={handleSaveLocation} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitude (Garis Lintang)</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.latitude}
                                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                                        placeholder="-3.123456"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitude (Garis Bujur)</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.longitude}
                                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                                        placeholder="104.123456"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    Batas Radius Validasi (Meter): <span className="text-isaji-orange font-black">{form.max_radius_meters} Meter</span>
                                </label>
                                <input
                                    type="range"
                                    min="10"
                                    max="1000"
                                    step="10"
                                    value={form.max_radius_meters}
                                    onChange={(e) => setForm({ ...form, max_radius_meters: e.target.value })}
                                    className="w-full accent-isaji-navy cursor-pointer mt-2"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-1">
                                    <span>10 Meter (Ketar)</span>
                                    <span>500 Meter</span>
                                    <span>1000 Meter (1 KM)</span>
                                </div>
                            </div>

                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                                <strong>Aturan Sistem Self-Order QR:</strong> Saat pelanggan memindai QR code meja, perangkat mereka akan meminta izin lokasi (GPS). Jika jarak antara perangkat pelanggan dan titik koordinat toko ini melebihi <strong>{form.max_radius_meters} meter</strong>, sistem akan otomatis menolak akses pemesanan.
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-isaji-navy hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                                >
                                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan Lokasi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LocationTrackingManager;