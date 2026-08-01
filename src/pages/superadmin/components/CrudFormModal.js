import React, { useState } from 'react';

// Modal form generik: merender field sesuai tipe kolom dari dataSchema.js
// Dipakai untuk Create & Edit di semua tabel (Database Explorer).
function CrudFormModal({ tableName, columns, initialData, onClose, onSave, saving }) {
    const buildInitialState = () => {
        const state = {};
        columns.forEach(col => {
            if (col.inputType === 'readonly') return;
            if (initialData && initialData[col.name] !== undefined) {
                state[col.name] = col.inputType === 'json'
                    ? JSON.stringify(initialData[col.name], null, 2)
                    : initialData[col.name];
            } else {
                state[col.name] = col.inputType === 'boolean' ? false : '';
            }
        });
        return state;
    };

    const [form, setForm] = useState(buildInitialState);
    const [error, setError] = useState('');

    const handleChange = (name, value) => {
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const payload = {};
        try {
            columns.forEach(col => {
                if (col.inputType === 'readonly') return;
                let val = form[col.name];

                // Field kosong & tidak wajib -> jangan dikirim (biar pakai default DB)
                if (val === '' || val === null || val === undefined) {
                    if (col.required) throw new Error(`Kolom "${col.name}" wajib diisi.`);
                    return;
                }

                if (col.inputType === 'json') {
                    payload[col.name] = JSON.parse(val);
                } else if (col.inputType === 'integer') {
                    payload[col.name] = parseInt(val, 10);
                } else if (col.inputType === 'number') {
                    payload[col.name] = parseFloat(val);
                } else if (col.inputType === 'boolean') {
                    payload[col.name] = !!val;
                } else {
                    payload[col.name] = val;
                }
            });
        } catch (err) {
            setError(err.message || 'Data tidak valid.');
            return;
        }
        onSave(payload);
    };

    const renderField = (col) => {
        if (col.inputType === 'readonly') return null;

        const commonProps = {
            id: col.name,
            className: "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-isaji-orange/40",
        };

        switch (col.inputType) {
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        checked={!!form[col.name]}
                        onChange={e => handleChange(col.name, e.target.checked)}
                        className="w-5 h-5 accent-isaji-orange"
                    />
                );
            case 'integer':
            case 'number':
                return (
                    <input
                        {...commonProps}
                        type="number"
                        step={col.inputType === 'number' ? 'any' : '1'}
                        value={form[col.name]}
                        onChange={e => handleChange(col.name, e.target.value)}
                    />
                );
            case 'date':
                return (
                    <input {...commonProps} type="date" value={form[col.name]} onChange={e => handleChange(col.name, e.target.value)} />
                );
            case 'datetime':
                return (
                    <input {...commonProps} type="datetime-local" value={form[col.name]} onChange={e => handleChange(col.name, e.target.value)} />
                );
            case 'time':
                return (
                    <input {...commonProps} type="time" value={form[col.name]} onChange={e => handleChange(col.name, e.target.value)} />
                );
            case 'json':
                return (
                    <textarea
                        {...commonProps}
                        rows={4}
                        placeholder='{"key": "value"}'
                        value={form[col.name]}
                        onChange={e => handleChange(col.name, e.target.value)}
                    />
                );
            case 'uuid':
                return (
                    <input {...commonProps} type="text" placeholder="uuid..." value={form[col.name]} onChange={e => handleChange(col.name, e.target.value)} />
                );
            default:
                return (
                    <input {...commonProps} type="text" value={form[col.name]} onChange={e => handleChange(col.name, e.target.value)} />
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-black text-gray-900">
                        {initialData ? 'Edit' : 'Tambah'} Data — <span className="text-isaji-orange">{tableName}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg">{error}</div>
                    )}
                    {columns.filter(c => c.inputType !== 'readonly').map(col => (
                        <div key={col.name} className={col.inputType === 'boolean' ? 'flex items-center gap-3' : ''}>
                            <label htmlFor={col.name} className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wide">
                                {col.name}{col.required && <span className="text-red-500"> *</span>}
                            </label>
                            {renderField(col)}
                        </div>
                    ))}
                </form>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">
                        Batal
                    </button>
                    <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-isaji-orange rounded-lg hover:opacity-90 disabled:opacity-50">
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CrudFormModal;
