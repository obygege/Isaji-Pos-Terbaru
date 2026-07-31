import { createClient } from "@supabase/supabase-js";

// PERBAIKAN: Tambahkan kata "export" dan ubah nama variabelnya agar cocok
export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
export const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error("REACT_APP_SUPABASE_URL belum diisi");
}

if (!supabaseKey) {
    throw new Error("REACT_APP_SUPABASE_ANON_KEY belum diisi");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
    },
});

export default supabase;