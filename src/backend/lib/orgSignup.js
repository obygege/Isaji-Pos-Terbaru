import supabase from './supabaseClient';

function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'cafe';
}

/**
 * Bikin baris `organizations` baru untuk owner yang baru daftar.
 * Dipakai untuk signup email/password MAUPUN Google OAuth -- sebelumnya
 * baris ini TIDAK PERNAH dibuat sama sekali di kedua alur, sehingga
 * detectUserRole() tidak pernah menemukan mereka sebagai owner.
 *
 * subdomain harus unik, jadi kalau bentrok kita coba ulang dengan suffix acak.
 */
export async function createOrganizationForUser({ userId, orgName }) {
    const baseSlug = slugify(orgName);

    for (let attempt = 0; attempt < 5; attempt++) {
        const suffix = attempt === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
        const subdomain = `${baseSlug}${suffix}`;

        const { data, error } = await supabase
            .from('organizations')
            .insert({ name: orgName, subdomain, owner_id: userId })
            .select()
            .single();

        if (!error) return data;

        // 23505 = unique_violation (subdomain bentrok) -> coba lagi dengan suffix baru
        if (error.code !== '23505') throw error;
    }

    throw new Error('Gagal membuat organisasi: subdomain terus bentrok, coba nama lain.');
}
