import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../../../backend/lib/supabaseClient';
import { TABLE_SCHEMA, TABLE_GROUPS } from '../dataSchema';
import CrudFormModal from '../components/CrudFormModal';

const PAGE_SIZE = 25;

function DatabaseTab() {
    const [activeTable, setActiveTable] = useState('organizations');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const columns = TABLE_SCHEMA[activeTable] || [];

    const fetchRows = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            let query = supabase
                .from(activeTable)
                .select('*', { count: 'exact' })
                .order(columns.find(c => c.name === 'created_at') ? 'created_at' : 'id', { ascending: false })
                .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

            const { data, error: err, count } = await query;
            if (err) throw err;
            setRows(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            setError(err.message || 'Gagal mengambil data.');
            setRows([]);
        }
        setLoading(false);
    }, [activeTable, page, columns]);

    useEffect(() => {
        fetchRows();
    }, [fetchRows]);

    useEffect(() => {
        setPage(0);
        setSearch('');
    }, [activeTable]);

    const handleCreate = () => {
        setEditingRow(null);
        setModalOpen(true);
    };

    const handleEdit = (row) => {
        setEditingRow(row);
        setModalOpen(true);
    };

    const handleSave = async (payload) => {
        setSaving(true);
        try {
            if (editingRow) {
                const { error: err } = await supabase.from(activeTable).update(payload).eq('id', editingRow.id);
                if (err) throw err;
            } else {
                const { error: err } = await supabase.from(activeTable).insert(payload);
                if (err) throw err;
            }
            setModalOpen(false);
            fetchRows();
        } catch (err) {
            alert('Gagal menyimpan: ' + (err.message || 'unknown error'));
        }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Yakin ingin menghapus baris ini dari "${activeTable}"? Tindakan ini tidak bisa dibatalkan.`)) return;
        setDeletingId(id);
        try {
            const { error: err } = await supabase.from(activeTable).delete().eq('id', id);
            if (err) throw err;
            fetchRows();
        } catch (err) {
            alert('Gagal menghapus: ' + (err.message || 'unknown error'));
        }
        setDeletingId(null);
    };

    const displayColumns = columns.slice(0, 6); // biar tabel gak terlalu lebar, sisanya di modal edit
    const filteredRows = search
        ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
        : rows;

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    return (
        <div className="flex gap-6">
            {/* Sidebar daftar tabel, dikelompokkan */}
            <aside className="w-64 shrink-0 bg-white border border-gray-200 rounded-2xl p-4 h-fit sticky top-24 max-h-[75vh] overflow-y-auto">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Tabel Database</h3>
                {Object.entries(TABLE_GROUPS).map(([group, tables]) => (
                    <div key={group} className="mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase px-2 mb-1">{group}</p>
                        {tables.map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTable(t)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold mb-0.5 transition-colors ${activeTable === t ? 'bg-orange-50 text-isaji-orange' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                ))}
            </aside>

            {/* Panel data */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">{activeTable}</h2>
                        <p className="text-xs text-gray-500">{totalCount} total baris</p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Cari di halaman ini..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-isaji-orange/40"
                        />
                        <button onClick={handleCreate} className="bg-isaji-orange text-white text-xs font-black px-4 py-2 rounded-lg hover:opacity-90">
                            + Tambah Data
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg mb-4">{error}</div>
                )}

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-100">
                                    {displayColumns.map(col => (
                                        <th key={col.name} className="p-3 font-black whitespace-nowrap">{col.name}</th>
                                    ))}
                                    <th className="p-3 font-black text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={displayColumns.length + 1} className="p-6 text-center text-gray-400 text-xs">Memuat data...</td></tr>
                                ) : filteredRows.length === 0 ? (
                                    <tr><td colSpan={displayColumns.length + 1} className="p-6 text-center text-gray-400 text-xs">Tidak ada data.</td></tr>
                                ) : filteredRows.map(row => (
                                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        {displayColumns.map(col => (
                                            <td key={col.name} className="p-3 text-xs text-gray-700 max-w-[220px] truncate">
                                                {formatCell(row[col.name])}
                                            </td>
                                        ))}
                                        <td className="p-3 text-right whitespace-nowrap">
                                            <button onClick={() => handleEdit(row)} className="text-blue-600 text-xs font-bold mr-3 hover:underline">Edit</button>
                                            <button
                                                onClick={() => handleDelete(row.id)}
                                                disabled={deletingId === row.id}
                                                className="text-red-500 text-xs font-bold hover:underline disabled:opacity-40"
                                            >
                                                {deletingId === row.id ? 'Menghapus...' : 'Hapus'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-gray-400">Halaman {page + 1} dari {totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            disabled={page === 0}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={page + 1 >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40"
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <CrudFormModal
                    tableName={activeTable}
                    columns={columns}
                    initialData={editingRow}
                    saving={saving}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function formatCell(value) {
    if (value === null || value === undefined) return <span className="text-gray-300">null</span>;
    if (typeof value === 'boolean') return value ? '✅' : '❌';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

export default DatabaseTab;
