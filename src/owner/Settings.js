import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

function Settings({ orgData }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    const [orgForm, setOrgForm] = useState({
        name: '', subdomain: '', logo_url: '', favicon_url: '', tagline: '', description: '', theme_color: '#000000',
    });
    const [profileForm, setProfileForm] = useState({
        address: '', phone: '', email: '', instagram_url: '', facebook_url: '', tiktok_url: '', whatsapp_number: '', banner_url: '', about_html: '',
    });
    const [taxForm, setTaxForm] = useState({
        scheme: 'none', custom_rate_percent: 0, apply_to_selling_price: true, npwp: '', is_pkp: false, notes: '',
    });
    const [profileExists, setProfileExists] = useState(false);
    const [taxExists, setTaxExists] = useState(false);

    const fetchData = useCallback(async () => {
        if (!orgData?.id) return;
        setIsLoading(true);
        try {
            const [orgRes, profileRes, taxRes] = await Promise.all([
                supabase.from('organizations').select('*').eq('id', orgData.id).maybeSingle(),
                supabase.from('organization_profiles').select('*').eq('organization_id', orgData.id).maybeSingle(),
                supabase.from('tax_settings').select('*').eq('organization_id', orgData.id).maybeSingle(),
            ]);

            if (orgRes.data) {
                setOrgForm({
                    name: orgRes.data.name || '',
                    subdomain: orgRes.data.subdomain || '',
                    logo_url: orgRes.data.logo_url || '',
                    favicon_url: orgRes.data.favicon_url || '',
                    tagline: orgRes.data.tagline || '',
                    description: orgRes.data.description || '',
                    theme_color: orgRes.data.theme_color || '#000000',
                });
            }

            if (profileRes.data) {
                setProfileExists(true);
                setProfileForm({
                    address: profileRes.data.address || '',
                    phone: profileRes.data.phone || '',
                    email: profileRes.data.email || '',
                    instagram_url: profileRes.data.instagram_url || '',
                    facebook_url: profileRes.data.facebook_url || '',
                    tiktok_url: profileRes.data.tiktok_url || '',
                    whatsapp_number: profileRes.data.whatsapp_number || '',
                    banner_url: profileRes.data.banner_url || '',
                    about_html: profileRes.data.about_html || '',
                });
            }

            if (taxRes.data) {
                setTaxExists(true);
                setTaxForm({
                    scheme: taxRes.data.scheme || 'none',
                    custom_rate_percent: taxRes.data.custom_rate_percent || 0,
                    apply_to_selling_price: taxRes.data.apply_to_selling_price ?? true,
                    npwp: taxRes.data.npwp || '',
                    is_pkp: taxRes.data.is_pkp || false,
                    notes: taxRes.data.notes || '',
                });
            }
        } catch (err) {
            console.error('Gagal memuat pengaturan:', err.message);
        } finally {
            setIsLoading(false);
        }
    }, [orgData]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOrgChange = (e) => setOrgForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleProfileChange = (e) => setProfileForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleTaxChange = (e) => {
        const { name, type, value, checked } = e.target;
        setTaxForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const saveOrgForm = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase.from('organizations').update(orgForm).eq('id', orgData.id);
            if (error) throw error;
            alert('Profil toko berhasil disimpan.');
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveProfileForm = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (profileExists) {
                const { error } = await supabase.from('organization_profiles').update(profileForm).eq('organization_id', orgData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('organization_profiles').insert([{ organization_id: orgData.id, ...profileForm }]);
                if (error) throw error;
                setProfileExists(true);
            }
            alert('Kontak & sosial media berhasil disimpan.');
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveTaxForm = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = { ...taxForm, custom_rate_percent: parseFloat(taxForm.custom_rate_percent) || 0 };
            if (taxExists) {
                const { error } = await supabase.from('tax_settings').update(payload).eq('organization_id', orgData.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('tax_settings').insert([{ organization_id: orgData.id, ...payload }]);
                if (error) throw error;
                setTaxExists(true);
            }
            alert('Pengaturan pajak berhasil disimpan.');
        } catch (err) {
            alert('Gagal menyimpan: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1";
    const labelClass = "text-xs font-bold text-gray-500 uppercase";

    if (isLoading) {
        return <div className="py-16 text-center text-gray-400 text-sm">Memuat pengaturan...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-2">
                <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'general' ? 'bg-isaji-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Profil Toko</button>
                <button onClick={() => setActiveTab('contact')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'contact' ? 'bg-isaji-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Kontak & Sosial Media</button>
                <button onClick={() => setActiveTab('tax')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'tax' ? 'bg-isaji-navy text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Pajak</button>
            </div>

            {activeTab === 'general' && (
                <form onSubmit={saveOrgForm} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
                    <h3 className="font-black text-gray-900">Profil Toko</h3>
                    <div>
                        <label className={labelClass}>Nama Bisnis</label>
                        <input name="name" value={orgForm.name} onChange={handleOrgChange} required className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Subdomain</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input name="subdomain" value={orgForm.subdomain} onChange={handleOrgChange} required className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                            <span className="text-xs text-gray-400">.isaji.id</span>
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Tagline</label>
                        <input name="tagline" value={orgForm.tagline} onChange={handleOrgChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Deskripsi</label>
                        <textarea name="description" value={orgForm.description} onChange={handleOrgChange} rows={3} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>URL Logo</label>
                            <input name="logo_url" value={orgForm.logo_url} onChange={handleOrgChange} className={inputClass} placeholder="https://..." />
                        </div>
                        <div>
                            <label className={labelClass}>URL Favicon</label>
                            <input name="favicon_url" value={orgForm.favicon_url} onChange={handleOrgChange} className={inputClass} placeholder="https://..." />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Warna Tema</label>
                        <input type="color" name="theme_color" value={orgForm.theme_color} onChange={handleOrgChange} className="mt-1 h-10 w-20 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-isaji-navy rounded-lg hover:bg-blue-900 disabled:opacity-50">
                            {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'contact' && (
                <form onSubmit={saveProfileForm} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
                    <h3 className="font-black text-gray-900">Kontak & Sosial Media</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Telepon</label>
                            <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} className={inputClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Alamat</label>
                        <textarea name="address" value={profileForm.address} onChange={handleProfileChange} rows={2} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Nomor WhatsApp</label>
                        <input name="whatsapp_number" value={profileForm.whatsapp_number} onChange={handleProfileChange} className={inputClass} placeholder="628xxxxxxxxxx" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelClass}>Instagram</label>
                            <input name="instagram_url" value={profileForm.instagram_url} onChange={handleProfileChange} className={inputClass} placeholder="https://instagram.com/..." />
                        </div>
                        <div>
                            <label className={labelClass}>Facebook</label>
                            <input name="facebook_url" value={profileForm.facebook_url} onChange={handleProfileChange} className={inputClass} placeholder="https://facebook.com/..." />
                        </div>
                        <div>
                            <label className={labelClass}>TikTok</label>
                            <input name="tiktok_url" value={profileForm.tiktok_url} onChange={handleProfileChange} className={inputClass} placeholder="https://tiktok.com/@..." />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>URL Banner</label>
                        <input name="banner_url" value={profileForm.banner_url} onChange={handleProfileChange} className={inputClass} placeholder="https://..." />
                    </div>
                    <div>
                        <label className={labelClass}>Tentang Kami</label>
                        <textarea name="about_html" value={profileForm.about_html} onChange={handleProfileChange} rows={4} className={inputClass} />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-isaji-navy rounded-lg hover:bg-blue-900 disabled:opacity-50">
                            {isSaving ? 'Menyimpan...' : 'Simpan Kontak'}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'tax' && (
                <form onSubmit={saveTaxForm} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
                    <h3 className="font-black text-gray-900">Pengaturan Pajak Organisasi</h3>
                    <div>
                        <label className={labelClass}>Skema Pajak</label>
                        <select name="scheme" value={taxForm.scheme} onChange={handleTaxChange} className={inputClass}>
                            <option value="none">Tidak Ada</option>
                            <option value="pph_final">PPh Final</option>
                            <option value="pb1">PB1 (Pajak Restoran/Daerah)</option>
                            <option value="ppn">PPN</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Tarif Kustom (%)</label>
                        <input type="number" step="0.01" name="custom_rate_percent" value={taxForm.custom_rate_percent} onChange={handleTaxChange} className={inputClass} />
                    </div>
                    <div>
                        <label className={labelClass}>NPWP</label>
                        <input name="npwp" value={taxForm.npwp} onChange={handleTaxChange} className={inputClass} />
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" name="apply_to_selling_price" checked={taxForm.apply_to_selling_price} onChange={handleTaxChange} />
                        Terapkan pajak ke harga jual
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" name="is_pkp" checked={taxForm.is_pkp} onChange={handleTaxChange} />
                        Terdaftar sebagai Pengusaha Kena Pajak (PKP)
                    </label>
                    <div>
                        <label className={labelClass}>Catatan</label>
                        <textarea name="notes" value={taxForm.notes} onChange={handleTaxChange} rows={2} className={inputClass} />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSaving} className="px-5 py-2 text-sm font-bold text-white bg-isaji-navy rounded-lg hover:bg-blue-900 disabled:opacity-50">
                            {isSaving ? 'Menyimpan...' : 'Simpan Pajak'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default Settings;