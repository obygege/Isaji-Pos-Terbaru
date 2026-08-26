import React, { useState, useEffect, useCallback, useMemo } from 'react';
import supabase from '../../../backend/lib/supabaseClient';
import { TABLE_SCHEMA } from '../dataSchema';
import CrudFormModal from '../components/CrudFormModal';

// Tab "Owner & Karyawan": menampilkan setiap tenant (organisasi) beserta pemilik
// dan seluruh karyawannya, dengan CRUD penuh (tambah/edit/hapus) tanpa buka Supabase.
export default function OwnersTab({ searchQuery }) {
    const [orgs, setOrgs] = useState([]);
    const [employeesByOrg, setEmployeesByOrg] = useState({});
    const [branchesByOrg, setBranchesByOrg] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState({});

    // Modal state
    const [modalType, setModalType] = useState(null); // 'org' | 'employee'
    const [editingRow, setEditingRow] = useState(null);
    const [activeOrgId, setActiveOrgId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const orgColumns = TABLE_SCHEMA['organizations'] || [];
    const employeeColumns = TABLE_SCHEMA['employees'] || [];

    const fetchAll = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [{ data: orgData, error: orgErr }, { data: empData, error: empErr }, { data: branchData, error: branchErr }] = await Promise.all([
                supabase.from('organizations').select('*').order('created_at', { ascending: false }),
                supabase.from('employees').select('*').order('full_name', { ascending: true }),
                supabase.from('branches').select('id, name, organization_id'),
            ]);
            if (orgErr) throw orgErr;
            if (empErr) throw empErr;
            if (branchErr) throw branchErr;

            const empMap = {};
            (empData || []).forEach(e => {
                if (!empMap[e.organization_id]) empMap[e.organization_id] = [];
                empMap[e.organization_id].push(e);
            });

            const branchMap = {};
            (branchData || []).forEach(b => {
                if (!branchMap[b.organization_id]) branchMap[b.organization_id] = [];
                branchMap[b.organization_id].push(b);
            });

            setOrgs(orgData || []);
            setEmployeesByOrg(empMap);
            setBranchesByOrg(branchMap);
        } catch (err) {
            setError(err.message || 'Gagal mengambil data.');
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredOrgs = useMemo(() => {
        const q = (searchQuery || '').toLowerCase();
        if (!q) return orgs;
        return orgs.filter(o => {
            const inOrg = (o.name || '').toLowerCase().includes(q) || (o.subdomain || '').toLowerCase().includes(q) || (o.owner_id || '').toLowerCase().includes(q);
            const inEmp = (employeesByOrg[o.id] || []).some(e => (e.full_name || '').toLowerCase().includes(q) || (e.position || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q));
            return inOrg || inEmp;
        });
    }, [orgs, employeesByOrg, searchQuery]);

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    // ---- Organization CRUD ----
    const openCreateOrg = () => { setModalType('org'); setEditingRow(null); };
    const openEditOrg = (org) => { setModalType('org'); setEditingRow(org); };

    const deleteOrg = async (org) => {
        const empCount = (employeesByOrg[org.id] || []).length;
        const confirmMsg = empCount > 0
            ? `Tenant "${org.name}" masih punya ${empCount} karyawan. Hapus tetap dilanjutkan jika tidak ada relasi terkunci di database. Lanjutkan hapus?`
            : `Yakin ingin menghapus tenant "${org.name}"? Tindakan ini tidak bisa dibatalkan.`;
        if (!window.confirm(confirmMsg)) return;
        setBusyId(org.id);
        try {
            const { error: err } = await supabase.from('organizations').delete().eq('id', org.id);
            if (err) throw err;
            fetchAll();
        } catch (err) {
            alert('Gagal menghapus tenant: ' + (err.message || 'unknown error'));
        }
        setBusyId(null);
    };

    const toggleOrgStatus = async (org) => {
        setBusyId(org.id);
        try {
            await supabase.from('organizations').update({ is_active: !org.is_active }).eq('id', org.id);
            fetchAll();
        } catch (err) {
            alert('Gagal mengubah status: ' + (err.message || 'unknown error'));
        }
        setBusyId(null);
    };

    // ---- Employee CRUD ----
    const openCreateEmployee = (orgId) => { setModalType('employee'); setEditingRow(null); setActiveOrgId(orgId); };
    const openEditEmployee = (emp) => { setModalType('employee'); setEditingRow(emp); setActiveOrgId(emp.organization_id); };

    const deleteEmployee = async (emp) => {
        if (!window.confirm(`Yakin ingin menghapus karyawan "${emp.full_name}"?`)) return;
        setBusyId(emp.id);
        try {
            const { error: err } = await supabase.from('employees').delete().eq('id', emp.id);
            if (err) throw err;
            fetchAll();
        } catch (err) {
            alert('Gagal menghapus karyawan: ' + (err.message || 'unknown error'));
        }
        setBusyId(null);
    };

    const toggleEmployeeStatus = async (emp) => {
        setBusyId(emp.id);
        try {
            await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id);
            fetchAll();
        } catch (err) {
            alert('Gagal mengubah status karyawan: ' + (err.message || 'unknown error'));
        }
        setBusyId(null);
    };

    const handleModalSave = async (payload) => {
        setSaving(true);
        try {
            if (modalType === 'org') {
                if (editingRow) {
                    const { error: err } = await supabase.from('organizations').update(payload).eq('id', editingRow.id);
                    if (err) throw err;
                } else {
                    const { error: err } = await supabase.from('organizations').insert(payload);
                    if (err) throw err;
                }
            } else if (modalType === 'employee') {
                const finalPayload = editingRow ? payload : { ...payload, organization_id: activeOrgId || payload.organization_id };
                if (editingRow) {
                    const { error: err } = await supabase.from('employees').update(finalPayload).eq('id', editingRow.id);
                    if (err) throw err;
                } else {
                    const { error: err } = await supabase.from('employees').insert(finalPayload);
                    if (err) throw err;
                }
            }
            setModalType(null);
            setEditingRow(null);
            setActiveOrgId(null);
            fetchAll();
        } catch (err) {
            alert('Gagal menyimpan: ' + (err.message || 'unknown error'));
        }
        setSaving(false);
    };

    // Untuk form tambah karyawan dari tombol per-tenant, kunci organization_id ke tenant tsb
    const employeeColumnsForModal = useMemo(() => {
        if (!activeOrgId || editingRow) return employeeColumns;
        return employeeColumns.map(c => c.name === 'organization_id' ? { ...c, inputType: 'readonly' } : c);
    }, [employeeColumns, activeOrgId, editingRow]);

    if (loading) return <div className="text-isaji-orange font-bold text-sm">Memuat data owner & karyawan...</div>;

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-lg font-black text-gray-900">Data Owner & Karyawan</h2>
                    <p className="text-xs text-gray-500">{filteredOrgs.length} tenant · {Object.values(employeesByOrg).reduce((a, e) => a + e.length, 0)} total karyawan</p>
                </div>
                <button onClick={openCreateOrg} className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-gray-800">
                    + Tambah Owner / Tenant
                </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg mb-4">{error}</div>}

            <div className="space-y-4">
                {filteredOrgs.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-xs text-gray-400">Tidak ada data ditemukan.</div>
                )}

                {filteredOrgs.map(org => {
                    const emps = employeesByOrg[org.id] || [];
                    const branches = branchesByOrg[org.id] || [];
                    const isOpen = !!expanded[org.id];
                    return (
                        <div key={org.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4 flex items-center justify-between gap-4 bg-gray-50/50">
                                <button onClick={() => toggleExpand(org.id)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                                    <span className={`transition-transform text-gray-400 text-xs ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                    <div className="min-w-0">
                                        <p className="font-black text-gray-900 text-sm truncate">{org.name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono truncate">Owner ID: {org.owner_id || '—'} · {org.subdomain}.isajipos.com</p>
                                    </div>
                                </button>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600">{branches.length} cabang</span>
                                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-600">{emps.length} karyawan</span>
                                    {org.is_active ? (
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-600">Aktif</span>
                                    ) : (
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-600">Nonaktif</span>
                                    )}
                                    <button onClick={() => toggleOrgStatus(org)} disabled={busyId === org.id} className="text-[10px] font-bold px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-40">
                                        {org.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                    </button>
                                    <button onClick={() => openEditOrg(org)} className="text-[10px] font-bold px-3 py-1.5 border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50">
                                        Edit
                                    </button>
                                    <button onClick={() => deleteOrg(org)} disabled={busyId === org.id} className="text-[10px] font-bold px-3 py-1.5 border border-red-200 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-40">
                                        Hapus
                                    </button>
                                </div>
                            </div>

                            {isOpen && (
                                <div className="border-t border-gray-100">
                                    <div className="px-6 py-3 flex justify-between items-center bg-white">
                                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Karyawan</h4>
                                        <button onClick={() => openCreateEmployee(org.id)} className="text-[10px] font-bold px-3 py-1.5 bg-isaji-orange text-white rounded-md hover:opacity-90">
                                            + Tambah Karyawan
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-widest border-y border-gray-100">
                                                    <th className="p-3 font-black">Nama</th>
                                                    <th className="p-3 font-black">Posisi</th>
                                                    <th className="p-3 font-black">Tipe</th>
                                                    <th className="p-3 font-black">Cabang</th>
                                                    <th className="p-3 font-black">Kontak</th>
                                                    <th className="p-3 font-black">Gaji Pokok</th>
                                                    <th className="p-3 font-black">Status</th>
                                                    <th className="p-3 font-black text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs divide-y divide-gray-50">
                                                {emps.length === 0 ? (
                                                    <tr><td colSpan={8} className="p-5 text-center text-gray-400">Belum ada karyawan untuk tenant ini.</td></tr>
                                                ) : emps.map(emp => {
                                                    const branchName = branches.find(b => b.id === emp.branch_id)?.name;
                                                    return (
                                                        <tr key={emp.id} className="hover:bg-gray-50/50">
                                                            <td className="p-3 font-bold text-gray-900">{emp.full_name}</td>
                                                            <td className="p-3 text-gray-600">{emp.position || '—'}</td>
                                                            <td className="p-3 text-gray-600 capitalize">{(emp.employment_type || '').replace('_', ' ') || '—'}</td>
                                                            <td className="p-3 text-gray-600">{branchName || '—'}</td>
                                                            <td className="p-3 text-gray-600">
                                                                <div>{emp.phone || '—'}</div>
                                                                <div className="text-gray-400">{emp.email || ''}</div>
                                                            </td>
                                                            <td className="p-3 text-gray-600">{emp.base_salary ? `Rp ${Number(emp.base_salary).toLocaleString('id-ID')}` : '—'}</td>
                                                            <td className="p-3">
                                                                {emp.is_active ? (
                                                                    <span className="text-green-600 font-bold">Aktif</span>
                                                                ) : (
                                                                    <span className="text-red-500 font-bold">Nonaktif</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-right whitespace-nowrap space-x-2">
                                                                <button onClick={() => toggleEmployeeStatus(emp)} disabled={busyId === emp.id} className="font-bold text-gray-500 hover:underline disabled:opacity-40">
                                                                    {emp.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                                </button>
                                                                <button onClick={() => openEditEmployee(emp)} className="font-bold text-blue-600 hover:underline">Edit</button>
                                                                <button onClick={() => deleteEmployee(emp)} disabled={busyId === emp.id} className="font-bold text-red-500 hover:underline disabled:opacity-40">Hapus</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {modalType === 'org' && (
                <CrudFormModal
                    tableName="organizations (owner/tenant)"
                    columns={orgColumns}
                    initialData={editingRow}
                    saving={saving}
                    onClose={() => { setModalType(null); setEditingRow(null); }}
                    onSave={handleModalSave}
                />
            )}

            {modalType === 'employee' && (
                <CrudFormModal
                    tableName="employees"
                    columns={employeeColumnsForModal}
                    initialData={editingRow}
                    saving={saving}
                    onClose={() => { setModalType(null); setEditingRow(null); setActiveOrgId(null); }}
                    onSave={handleModalSave}
                />
            )}
        </div>
    );
}