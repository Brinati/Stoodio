import React from 'react';

const AdminGenerations: React.FC = () => {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800">Gerações de Imagens</h3>
            <p className="mt-1 text-sm text-gray-600">Acompanhe todas as gerações de imagens do sistema (consumo 15-18 tokens por imagem)</p>
            
            <div className="flex items-center justify-center h-64 mt-6 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
                <p className="text-gray-500">Nenhuma geração encontrada</p>
            </div>
        </div>
    );
};

export default AdminGenerations;
