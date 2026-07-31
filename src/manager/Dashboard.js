import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

// Import Modul Khusus Manajer Cabang
import EmployeeManager from './EmployeeManager';
import AttendanceManager from './AttendanceManager';
import MenuManager from './MenuManager';
import InventoryManager from './InventoryManager';
import StockInManager from './StockInManager';
import StockOutManager from './StockOutManager';
import LocationTrackingManager from './LocationTrackingManager';
import DiscountManager from './DiscountManager';
import PaymentMethodManager from './PaymentMethodManager';
import TableQRManager from './TableQRManager';

function ManagerDashboard({ onNavigate }) {
    const [user, setUser] = useState(null);
    const [branchData, setBranchData] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [activeMenu, setActiveMenu] = useState('dashboard');

    const checkManagerAuth = useCallback(async () => {
        setLoadingAuth(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            onNavigate('login');
            return;
        }
        setUser(session.user);

        const { data: empData } = await supabase
            .from('employees')
            .select(`*, branches (*)`)
            .eq('user_id', session.user.id)
            .limit(1);

        if (empData && empData.length > 0) {
            const employee = empData[0];
            if (employee.position === 'manajer' && employee.branches) {
                setBranchData(employee.branches);
            } else {
                alert("Akses ditolak: Anda bukan Manajer Cabang.");
                await supabase.auth.signOut();
                onNavigate('login');
                return;
            }
        } else {
            alert("Akses ditolak: Akun tidak terdaftar.");
            await supabase.auth.signOut();
            onNavigate('login');
            return;
        }

        setLoadingAuth(false);
    }, [onNavigate]);

    useEffect(() => {
        checkManagerAuth();
    }, [checkManagerAuth]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        onNavigate('login');
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-isaji-navy rounded-full animate-spin"></div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeMenu) {
            case 'menu':
                return (
                    <MenuManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'inventory':
                return (
                    <InventoryManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'stock_in':
                return (
                    <StockInManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                        userId={user?.id}
                    />
                );
            case 'stock_out':
                return (
                    <StockOutManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                        userId={user?.id}
                    />
                );
            case 'discounts':
                return (
                    <DiscountManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'customers':
                return (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-2">Manajemen Pelanggan (CRM) - {branchData?.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">Database member, riwayat transaksi, dan poin loyalitas pelanggan.</p>
                        <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-medium">
                            Modul Pelanggan Cabang aktif.
                        </div>
                    </div>
                );
            case 'location_tracking':
                return (
                    <LocationTrackingManager
                        branchId={branchData?.id}
                    />
                );
            case 'payment_methods':
                return (
                    <PaymentMethodManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'table_qr':
                return (
                    <TableQRManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                        branchName={branchData?.name}
                    />
                );
            case 'team':
                return (
                    <EmployeeManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'attendance':
                return (
                    <AttendanceManager
                        branchId={branchData?.id}
                    />
                );
            case 'dashboard':
            default:
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-r from-isaji-navy to-blue-900 p-8 rounded-2xl text-white shadow-sm">
                            <h2 className="text-2xl font-black mb-1">Selamat Datang, Manajer!</h2>
                            <p className="text-blue-200 text-sm">
                                Mengelola operasional penuh untuk cabang <strong>{branchData?.name}</strong>.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Penjualan Hari Ini</p>
                                <p className="text-2xl font-black text-gray-900 mt-2">Rp 0</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Transaksi</p>
                                <p className="text-2xl font-black text-gray-900 mt-2">0 Pesanan</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold text-orange-500 uppercase tracking-wider">Stok Menipis</p>
                                <p className="text-2xl font-black text-gray-900 mt-2">0 Item</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Kehadiran Tim</p>
                                <p className="text-2xl font-black text-gray-900 mt-2">0 / 0 Staf</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-900 overflow-hidden relative">
            <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header user={user} branchData={branchData} handleLogout={handleLogout} />

                <div className="flex-1 overflow-y-auto p-8 flex flex-col relative">
                    <div className="flex-1">
                        {renderContent()}
                    </div>
                </div>

                <Footer />
            </main>
        </div>
    );
}

export default ManagerDashboard;