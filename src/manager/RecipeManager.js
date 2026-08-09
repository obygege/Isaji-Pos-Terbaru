import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function RecipeManager({ branchId, organizationId }) {
    const [menus, setMenus] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [selectedMenuId, setSelectedMenuId] = useState('');
    const [recipeLines, setRecipeLines] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [newLine, setNewLine] = useState({ ingredient_id: '', qty_used: '' });

    const fetchBaseData = useCallback(async () => {
        if (!branchId || !organizationId) return;
        setIsLoading(true);
        try {
            const [menuRes, ingredientRes] = await Promise.all([
                supabase.from('menus').select('id, name, category').eq('branch_id', branchId).order('name'),
                supabase.from('ingredients').select('id, name, unit').eq('organization_id', organizationId).order('name'),
            ]);
            setMenus(menuRes.data || []);
            setIngredients(ingredientRes.data || []);
            if (menuRes.data?.length > 0 && !selectedMenuId) {
                setSelectedMenuId(menuRes.data[0].id);
            }
        } catch (err) {
            console.error('Gagal memuat data:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, organizationId, selectedMenuId]);

    const fetchRecipe = useCallback(async (menuId) => {
        if (!menuId) return;
        // product_recipes.product_id diisi id dari tabel `menus`, mengikuti
        // konvensi yang sudah dipakai order_items.product_id di seluruh app.
        const { data, error } = await supabase
            .from('product_recipes')
            .select('id, qty_used, ingredient_id, ingredients ( id, name, unit )')
            .eq('product_id', menuId);

        if (error) {
            console.error('Gagal memuat resep:', error.message);
            setRecipeLines([]);
            return;
        }
        setRecipeLines(data || []);
    }, []);

    useEffect(() => {
        fetchBaseData();
    }, [fetchBaseData]);

    useEffect(() => {
        if (selectedMenuId) fetchRecipe(selectedMenuId);
    }, [selectedMenuId, fetchRecipe]);

    const handleAddLine = async (e) => {
        e.preventDefault();
        if (!newLine.ingredient_id || !newLine.qty_used) return;

        // Cegah bahan baku yang sama dobel di resep yang sama
        if (recipeLines.some((l) => l.ingredient_id === newLine.ingredient_id)) {
            alert('Bahan baku ini sudah ada di resep. Edit baris yang sudah ada saja.');
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await supabase.from('product_recipes').insert({
                product_id: selectedMenuId,
                ingredient_id: newLine.ingredient_id,
                qty_used: parseFloat(newLine.qty_used),
            });
            if (error) throw error;
            setNewLine({ ingredient_id: '', qty_used: '' });
            await fetchRecipe(selectedMenuId);
        } catch (err) {
            alert('Gagal menambah bahan: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateQty = async (lineId, qty) => {
        try {
            const { error } = await supabase.from('product_recipes').update({ qty_used: parseFloat(qty) || 0 }).eq('id', lineId);
            if (error) throw error;
            await fetchRecipe(selectedMenuId);
        } catch (err) {
            alert('Gagal update qty: ' + err.message);
        }
    };

    const handleRemoveLine = async (lineId) => {
        if (!window.confirm('Hapus bahan baku ini dari resep?')) return;
        try {
            const { error } = await supabase.from('product_recipes').delete().eq('id', lineId);
            if (error) throw error;
            await fetchRecipe(selectedMenuId);
        } catch (err) {
            alert('Gagal menghapus: ' + err.message);
        }
    };

    const selectedMenu = menus.find((m) => m.id === selectedMenuId);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Resep Menu (Bill of Materials)</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                    Hubungkan menu dengan bahan baku yang dipakai. Setelah resep diisi, stok bahan baku akan
                    <span className="font-bold text-isaji-navy"> otomatis terpotong</span> setiap ada order masuk -- dari Self-Order maupun Kasir, tanpa perlu update manual.
                </p>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-400 font-medium">Memuat menu & bahan baku...</div>
            ) : menus.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
                    Belum ada menu di cabang ini. Tambahkan menu dulu lewat halaman Manajemen Menu.
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Daftar Menu */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-1">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Pilih Menu</p>
                        </div>
                        <div className="max-h-[520px] overflow-y-auto">
                            {menus.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMenuId(m.id)}
                                    className={`w-full text-left px-5 py-3 border-b border-gray-50 transition-colors ${selectedMenuId === m.id ? 'bg-isaji-navy/5 border-l-4 border-l-isaji-navy' : 'hover:bg-gray-50'}`}
                                >
                                    <p className="font-bold text-sm text-gray-900">{m.name}</p>
                                    <p className="text-xs text-gray-400 capitalize">{m.category}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resep Menu Terpilih */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 p-6">
                        {!selectedMenu ? (
                            <p className="text-gray-400 text-center py-10">Pilih menu di sebelah kiri.</p>
                        ) : (
                            <>
                                <h4 className="font-black text-lg text-gray-900 mb-1">{selectedMenu.name}</h4>
                                <p className="text-xs text-gray-400 mb-5">Daftar bahan baku & takaran yang dipakai untuk 1 porsi menu ini.</p>

                                {recipeLines.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm mb-5">
                                        Resep belum diisi. Stok bahan baku belum akan otomatis terpotong untuk menu ini sampai resepnya ditambahkan.
                                    </div>
                                ) : (
                                    <div className="space-y-2 mb-5">
                                        {recipeLines.map((line) => (
                                            <div key={line.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                                                <span className="flex-1 font-bold text-sm text-gray-800">{line.ingredients?.name}</span>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    defaultValue={line.qty_used}
                                                    onBlur={(e) => e.target.value !== String(line.qty_used) && handleUpdateQty(line.id, e.target.value)}
                                                    className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm font-mono text-right"
                                                />
                                                <span className="text-xs text-gray-400 w-12">{line.ingredients?.unit}</span>
                                                <button onClick={() => handleRemoveLine(line.id)} className="text-red-500 hover:text-red-700 text-xs font-bold px-2">Hapus</button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleAddLine} className="flex gap-2 items-end border-t border-gray-100 pt-5">
                                    <div className="flex-1">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tambah Bahan Baku</label>
                                        <select
                                            value={newLine.ingredient_id}
                                            onChange={(e) => setNewLine({ ...newLine, ingredient_id: e.target.value })}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                                        >
                                            <option value="">-- Pilih Bahan --</option>
                                            {ingredients.map((ing) => (
                                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Takaran</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            value={newLine.qty_used}
                                            onChange={(e) => setNewLine({ ...newLine, qty_used: e.target.value })}
                                            placeholder="0"
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono"
                                        />
                                    </div>
                                    <button type="submit" disabled={isSaving} className="bg-isaji-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm">
                                        + Tambah
                                    </button>
                                </form>
                                {ingredients.length === 0 && (
                                    <p className="text-xs text-orange-500 font-medium mt-3">Belum ada master bahan baku. Tambahkan dulu lewat halaman Ringkasan Stok.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default RecipeManager;