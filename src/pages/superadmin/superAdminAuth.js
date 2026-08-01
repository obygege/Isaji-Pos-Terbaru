import supabase from '../../backend/lib/supabaseClient';

// Mengecek apakah user Supabase yang sedang login terdaftar sebagai superadmin.
// Bergantung pada tabel `superadmins` (lihat superadmins_migration.sql) yang
// hanya bisa dibaca oleh user itu sendiri (RLS: user_id = auth.uid()).
export async function getVerifiedSuperAdminSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
        .from('superadmins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (error || !data) return null;
    return session;
}

export async function superAdminSignOut() {
    await supabase.auth.signOut();
}
