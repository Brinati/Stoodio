import React from 'react';
import { UsersCardIcon, ClientsCardIcon, GenerationsCardIcon, StatusCardIcon } from './icons';

const StatCard: React.FC<{
    icon: React.ReactNode,
    title: string,
    value: string | number,
    subtitle: string,
}> = ({ icon, title, value, subtitle }) => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
            </div>
            <div className="text-2xl">{icon}</div>
        </div>
    </div>
);

const ChartPlaceholder: React.FC<{title: string}> = ({ title }) => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center justify-center h-64 mt-4 bg-gray-50 rounded-md">
            <p className="text-gray-400">Dados do gráfico serão exibidos aqui.</p>
        </div>
    </div>
);

const AdminDashboard: React.FC = () => {
    // Placeholder data from screenshot
    const stats = {
        users: { count: 4, label: '4 ativos' },
        clients: { count: 0, label: '0 ativos' },
        generations: { count: 0, label: 'este mês' },
        status: { text: 'Online', label: 'Sistema OK' }
    };
    
    return (
        <div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<UsersCardIcon />} title="Usuários" value={stats.users.count} subtitle={stats.users.label} />
                <StatCard icon={<ClientsCardIcon />} title="Clientes" value={stats.clients.count} subtitle={stats.clients.label} />
                <StatCard icon={<GenerationsCardIcon />} title="Gerações" value={stats.generations.count} subtitle={stats.generations.label} />
                <StatCard icon={<StatusCardIcon />} title="Status" value={stats.status.text} subtitle={stats.status.label} />
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartPlaceholder title="Evolução de Novos Usuários" />
                <ChartPlaceholder title="Imagens Criadas" />
            </div>
            
             <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800">Financeiro</h3>
                <div className="grid grid-cols-1 gap-6 mt-4 sm:grid-cols-3">
                     <StatCard title="Planos Ativos" value="0" subtitle="Total de assinantes" icon={<i className="fa-solid fa-check-circle text-green-500"></i>} />
                     <StatCard title="Faturamento Mensal" value="R$ 0,00" subtitle="Receita recorrente" icon={<i className="fa-solid fa-dollar-sign text-blue-500"></i>} />
                     <StatCard title="Planos Vencidos" value="0" subtitle="Churn" icon={<i className="fa-solid fa-times-circle text-red-500"></i>} />
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
