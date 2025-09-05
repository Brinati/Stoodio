import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminGenerations from './AdminGenerations';
import AdminNotifications from './AdminNotifications';
import AdminTokens from './AdminTokens';
import AdminSettings from './AdminSettings';
import { DashboardIcon, UsersIcon, GenerationsIcon, NotificationsIcon, TokensIcon, SettingsIcon as SettingsIconComponent } from './icons';

type AdminTab = 'dashboard' | 'users' | 'generations' | 'notifications' | 'tokens' | 'settings';

const AdminTabButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            isActive ? 'bg-gray-200 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        {icon}
        <span className="ml-3">{label}</span>
    </button>
);

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

    const renderContent = () => {
        switch(activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <AdminUsers />;
            case 'generations': return <AdminGenerations />;
            case 'notifications': return <AdminNotifications />;
            case 'tokens': return <AdminTokens />;
            case 'settings': return <AdminSettings />;
            default: return <AdminDashboard />;
        }
    };
    
    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Super Admin</h1>
                        <p className="mt-1 text-gray-600">Painel de controle do sistema</p>
                    </div>
                </div>

                <div className="mt-8 border-b border-gray-200">
                    <nav className="flex flex-wrap gap-2">
                        <AdminTabButton label="Dashboard" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />} />
                        <AdminTabButton label="Usuários" isActive={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<UsersIcon />} />
                        <AdminTabButton label="Gerações" isActive={activeTab === 'generations'} onClick={() => setActiveTab('generations')} icon={<GenerationsIcon />} />
                        <AdminTabButton label="Notificações" isActive={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<NotificationsIcon />} />
                        <AdminTabButton label="Gerenciar Tokens" isActive={activeTab === 'tokens'} onClick={() => setActiveTab('tokens')} icon={<TokensIcon />} />
                        <AdminTabButton label="Configurações" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIconComponent />} />
                    </nav>
                </div>
                
                <div className="mt-8">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;