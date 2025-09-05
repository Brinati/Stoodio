import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface RegisterPageProps {
  onGoToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onGoToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: `${formData.firstName} ${formData.lastName}`,
            username: formData.username
          }
        }
      });
      if (signUpError) throw signUpError;
      if (!data.user) throw new Error("Não foi possível criar o usuário.");

      // Insert profile. This might be better as a DB trigger.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: formData.username,
        full_name: `${formData.firstName} ${formData.lastName}`,
        token_balance: 60 // Starting tokens
      });

      if (profileError) throw profileError;
      
      setSuccess(true);

    } catch (err: any) {
      setError(err.error_description || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-lg p-8 space-y-6 text-center bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-900">Verifique seu Email!</h2>
                <p className="text-gray-600">Enviamos um link de confirmação para {formData.email}. Por favor, clique no link para ativar sua conta.</p>
                <button onClick={onGoToLogin} className="font-medium text-amber-600 hover:text-amber-500">Voltar para o Login</button>
            </div>
         </div>
      );
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <img src="https://iudoo.com.br/wp-content/uploads/2025/09/Logo-Stoodio.png" alt="Stoodio Logo" className="h-10 mx-auto mb-4" />
          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            Crie sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Comece a criar imagens incríveis hoje!
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <p className="p-3 text-sm text-center text-red-800 bg-red-100 rounded-md">{error}</p>}
          <div className="space-y-4 rounded-md">
            <div className="flex flex-col gap-4 sm:flex-row">
              <input name="firstName" type="text" required value={formData.firstName} onChange={handleChange} placeholder="Nome" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
              <input name="lastName" type="text" required value={formData.lastName} onChange={handleChange} placeholder="Sobrenome" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
            </div>
            <input name="username" type="text" required value={formData.username} onChange={handleChange} placeholder="Usuário (ex: seu-nome)" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
            <input name="email" type="email" autoComplete="email" required value={formData.email} onChange={handleChange} placeholder="Email" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
            <input name="password" type="password" required value={formData.password} onChange={handleChange} placeholder="Senha" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
            <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} placeholder="Confirmar Senha" className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 bg-white border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#f4b400' }}
              className="relative flex justify-center w-full px-4 py-3 text-sm font-semibold text-gray-900 border border-transparent rounded-full group hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70"
            >
              {loading ? 'Criando...' : 'Criar Conta'}
            </button>
          </div>
        </form>
        <div className="text-sm text-center text-gray-600">
          Já tem uma conta?{' '}
          <button onClick={onGoToLogin} className="font-medium text-amber-600 hover:text-amber-500">
            Fazer Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;