Dokumentasi Pengembangan ISAJI POS Platform
Tanggal: 23 Juli 2026

Fokus Pengembangan Hari Ini: Arsitektur Modular UI/UX, Manajemen Cabang (Branches) dengan Integrasi Database Supabase, serta Konfigurasi Skema Pajak & Branding Perusahaan.

1. Ringkasan Progres Hari Ini
Hari ini kita berhasil merombak total tampilan antarmuka (UI/UX) platform SaaS POS ISAJI menjadi gaya modern, bersih (clean light mode), dan profesional ala dashboard SaaS premium (gaya Majoo). Selain itu, kita sukses memisahkan struktur kode menjadi arsitektur modular yang rapi dan menghubungkan modul utama (Manajemen Cabang) secara penuh ke database Supabase.

2. Struktur Direktori & File Baru
Untuk menjaga kerapian kode dan mempermudah pemeliharaan (maintainability), halaman owner telah dipecah menjadi komponen-komponen independen di dalam folder src/owner/:

src/owner/Dashboard.js: File pusat tata letak (layout) utama yang mengatur router halaman, status sesi pengguna, serta menyusun komponen Sidebar, Header, Konten Utama, dan Footer.

src/owner/Sidebar.js: Komponen navigasi menu sebelah kiri dengan indikator aktif yang dinamis dan ikon modern.

src/owner/Header.js: Bilah atas yang menampilkan judul halaman otomatis sesuai menu aktif, informasi profil owner, serta tombol keluar (sign out).

src/owner/Footer.js: Komponen kaki halaman berstandar hak cipta dan informasi versi aplikasi.

src/owner/Branches.js: Komponen halaman fungsional penuh untuk manajemen cabang/outlet, lengkap dengan integrasi CRUD ke Supabase.

3. Skema Database & Penyesuaian Backend (Supabase)
Tabel branches yang digunakan telah disesuaikan dengan struktur kolom database relasional yang komperehensif:

Kolom Tabel branches:
id (UUID, Primary Key, Default: gen_random_uuid())

organization_id (UUID, Foreign Key)

name (TEXT, Nama Cabang/Outlet)

code (TEXT, Kode Unik Cabang)

address (TEXT, Alamat Lengkap)

city (TEXT, Kota/Kabupaten)

province (TEXT, Provinsi)

phone (TEXT, Nomor Telepon)

tax_mode (TEXT, Skema Pajak: bebas, pph_05, pb1_10, ppn_11)

logo_url (TEXT, Tautan URL Logo Perusahaan/Cabang)

is_active (BOOLEAN, Status operasional cabang)

created_at & updated_at (Timestamp dengan zona waktu)

4. Catatan Integrasi & Query Database Hari Ini
Selama proses integrasi Supabase hari ini, beberapa penyesuaian akses dan constraint database telah diselesaikan melalui SQL Editor:

Penambahan Kolom Baru (Logo & Pajak):

SQL
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS tax_mode TEXT DEFAULT 'pb1_10';
Penyesuaian Akses & Keamanan Pengembangan:

Row Level Security (RLS) pada tabel utama dimatikan sementara untuk mempercepat proses development.

Pembatasan Foreign Key Constraint pada organization_id disesuaikan agar proses insert data cabang oleh akun owner berjalan lancar tanpa hambatan relasi tabel organisasi turunan.

5. Rencana Tindak Lanjut (Next Steps) Besok Malam
Melanjutkan pengembangan modul berikutnya (Manajemen Tim/Karyawan atau Laporan Keuangan).

Implementasi penyimpanan berkas (Supabase Storage Bucket) untuk fitur unggah logo fisik secara langsung."# Isaji-Pos-Terbaru"  
"# Isaji-Pos-Terbaru"  


Login Super Admin Akses : 
/isaji-command-center