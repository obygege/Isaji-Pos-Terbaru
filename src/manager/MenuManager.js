import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function MenuManager({ branchId, organizationId }) {
    const [menus, setMenus] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        name: '',
        category: 'makanan',
        description: '',
        price: '',
        stock: '',
        image_url: ''
    });

    // Mengambil data menu khusus berdasarkan branch_id yang sedang aktif
    const fetchMenus = useCallback(async () => {
        if (!branchId) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('menus')
                .select('*')
                .eq('branch_id', branchId) // Isolasi ketat per cabang
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMenus(data || []);
        } catch (err) {
            console.error("Gagal memuat menu:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchMenus();
    }, [fetchMenus]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const openAddModal = () => {
        setEditingId(null);
        setForm({
            name: '',
            category: 'makanan',
            description: '',
            price: '',
            stock: '',
            image_url: ''
        });
        setIsModalOpen(true);
    };

    const openEditModal = (menu) => {
        setEditingId(menu.id);
        setForm({
            name: menu.name || '',
            category: menu.category || 'makanan',
            description: menu.description || '',
            price: menu.price || '',
            stock: menu.stock || '',
            image_url: menu.image_url || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Hapus menu "${name}" dari cabang ini?`)) {
            const { error } = await supabase
                .from('menus')
                .delete()
                .eq('id', id)
                .eq('branch_id', branchId); // Keamanan lapis kedua agar tidak salah hapus cabang lain

            if (error) {
                alert("Gagal menghapus menu: " + error.message);
            } else {
                setMenus(menus.filter(m => m.id !== id));
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Payload wajib membawa organization_id dan branch_id agar aman & terisolasi
        const payload = {
            organization_id: organizationId,
            branch_id: branchId,
            name: form.name,
            category: form.category,
            description: form.description,
            price: parseFloat(form.price) || 0,
            stock: parseInt(form.stock) || 0,
            image_url: form.image_url,
            updated_at: new Date().toISOString()
        };

        try {
            if (editingId) {
                const { error } = await supabase
                    .from('menus')
                    .update(payload)
                    .eq('id', editingId)
                    .eq('branch_id', branchId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('menus')
                    .insert([payload]);
                if (error) throw error;
            }

            await fetchMenus();
            setIsModalOpen(false);
            alert("Menu berhasil disimpan!");
        } catch (error) {
            alert("Gagal menyimpan menu: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'makanan': return 'bg-orange-50 text-orange-600 border-orange-200';
            case 'minuman': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'makanan ringan': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
            case 'dessert': return 'bg-pink-50 text-pink-600 border-pink-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Manajemen Menu & Katalog Cabang</h3>
                    <p className="text-sm text-gray-500 mt-0.5">Produk dan harga ini berdiri sendiri dan tidak tercampur dengan cabang lain.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Tambah Menu Cabang
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat katalog menu cabang...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {menus.length === 0 ? (
                        <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                            Belum ada menu terdaftar untuk cabang ini. Klik tombol "Tambah Menu Cabang" di atas.
                        </div>
                    ) : (
                        menus.map((menu) => (
                            <div key={menu.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="h-48 w-full bg-gray-100 relative overflow-hidden">
                                        <img
                                            src={menu.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"}
                                            alt={menu.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80"; }}
                                        />
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border tracking-wider shadow-sm bg-white/90 backdrop-blur-sm ${getCategoryBadge(menu.category)}`}>
                                                {menu.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <h4 className="font-extrabold text-gray-900 text-lg leading-snug">{menu.name}</h4>
                                            <span className="font-black text-isaji-navy text-base shrink-0">
                                                Rp {Number(menu.price || 0).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px]">{menu.description || 'Tidak ada deskripsi.'}</p>
                                    </div>
                                </div>

                                <div className="p-5 pt-0 flex items-center justify-between border-t border-gray-50 mt-4">
                                    <div>
                                        <span className="text-[10px] font-extrabold text-gray-400 uppercase block">Stok Menu Cabang</span>
                                        <span className={`text-sm font-black ${menu.stock <= 5 ? 'text-red-500' : 'text-gray-800'}`}>
                                            {menu.stock} Porsi
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => openEditModal(menu)} className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold transition-colors">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(menu.id, menu.name)} className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-black text-gray-900">{editingId ? 'Edit Menu Cabang' : 'Tambah Menu Baru Cabang'}</h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nama Menu</label>
                                <input type="text" name="name" required value={form.name} onChange={handleFormChange} placeholder="Cth: Nasi Goreng Spesial" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-isaji-navy/20 text-sm" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Kategori</label>
                                    <select name="category" value={form.category} onChange={handleFormChange} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm bg-white cursor-pointer">
                                        <option value="makanan">Makanan</option>
                                        <option value="minuman">Minuman</option>
                                        <option value="makanan ringan">Makanan Ringan</option>
                                        <option value="dessert">Dessert</option>
                                        <option value="lainnya">Lainnya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stok Cabang</label>
                                    <input type="number" name="stock" required min="0" value={form.stock} onChange={handleFormChange} placeholder="50" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm font-mono" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Harga (Rp)</label>
                                    <input type="number" name="price" required min="0" value={form.price} onChange={handleFormChange} placeholder="25000" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link URL Gambar</label>
                                    <input type="url" name="image_url" value={form.image_url} onChange={handleFormChange} placeholder="https://images.unsplash.com/..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi Menu</label>
                                <textarea name="description" rows="3" value={form.description} onChange={handleFormChange} placeholder="Keterangan bahan atau rasa menu..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm"></textarea>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl font-bold text-sm">Batal</button>
                                <button type="submit" disabled={isLoading} className="flex-1 bg-isaji-navy hover:bg-blue-900 text-white py-2.5 rounded-xl font-bold text-sm shadow-sm">{isLoading ? 'Menyimpan...' : 'Simpan Menu'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MenuManager;