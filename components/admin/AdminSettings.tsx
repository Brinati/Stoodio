import React from 'react';

const MetricBox: React.FC<{ value: string, label: string }> = ({ value, label }) => (
    <div className="p-4 text-center bg-gray-100 border border-gray-200 rounded-md">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
    </div>
);


const AdminSettings: React.FC = () => {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800">Configurações do Sistema</h3>
            <p className="mt-1 text-sm text-gray-600">Gerencie configurações globais e ajustes de senha</p>

            <div className="mt-6 space-y-8">
                 <div>
                    <h4 className="font-semibold text-gray-700">Nova Senha</h4>
                    <div className="mt-4 space-y-4">
                        <input type="password" placeholder="Digite a nova senha" className="block w-full max-w-sm px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
                        <input type="password" placeholder="Confirmar a nova senha" className="block w-full max-w-sm px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" />
                    </div>
                     <button className="px-4 py-2 mt-4 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-700">
                        <i className="fa-solid fa-save mr-2"></i>
                        Atualizar Senha
                    </button>
                </div>

                <div className="pt-6 border-t border-gray-200">
                     <h4 className="font-semibold text-gray-700">Métricas do Sistema</h4>
                     <div className="grid grid-cols-2 gap-4 mt-4 max-w-sm">
                        <MetricBox value="15-18" label="Tokens por imagem" />
                        <MetricBox value="366" label="Total de Tokens Distribuídos" />
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
