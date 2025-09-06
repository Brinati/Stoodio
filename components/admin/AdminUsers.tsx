import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { deleteUser } from '../../services/geminiService';

// Assumindo que a tabela 'profiles' agora pode conter um email ou que podemos buscá-lo.
// Por segurança e simplicidade, o email pode não estar disponível em queries de admin no client-side.
// Vamos adaptar para usar os dados que temos. Se o email estiver na tabela profiles, ele aparecerá.
interface UserWithEmail extends UserProfile {
    email?: string; // Tornando opcional
}

const CreateUserModal: React.FC<{
    onClose: () => void;
    onUserCreated: () => void;
}> = ({ onClose, onUserCreated }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: 'user',
        token_balance: 60,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        username: formData.username,
                    },
                },
            });
            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error("Não foi possível criar la autenticação do usuário.");

            // Upsert para garantir que o perfil seja criado/atualizado com role e tokens
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: signUpData.user.id,
                full_name: formData.full_name,
                username: formData.username,
                role: formData.role,
                token_balance: Number(formData.token_balance),
            });

            if (profileError) throw profileError;

            onUserCreated();
            onClose();
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg p-6 bg-white rounded-lg">
                <h3 className="text-xl font-semibold">Criar Novo Usuário</h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Nome Completo" required className="w-full p-2 border rounded"/>
                    <input name="username" value={formData.username} onChange={handleChange} placeholder="Nome de Usuário" required className="w-full p-2 border rounded"/>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" required className="w-full p-2 border rounded"/>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Senha" required className="w-full p-2 border rounded"/>
                    <input type="number" name="token_balance" value={formData.token_balance} onChange={handleChange} placeholder="Tokens Iniciais" required className="w-full p-2 border rounded"/>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border rounded">
                        <option value="user">User</option>
                        <option value="super_admin">Super Admin</option>
                    </select>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md">Cancelar</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-white bg-gray-800 rounded-md disabled:bg-gray-400">
                            {loading ? 'Criando...' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserListItem: React.FC<{ user: UserWithEmail; onUserDeleted: () => void }> = ({ user, onUserDeleted }) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const isSuperAdmin = user.role === 'super_admin';

    const handleDelete = async () => {
        if (isSuperAdmin) return;
        if (window.confirm(`Tem certeza que deseja excluir ${user.full_name}? Esta ação não pode ser desfeita.`)) {
            setIsDeleting(true);
            try {
                await deleteUser(user.id);
                onUserDeleted(); // This will trigger a refresh in the parent
            } catch (err: any) {
                alert(`Falha ao excluir usuário: ${err.message}`);
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="flex flex-col items-start justify-between gap-4 p-4 bg-white border-b border-gray-200 sm:flex-row sm:items-center last:border-b-0">
            <div className="flex items-center">
                <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 font-bold text-gray-600 bg-gray-200 rounded-full">
                    {user.full_name.charAt(0)}
                </div>
                <div className="ml-4">
                    <p className="font-semibold text-gray-800">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email || 'Email não disponível'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${isSuperAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                            {user.role || 'user'}
                        </span>
                        <span className="text-xs text-gray-600">{user.token_balance} tokens</span>
                    </div>
                </div>
            </div>
            <div className="flex flex-shrink-0 self-end sm:self-auto gap-2">
                <button className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Desativar</button>
                <button 
                    onClick={handleDelete}
                    disabled={isSuperAdmin || isDeleting}
                    className="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isDeleting ? 'Excluindo...' : 'Excluir'}
                </button>
            </div>
        </div>
    );
};

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserWithEmail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string|null>(null);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            // A melhor abordagem seria uma função no DB (RPC) que um admin pode chamar para
            // juntar auth.users e public.profiles de forma segura.
            // Como fallback, vamos buscar apenas de profiles, que o admin deve ter acesso.
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            
            // Tentativa de obter emails. Isso pode falhar dependendo das políticas do Supabase.
            // Em um app real, use uma Edge Function com a service_role key.
            const userEmails: Record<string, string> = {};
            if (data) {
                 for(const user of data) {
                    // Este é um paliativo. O ideal é não expor emails assim.
                    // Supondo que a tabela profiles tenha uma coluna email.
                     if('email' in user) {
                         userEmails[user.id] = user.email;
                     }
                 }
            }

            const usersWithEmail = data?.map(profile => ({
                ...profile,
                email: userEmails[profile.id] || profile.email,
            })) || [];

            setUsers(usersWithEmail);
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCleanUsers = async () => {
        if (!window.confirm("Tem certeza que deseja excluir TODOS os usuários que NÃO SÃO Super Admins? Esta ação é irreversível.")) return;
    
        setIsCleaning(true);
        const usersToDelete = users.filter(u => u.role !== 'super_admin');
        let successCount = 0;
        let errorCount = 0;
    
        for (const user of usersToDelete) {
            try {
                await deleteUser(user.id);
                successCount++;
            } catch (err) {
                console.error(`Falha ao excluir ${user.full_name}:`, err);
                errorCount++;
            }
        }
    
        alert(`${successCount} usuários excluídos. ${errorCount > 0 ? `${errorCount} falhas.` : ''}`);
        fetchUsers(); // Refresh list
        setIsCleaning(false);
    };

    return (
        <>
            {isCreateModalOpen && <CreateUserModal onClose={() => setCreateModalOpen(false)} onUserCreated={fetchUsers} />}
            <div className="p-6 bg-white border border-gray-200 rounded-lg">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Usuários do Sistema</h3>
                        <p className="mt-1 text-sm text-gray-600">Gerencie usuários e suas permissões</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                         <button
                            onClick={handleCleanUsers}
                            disabled={isCleaning || loading}
                            className="px-4 py-2 font-semibold text-white bg-red-700 rounded-md hover:bg-red-800 disabled:bg-gray-400"
                        >
                            {isCleaning ? 'Limpando...' : 'Excluir Usuários (Manter Admins)'}
                        </button>
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="px-4 py-2 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-700"
                        >
                            + Criar Novo Usuário
                        </button>
                    </div>
                </div>
                
                <div className="mt-6 overflow-hidden border border-gray-200 rounded-lg">
                    {loading && <p className="p-4 text-center text-gray-500">Carregando usuários...</p>}
                    {error && <p className="p-4 text-center text-red-500">Erro ao carregar usuários: {error}</p>}
                    {!loading && !error && (
                        <div>
                            {users.map(user => <UserListItem key={user.id} user={user} onUserDeleted={fetchUsers} />)}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminUsers;