import React, { useState, useEffect, useRef } from 'react';
import supabase from './backend/lib/supabaseClient';
import { detectUserRole } from './backend/lib/roleDetection';
import { createOrganizationForUser } from './backend/lib/orgSignup';

// Import Halaman Utama (Compro/Pegawai)
import Home from './Home';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';

// Import Halaman Folder Khusus Owner & Manager
import Dashboard from './owner/Dashboard';
import ManagerDashboard from './manager/Dashboard';

// Import Halaman Khusus Pelanggan (Terpisah Total)
import SelfOrderPage from './customer/SelfOrderPage';
import CustomerLoginPage from './pages/customer/CustomerLoginPage';
import CustomerRegisterPage from './pages/customer/CustomerRegisterPage';

// Import Halaman Kiosk Absensi Karyawan (Terpisah Total, PIN + GPS)
import AttendanceKiosk from './employee/AttendanceKiosk';

// Import Halaman Khusus Super Admin (Command Center)
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

function App() {
  // Cek jalur URL dari browser (Routing Manual)
  const isSelfOrderRoute = window.location.pathname.includes('/self-order');
  const isCustomerLoginRoute = window.location.pathname.includes('/customer-login');
  const isCustomerRegisterRoute = window.location.pathname.includes('/customer-register');
  const isAttendanceKioskRoute = window.location.pathname.includes('/absensi');

  // Deteksi jalur Super Admin
  const isSuperAdminLoginRoute = window.location.pathname.includes('/isaji-command-center');
  const isSuperAdminDashboardRoute = window.location.pathname.includes('/superadmin/dashboard');

  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('isajiActivePage') || 'home';
  });
  const [authError, setAuthError] = useState(null);

  // PERBAIKAN: kunci anti-dobel-eksekusi. supabase.auth.getSession() saat mount
  // DAN supabase.auth.onAuthStateChange('SIGNED_IN') bisa sama-sama terpicu untuk
  // sesi yang SAMA persis setelah redirect Google selesai. Tanpa kunci ini,
  // panggilan kedua bisa "menabrak" panggilan pertama yang masih proses membuat
  // organization (async, belum commit ke DB) -> dianggap bukan owner -> auto sign-out
  // dengan pesan "Akun Google ini belum terdaftar sebagai Owner..." padahal datanya benar.
  const isProcessingAuthRef = useRef(false);

  // Simpan halaman terakhir ke LocalStorage (Hanya untuk Dashboard/Owner)
  useEffect(() => {
    // Jangan simpan state jika sedang di halaman Pelanggan atau Super Admin
    if (!isSelfOrderRoute && !isCustomerLoginRoute && !isCustomerRegisterRoute && !isAttendanceKioskRoute && !isSuperAdminLoginRoute && !isSuperAdminDashboardRoute) {
      localStorage.setItem('isajiActivePage', activePage);
    }
  }, [activePage, isSelfOrderRoute, isCustomerLoginRoute, isCustomerRegisterRoute, isAttendanceKioskRoute, isSuperAdminLoginRoute, isSuperAdminDashboardRoute]);

  useEffect(() => {
    // PENTING: Jika di jalur pelanggan, kiosk absensi, atau Super Admin, ABAIKAN logika Auth Supabase milik pegawai
    if (isSelfOrderRoute || isCustomerLoginRoute || isCustomerRegisterRoute || isAttendanceKioskRoute || isSuperAdminLoginRoute || isSuperAdminDashboardRoute) return;

    // Pengecekan sesi otomatis saat aplikasi dimuat ulang (Khusus Pegawai/Owner)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session && (activePage === 'login' || activePage === 'register' || activePage === 'home')) {
        await determineUserRoleAndNavigate(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await determineUserRoleAndNavigate(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setActivePage('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [activePage, isSelfOrderRoute, isCustomerLoginRoute, isCustomerRegisterRoute, isAttendanceKioskRoute, isSuperAdminLoginRoute, isSuperAdminDashboardRoute]);

  // Fungsi pintar untuk mendeteksi apakah user adalah Owner atau Manajer
  // PERBAIKAN: dibungkus kunci isProcessingAuthRef supaya tidak bisa jalan dobel bersamaan.
  const determineUserRoleAndNavigate = async (userId) => {
    if (isProcessingAuthRef.current) return; // sudah ada proses lain yang jalan, abaikan
    isProcessingAuthRef.current = true;
    try {
      await determineUserRoleAndNavigateInner(userId);
    } finally {
      isProcessingAuthRef.current = false;
    }
  };

  const determineUserRoleAndNavigateInner = async (userId) => {
    // Kalau ini baru saja daftar lewat tombol Google di halaman Register,
    // nama organisasinya dititip di sessionStorage sebelum redirect ke Google
    // (form React reset total setelah balik dari redirect). Bikin org-nya di sini.
    const pendingOrgName = sessionStorage.getItem('pendingOrgName');
    if (pendingOrgName) {
      // Hapus duluan supaya event auth yang nembak dobel (mis. token refresh)
      // tidak bikin organization dua kali.
      sessionStorage.removeItem('pendingOrgName');
      sessionStorage.removeItem('pendingPicName');
      try {
        await createOrganizationForUser({ userId, orgName: pendingOrgName });
      } catch (err) {
        await supabase.auth.signOut();
        setAuthError('Gagal menyelesaikan pendaftaran Google: ' + err.message);
        setActivePage('login');
        return;
      }
    }

    const { role } = await detectUserRole(userId);

    if (role === 'owner') {
      setAuthError(null);
      setActivePage('dashboard'); // Dashboard Owner
      return;
    }
    if (role === 'manager') {
      setAuthError(null);
      setActivePage('manager-dashboard'); // Dashboard Manajer
      return;
    }

    // Bukan Owner/Manajer (superadmin, karyawan biasa, atau customer baru
    // yang login Google tanpa pernah daftar sebagai Owner) -> tolak dengan
    // pesan JELAS, jangan diam-diam sign-out tanpa keterangan.
    await supabase.auth.signOut();
    if (role === 'superadmin') {
      setAuthError('Akun ini adalah akun Super Admin. Silakan login lewat Command Center.');
    } else if (role === 'employee') {
      setAuthError('Akun ini terdaftar sebagai karyawan biasa, bukan Owner/Manajer.');
    } else {
      setAuthError('Akun Google ini belum terdaftar sebagai Owner. Silakan daftar dulu lewat halaman Daftar.');
    }
    setActivePage('login');
  };

  // ==========================================
  // 1. JALUR KHUSUS SUPER ADMIN (ISOLASI TINGKAT TINGGI)
  // ==========================================
  if (isSuperAdminLoginRoute) {
    return <SuperAdminLogin />;
  }

  if (isSuperAdminDashboardRoute) {
    return <SuperAdminDashboard />;
  }

  // ==========================================
  // 2. JALUR KHUSUS PELANGGAN (ISOLASI DARI POS ADMIN)
  // ==========================================
  if (isSelfOrderRoute) {
    return <SelfOrderPage />;
  }

  if (isCustomerLoginRoute) {
    return <CustomerLoginPage />;
  }

  if (isCustomerRegisterRoute) {
    return <CustomerRegisterPage />;
  }

  if (isAttendanceKioskRoute) {
    return <AttendanceKiosk />;
  }

  // ==========================================
  // 3. LOGIKA ROUTING UTAMA APLIKASI (OWNER/MANAGER)
  // ==========================================
  if (activePage === 'home') return <Home onNavigate={setActivePage} />;
  if (activePage === 'login') return <Login onNavigate={setActivePage} authError={authError} clearAuthError={() => setAuthError(null)} />;
  if (activePage === 'register') return <Register onNavigate={setActivePage} />;
  if (activePage === 'forgot_password') return <ForgotPassword onNavigate={setActivePage} />;

  // FOLDER OWNER & MANAGER
  if (activePage === 'dashboard') return <Dashboard onNavigate={setActivePage} />;
  if (activePage === 'manager-dashboard') return <ManagerDashboard onNavigate={setActivePage} />;

  // Fallback
  return <Home onNavigate={setActivePage} />;
}

export default App;