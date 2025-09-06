import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { UserProfile } from '../../types';
import { updateUserTokens } from '../../services/geminiService';

const AdminTokens: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [tokenAmount, setTokenAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) {
            setError('Falha ao carregar usuários.');
            console.error(error);
        } else {
            setUsers(data || []);
            if (data && data.length > 0) {
                setSelectedUserId(data[0].id);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);
    
    const handleTokenUpdate = async (operation: 'add' | 'remove') => {
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (!selectedUser || tokenAmount <= 0) {
            setError('Selecione um usuário e insira uma quantidade válida de tokens.');
            return;
        }

        setError(null);
        setSuccessMessage(null);
        setUpdating(true);

        const currentBalance = selectedUser.token_balance;
        const newBalance = operation === 'add' 
            ? currentBalance + tokenAmount 
            : currentBalance - tokenAmount;

        if (newBalance < 0) {
            setError('O usuário não pode ter um saldo de tokens negativo.');
            setUpdating(false);
            return;
        }

        try {
            const updatedProfile = await updateUserTokens(selectedUserId, newBalance);
            setSuccessMessage(`Tokens atualizados para ${updatedProfile.full_name} com sucesso!`);
            setUsers(users.map(u => u.id === selectedUserId ? updatedProfile : u));
            setTokenAmount(0);
        } catch (err: any) {
            setError(err.message || 'Falha ao atualizar os tokens.');
            console.error(err);
        } finally {
            setUpdating(false);
        }
    };

    const selectedUser = users.find(u => u.id === selectedUserId);

    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800">Gerenciar Tokens</h3>
            <p className="mt-1 text-sm text-gray-600">Adicione ou remova tokens dos usuários. Cada imagem gerada consome 15-18 tokens.</p>

            {loading && !users.length ? <p className="mt-6 text-gray-500">Carregando...</p> : (
                <div className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label htmlFor="user-select" className="block text-sm font-medium text-gray-700">Selecionar Usuário</label>
                            <select
                                id="user-select"
                                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>{user.full_name} - {user.token_balance} tokens</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="token-amount" className="block text-sm font-medium text-gray-700">Quantidade de Tokens</label>
                            <input
                                type="number"
                                id="token-amount"
                                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(Number(e.target.value))}
                                min="0"
                            />
                        </div>
                    </div>

                    {selectedUser && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <p className="font-semibold">{selectedUser.full_name}</p>
                            <p className="text-sm text-gray-600">Tokens atuais: {selectedUser.token_balance}</p>
                        </div>
                    )}
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

                    <div className="flex flex-col gap-4 pt-4 border-t border-gray-200 sm:flex-row">
                        <button onClick={() => handleTokenUpdate('add')} disabled={updating} className="flex-1 items-center justify-center px-4 py-2 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:bg-gray-400">
                            <i className="fa-solid fa-plus mr-2"></i>
                            {updating ? 'Atualizando...' : 'Adicionar Tokens'}
                        </button>
                        <button onClick={() => handleTokenUpdate('remove')} disabled={updating} className="flex-1 items-center justify-center px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-200">
                            <i className="fa-solid fa-minus mr-2"></i>
                            {updating ? 'Atualizando...' : 'Remover Tokens'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTokens;