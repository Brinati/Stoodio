import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const UserSettings: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        const { error: updateError } = await supabase.auth.updateUser({ password: password });

        if (updateError) {
            setError(updateError.message);
        } else {
            setSuccess('Senha atualizada com sucesso!');
            setPassword('');
            setConfirmPassword('');
        }

        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-full">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>
                <p className="mt-1 text-gray-600">Gerencie as configurações da sua conta.</p>

                <div className="p-6 mt-8 bg-white border border-gray-200 rounded-lg">
                    <h2 className="text-xl font-semibold text-gray-700">Alterar Senha</h2>
                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                            <input
                                id="new-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full max-w-sm px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                            <input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full max-w-sm px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        {error && <p className="text-sm text-red-600">{error}</p>}
                        {success && <p className="text-sm text-green-600">{success}</p>}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-5 py-2 text-sm font-semibold text-white bg-gray-800 rounded-md shadow-sm hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-wait"
                            >
                                {loading ? 'Atualizando...' : 'Atualizar Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UserSettings;
