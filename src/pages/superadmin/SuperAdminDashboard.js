import React, { useState, useEffect } from 'react';
import SuperAdminSidebar from './components/SuperAdminSidebar';
import SuperAdminHeader from './components/SuperAdminHeader';

// Import Semua Komponen Tab
import OverviewTab from './tabs/OverviewTab';
import TenantsTab from './tabs/TenantsTab';
import FinanceTab from './tabs/FinanceTab';
import MonitoringTab from './tabs/MonitoringTab';
import SecurityTab from './tabs/SecurityTab';

function SuperAdminDashboard() {
    const [activeMenu, setActiveMenu] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const isAuth = localStorage.getItem('is_superadmin');
        if (!isAuth) window.location.href = '/isaji-command-center';
    }, []);

    // Fungsi untuk merender Tab yang sedang aktif
    const renderActiveTab = () => {
        switch (activeMenu) {
            case 'overview': return <OverviewTab />;
            case 'tenants': return <TenantsTab searchQuery={searchQuery} />;
            case 'finance': return <FinanceTab />;
            case 'monitoring': return <MonitoringTab />;
            case 'security': return <SecurityTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans selection:bg-orange-100">
            <SuperAdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                <SuperAdminHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

                <div className="p-8 flex-1">
                    {renderActiveTab()}
                </div>
            </main>
        </div>
    );
}

export default SuperAdminDashboard;