import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

// Import Modul Khusus Manajer Cabang
import EmployeeManager from './EmployeeManager';
import AttendanceManager from './AttendanceManager';
import ShiftManager from './ShiftManager';
import HolidayScheduleManager from './HolidayScheduleManager';
import LeaveRequestManager from './LeaveRequestManager';
import AttendanceRulesManager from './AttendanceRulesManager';
import MenuManager from './MenuManager';
import InventoryManager from './InventoryManager';
import StockInManager from './StockInManager';
import StockOutManager from './StockOutManager';
import LocationTrackingManager from './LocationTrackingManager';
import DiscountManager from './DiscountManager';
import PaymentMethodManager from './PaymentMethodManager';
import TableQRManager from './TableQRManager';
// Menu Stok Dll
import ManagerDashboardHome from './ManagerDashboardHome';
import CustomerManager from './CustomerManager';
import RecipeManager from './RecipeManager';

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
                    <CustomerManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                        branchName={branchData?.name}
                    />
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
            case 'recipe':
                return (
                    <RecipeManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
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
            case 'shift':
                return <ShiftManager branchId={branchData?.id} />;
            case 'holiday_schedule':
                return <HolidayScheduleManager branchId={branchData?.id} />;
            case 'leave_requests':
                return <LeaveRequestManager branchId={branchData?.id} />;
            case 'attendance_rules':
                return (
                    <AttendanceRulesManager
                        branchId={branchData?.id}
                        organizationId={branchData?.organization_id}
                    />
                );
            case 'dashboard':
            default:
                return <ManagerDashboardHome branchData={branchData} />;
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