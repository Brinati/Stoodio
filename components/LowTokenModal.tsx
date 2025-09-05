import React from 'react';

interface LowTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoToPlans: () => void;
    requiredTokens: number;
    currentBalance: number;
}

const LowTokenModal: React.FC<LowTokenModalProps> = ({ isOpen, onClose, onGoToPlans, requiredTokens, currentBalance }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" 
            onClick={onClose}
            aria-modal="true"
            role="dialog"
            aria-labelledby="low-token-modal-title"
        >
            <div 
                className="relative w-full max-w-md p-8 bg-white rounded-lg shadow-xl text-center" 
                onClick={e => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute text-3xl top-2 right-4 text-gray-400 hover:text-gray-600" aria-label="Fechar">&times;</button>
                
                <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>

                <h3 id="low-token-modal-title" className="text-2xl font-bold text-gray-800">Tokens Insuficientes</h3>
                <p className="mt-4 text-gray-600">
                    Você precisa de <strong>{requiredTokens}</strong> tokens para gerar esta imagem. Seu saldo atual é <strong>{currentBalance}</strong>.
                </p>
                <p className="mt-2 text-gray-600">
                    Adquira mais tokens na página de Planos.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <button 
                        onClick={onClose} 
                        className="w-full px-6 py-3 font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200"
                    >
                        Fechar
                    </button>
                    <button 
                        onClick={onGoToPlans} 
                        className="w-full px-6 py-3 font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600"
                    >
                        Ir para Planos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LowTokenModal;
