import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../backend/lib/supabaseClient';

import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import Branches from './Branches';
import SubscriptionPlan from './SubscriptionPlan';
import Employees from './Employees';
import Attendance from './Attendance'; // PERBAIKAN: Import komponen Attendance
import DashboardHome from './DashboardHome';
import TransactionHistory from './TransactionHistory';
import ProductsReport from './ProductsReport';
import InventoryReport from './InventoryReport';
import Customers from './Customers';
import LoyaltyProgram from './LoyaltyProgram';
import Finance from './Finance';
import TaxReport from './TaxReport';
import Settings from './Settings';

function Dashboard({ onNavigate }) {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [orgData, setOrgData] = useState(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const checkAuthAndSubscription = useCallback(async () => {
        setLoadingAuth(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            onNavigate('login');
            return;
        }
        setUser(session.user);

        let currentRole = 'owner';
        let currentOrg = null;

        const { data: orgOwners } = await supabase
            .from('organizations')
            .select('*')
            .or(`id.eq.${session.user.id},owner_id.eq.${session.user.id}`)
            .limit(1);

        if (orgOwners && orgOwners.length > 0) {
            currentOrg = orgOwners[0];
        } else {
            const { data: empData } = await supabase.from('employees').select('*').eq('user_id', session.user.id).limit(1);

            if (empData && empData.length > 0) {
                currentRole = 'employee';
                const { data: bossOrgs } = await supabase.from('organizations').select('*').eq('id', empData[0].organization_id).limit(1);
                currentOrg = bossOrgs?.[0] || null;
            } else {
                currentRole = 'owner';
                currentOrg = { subscription_status: 'new' };
            }
        }

        if (currentOrg?.subscription_status === 'trialing') {
            const isExpired = new Date() > new Date(currentOrg.trial_ends_at);
            if (isExpired) {
                currentOrg.subscription_status = 'expired';
                if (currentRole === 'owner' && currentOrg.id) {
                    await supabase.from('organizations').update({ subscription_status: 'expired' }).eq('id', currentOrg.id);
                }
            }
        }

        setRole(currentRole);
        setOrgData(currentOrg);
        setLoadingAuth(false);
    }, [onNavigate]);

    useEffect(() => {
        checkAuthAndSubscription();
    }, [checkAuthAndSubscription]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (loadingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-isaji-navy rounded-full animate-spin"></div>
            </div>
        );
    }

    if (role === 'employee' && (orgData?.subscription_status === 'new' || orgData?.subscription_status === 'unpaid' || orgData?.subscription_status === 'expired')) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Akses Dibekukan</h2>
                    <p className="text-gray-500 text-sm mb-8">
                        Masa berlangganan perusahaan Anda telah berakhir. Hubungi <strong>Owner / Manajer</strong> Anda untuk memperpanjang langganan.
                    </p>
                    <button onClick={handleLogout} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all">
                        Keluar / Sign Out
                    </button>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard':
                return <DashboardHome orgData={orgData} user={user} />;
            case 'branches':
                return <Branches orgData={orgData} />;
            case 'transaction-history':
                return <TransactionHistory orgData={orgData} />;
            case 'employees':
                return <Employees orgData={orgData} />;
            case 'attendance': // PERBAIKAN: Routing untuk komponen Attendance
                return <Attendance orgData={orgData} />;
            case 'products':
                return <ProductsReport orgData={orgData} />;
            case 'inventory':
                return <InventoryReport orgData={orgData} />;
            case 'customers':
                return <Customers orgData={orgData} />;
            case 'loyalty':
                return <LoyaltyProgram orgData={orgData} />;
            case 'finance':
                return <Finance orgData={orgData} />;
            case 'tax':
                return <TaxReport orgData={orgData} />;
            case 'settings':
                return <Settings orgData={orgData} />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Segera Hadir</h2>
                        <p className="text-gray-500 text-sm max-w-md">Modul sedang dalam tahap pengembangan.</p>
                    </div>
                );
        }
    };

    const isMandatoryPaywall = role === 'owner' && (orgData?.subscription_status === 'new' || orgData?.subscription_status === 'unpaid' || orgData?.subscription_status === 'expired');
    const showPaywallModal = isMandatoryPaywall || showUpgradeModal;

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-900 overflow-hidden relative">
            <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} currentPlan={orgData?.subscription_plan || 'trial'} />

            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header activeMenu={activeMenu} user={user} orgData={orgData} handleLogout={handleLogout} />

                <div className="flex-1 overflow-y-auto p-8 flex flex-col relative">
                    {orgData?.subscription_status === 'trialing' && (
                        <div className="bg-orange-50 border border-isaji-orange/30 p-4 rounded-xl mb-6 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-isaji-orange text-sm">Anda menggunakan versi Trial (Percobaan Gratis)</h4>
                                <p className="text-xs text-orange-800 mt-1">Masa percobaan Anda akan berakhir pada {new Date(orgData.trial_ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
                            </div>
                            {role === 'owner' && (
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="bg-isaji-orange text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm hover:bg-orange-600"
                                >
                                    Upgrade Sekarang
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex-1">
                        {renderContent()}
                    </div>
                </div>
                <Footer />
            </main>

            {showPaywallModal && (
                <SubscriptionPlan
                    user={user}
                    orgData={orgData}
                    isOptional={!isMandatoryPaywall}
                    onClose={() => setShowUpgradeModal(false)}
                />
            )}
        </div>
    );
}

export default Dashboard;