import supabase from './supabaseClient';

// Mendeteksi role sebenarnya dari sebuah user_id, dengan mengecek ke tabel-tabel
// sumber kebenaran: superadmins, organizations (owner), employees (staff/manajer).
// Dipakai di SETIAP halaman login supaya satu akun tidak bisa dipakai lintas role.
export async function detectUserRole(userId) {
    const [superadminRes, ownerRes, employeeRes] = await Promise.all([
        supabase.from('superadmins').select('user_id').eq('user_id', userId).maybeSingle(),
        supabase.from('organizations').select('id').eq('owner_id', userId).limit(1),
        supabase.from('employees').select('position').eq('user_id', userId).limit(1),
    ]);

    if (superadminRes.data) return { role: 'superadmin' };
    if (ownerRes.data && ownerRes.data.length > 0) return { role: 'owner' };
    if (employeeRes.data && employeeRes.data.length > 0) {
        const position = employeeRes.data[0].position;
        return { role: position === 'manajer' ? 'manager' : 'employee' };
    }
    return { role: 'customer' };
}
