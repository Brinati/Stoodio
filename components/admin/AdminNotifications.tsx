import React from 'react';

const AdminNotifications: React.FC = () => {
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-800">Gerar Notificações</h3>
            <p className="mt-1 text-sm text-gray-600">Envie notificações para os usuários do sistema</p>
            
            <div className="mt-6 space-y-6">
                <div>
                    <label htmlFor="notif-title" className="block text-sm font-medium text-gray-700">Título da notificação</label>
                    <input type="text" id="notif-title" className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" placeholder="Digite o título da notificação"/>
                    <p className="mt-1 text-xs text-gray-500">0/100 caracteres</p>
                </div>
                
                <div>
                    <label htmlFor="notif-message" className="block text-sm font-medium text-gray-700">Mensagem</label>
                    <textarea id="notif-message" rows={5} className="block w-full px-3 py-2 mt-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm" placeholder="Digite a mensagem da notificação"></textarea>
                    <p className="mt-1 text-xs text-gray-500">0/500 caracteres</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Destinatários</label>
                    <div className="flex items-center p-3 mt-2 bg-gray-100 border border-gray-200 rounded-md">
                        <i className="fa-solid fa-users mr-2 text-gray-600"></i>
                        <span>Todos os usuários</span>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                     <button
                        className="w-full px-4 py-2 font-semibold text-white bg-gray-800 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800"
                    >
                        <i className="fa-solid fa-paper-plane mr-2"></i>
                        Enviar Notificação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;
