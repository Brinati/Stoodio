import React, { useState, useEffect } from 'react';
import { UsersCardIcon, ClientsCardIcon, GenerationsCardIcon, StatusCardIcon } from './icons';
import { supabase } from '../../services/supabaseClient';
import { UserProfile, GeneratedImage } from '../../types';

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

const ActivityList: React.FC<{ title: string; children: React.ReactNode; loading: boolean }> = ({ title, children, loading }) => (
    <div className="p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="mt-4">
            {loading ? (
                <div className="text-center text-gray-400">Carregando...</div>
            ) : (
                <ul className="space-y-3">{children}</ul>
            )}
        </div>
    </div>
);


const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        users: { count: 0, label: 'Carregando...' },
        generations: { count: 0, label: 'Carregando...' },
        status: { text: 'Online', label: 'Sistema OK' }
    });
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
    const [recentImages, setRecentImages] = useState<GeneratedImage[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats in parallel
                const [usersRes, generationsRes, recentUsersRes, recentImagesRes] = await Promise.all([
                    supabase.from('profiles').select('*', { count: 'exact', head: true }),
                    supabase.from('generated_images').select('*', { count: 'exact', head: true }),
                    // FIX: Removed ordering by `created_at` as the column likely does not exist on the `profiles` table, causing an error.
                    supabase.from('profiles').select('*').limit(5),
                    supabase.from('generated_images').select('id, prompt, image_path').order('created_at', { ascending: false }).limit(5)
                ]);

                if (usersRes.error) throw usersRes.error;
                if (generationsRes.error) throw generationsRes.error;
                if (recentUsersRes.error) throw recentUsersRes.error;
                if (recentImagesRes.error) throw recentImagesRes.error;

                setStats(prev => ({
                    ...prev,
                    users: { count: usersRes.count ?? 0, label: `${usersRes.count ?? 0} ativos` },
                    generations: { count: generationsRes.count ?? 0, label: `total de imagens` },
                }));
                
                setRecentUsers(recentUsersRes.data || []);
                
                const loadedImages = (recentImagesRes.data || []).map(img => {
                    const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(img.image_path);
                    return { id: img.id, prompt: img.prompt, src: publicUrl, image_path: img.image_path };
                });
                setRecentImages(loadedImages);

            } catch (error: any) {
                console.error("Failed to fetch dashboard stats:", error.message || error);
                 setStats(prev => ({
                    ...prev,
                    users: { count: 0, label: 'Erro ao carregar' },
                    generations: { count: 0, label: 'Erro ao carregar' },
                }));
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);
    
    return (
        <div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<UsersCardIcon />} title="Usuários" value={loading ? '...' : stats.users.count} subtitle={stats.users.label} />
                <StatCard icon={<ClientsCardIcon />} title="Clientes" value={0} subtitle={'0 ativos'} />
                <StatCard icon={<GenerationsCardIcon />} title="Gerações" value={loading ? '...' : stats.generations.count} subtitle={stats.generations.label} />
                <StatCard icon={<StatusCardIcon />} title="Status" value={stats.status.text} subtitle={stats.status.label} />
            </div>

            <div className="grid grid-cols-1 gap-6 mt-8 lg:grid-cols-2">
                <ActivityList title="Últimos Usuários Cadastrados" loading={loading}>
                    {recentUsers.length > 0 ? recentUsers.map(user => (
                        <li key={user.id} className="flex justify-between p-2 text-sm bg-gray-50 rounded-md">
                            <span className="font-medium text-gray-700">{user.full_name}</span>
                            <span className="text-gray-500">{user.token_balance} tokens</span>
                        </li>
                    )) : <p className="text-gray-400">Nenhum usuário recente.</p>}
                </ActivityList>
                <ActivityList title="Últimas Imagens Geradas" loading={loading}>
                    {recentImages.length > 0 ? recentImages.map(image => (
                         <li key={image.id} className="flex items-center gap-3 p-2 text-sm bg-gray-50 rounded-md">
                            <img src={image.src} alt="thumbnail" className="flex-shrink-0 object-cover w-10 h-10 rounded-md" />
                            <p className="text-gray-700 truncate">{image.prompt}</p>
                        </li>
                    )) : <p className="text-gray-400">Nenhuma imagem recente.</p>}
                </ActivityList>
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