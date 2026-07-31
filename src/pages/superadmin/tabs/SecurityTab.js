import React from 'react';

export default function SecurityTab() {
    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-black text-gray-900">Security Audit Logs</h2>
            <div className="flex items-center gap-4 bg-green-50 border border-green-100 p-4 rounded-xl mb-6">
                <div>
                    <h3 className="font-black text-green-900">Threat Level: Secure</h3>
                    <p className="text-xs text-green-700">Supabase Row Level Security (RLS) Aktif. Isolasi Data SaaS Aman.</p>
                </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
                <p className="text-sm text-gray-500">Log audit real-time memerlukan konfigurasi Webhook di Supabase. Ini adalah tampilan standar keamanan dashboard.</p>
            </div>
        </div>
    );
}