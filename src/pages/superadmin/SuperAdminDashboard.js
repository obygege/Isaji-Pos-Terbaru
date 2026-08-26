import React, { useState, useEffect } from 'react';
import SuperAdminSidebar from './components/SuperAdminSidebar';
import SuperAdminHeader from './components/SuperAdminHeader';

// Import Semua Komponen Tab
import OverviewTab from './tabs/OverviewTab';
import TenantsTab from './tabs/TenantsTab';
import OwnersTab from './tabs/OwnersTab';
import FinanceTab from './tabs/FinanceTab';
import MonitoringTab from './tabs/MonitoringTab';
import SecurityTab from './tabs/SecurityTab';
import DatabaseTab from './tabs/DatabaseTab';
import ProfileTab from './tabs/ProfileTab';
import { getVerifiedSuperAdminSession } from './superAdminAuth';

function SuperAdminDashboard() {
    const [activeMenu, setActiveMenu] = useState('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const verify = async () => {
            const session = await getVerifiedSuperAdminSession();
            if (!session) {
                window.location.href = '/isaji-command-center';
                return;
            }
            setCheckingAuth(false);
        };
        verify();
    }, []);

    if (checkingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-sm font-bold text-gray-400">Memverifikasi akses...</p>
            </div>
        );
    }

    // Fungsi untuk merender Tab yang sedang aktif
    const renderActiveTab = () => {
        switch (activeMenu) {
            case 'overview': return <OverviewTab />;
            case 'tenants': return <TenantsTab searchQuery={searchQuery} />;
            case 'owners': return <OwnersTab searchQuery={searchQuery} />;
            case 'finance': return <FinanceTab />;
            case 'database': return <DatabaseTab />;
            case 'monitoring': return <MonitoringTab />;
            case 'security': return <SecurityTab />;
            case 'profile': return <ProfileTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 font-sans selection:bg-orange-100">
            <SuperAdminSidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

            <main className="flex-1 ml-64 flex flex-col min-h-screen">
                <SuperAdminHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} onProfileClick={() => setActiveMenu('profile')} />

                <div className="p-8 flex-1">
                    {renderActiveTab()}
                </div>
            </main>
        </div>
    );
}

export default SuperAdminDashboard;