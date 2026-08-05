import React, { useState, useEffect } from 'react';
import supabase from './backend/lib/supabaseClient';
import { detectUserRole } from './backend/lib/roleDetection';

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

// Import Halaman Khusus Super Admin (Command Center)
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

function App() {
  // Cek jalur URL dari browser (Routing Manual)
  const isSelfOrderRoute = window.location.pathname.includes('/self-order');
  const isCustomerLoginRoute = window.location.pathname.includes('/customer-login');
  const isCustomerRegisterRoute = window.location.pathname.includes('/customer-register');

  // Deteksi jalur Super Admin
  const isSuperAdminLoginRoute = window.location.pathname.includes('/isaji-command-center');
  const isSuperAdminDashboardRoute = window.location.pathname.includes('/superadmin/dashboard');

  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem('isajiActivePage') || 'home';
  });

  // Simpan halaman terakhir ke LocalStorage (Hanya untuk Dashboard/Owner)
  useEffect(() => {
    // Jangan simpan state jika sedang di halaman Pelanggan atau Super Admin
    if (!isSelfOrderRoute && !isCustomerLoginRoute && !isCustomerRegisterRoute && !isSuperAdminLoginRoute && !isSuperAdminDashboardRoute) {
      localStorage.setItem('isajiActivePage', activePage);
    }
  }, [activePage, isSelfOrderRoute, isCustomerLoginRoute, isCustomerRegisterRoute, isSuperAdminLoginRoute, isSuperAdminDashboardRoute]);

  useEffect(() => {
    // PENTING: Jika di jalur pelanggan atau Super Admin, ABAIKAN logika Auth Supabase milik pegawai
    if (isSelfOrderRoute || isCustomerLoginRoute || isCustomerRegisterRoute || isSuperAdminLoginRoute || isSuperAdminDashboardRoute) return;

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
  }, [activePage, isSelfOrderRoute, isCustomerLoginRoute, isCustomerRegisterRoute, isSuperAdminLoginRoute, isSuperAdminDashboardRoute]);

  // Fungsi pintar untuk mendeteksi apakah user adalah Owner atau Manajer
  const determineUserRoleAndNavigate = async (userId) => {
    const { role } = await detectUserRole(userId);

    if (role === 'owner') {
      setActivePage('dashboard'); // Dashboard Owner
      return;
    }
    if (role === 'manager') {
      setActivePage('manager-dashboard'); // Dashboard Manajer
      return;
    }

    // Bukan Owner/Manajer (superadmin, karyawan biasa, atau customer)
    // -> JANGAN loloskan ke Owner Dashboard. Sign-out & balik ke login.
    await supabase.auth.signOut();
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

  // ==========================================
  // 3. LOGIKA ROUTING UTAMA APLIKASI (OWNER/MANAGER)
  // ==========================================
  if (activePage === 'home') return <Home onNavigate={setActivePage} />;
  if (activePage === 'login') return <Login onNavigate={setActivePage} />;
  if (activePage === 'register') return <Register onNavigate={setActivePage} />;
  if (activePage === 'forgot_password') return <ForgotPassword onNavigate={setActivePage} />;

  // FOLDER OWNER & MANAGER
  if (activePage === 'dashboard') return <Dashboard onNavigate={setActivePage} />;
  if (activePage === 'manager-dashboard') return <ManagerDashboard onNavigate={setActivePage} />;

  // Fallback
  return <Home onNavigate={setActivePage} />;
}

export default App;