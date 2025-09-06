import React, { useContext, useState } from 'react';
import { TokenIcon, CrownIcon, BuildingIcon } from './icons';
import { AppContext } from '../context/AppContext';

const Checkmark: React.FC = () => (
    <svg className="w-5 h-5 mr-2 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const PlanCard: React.FC<{
    icon: React.ReactNode,
    title: string,
    price: string,
    description: string,
    features: string[],
    isPopular?: boolean,
    onChoose: () => void,
    isLoading: boolean,
}> = ({ icon, title, price, description, features, isPopular = false, onChoose, isLoading }) => (
    <div className={`relative flex flex-col p-6 bg-white border rounded-lg shadow-sm ${isPopular ? 'border-gray-800' : 'border-gray-200'}`}>
        {isPopular && (
            <div className="absolute top-0 right-4 px-3 py-1 text-xs font-semibold text-white bg-gray-800 rounded-b-md">
                Mais Popular
            </div>
        )}
        <div className="flex-shrink-0">{icon}</div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800">{title}</h3>
        <p className="mt-2 text-4xl font-bold text-gray-900">
            R$ {price}
        </p>
        <p className="text-sm text-gray-500">{description}</p>
        <ul className="flex-grow mt-6 space-y-4">
            {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                    <Checkmark />
                    <span className="text-sm text-gray-600">{feature}</span>
                </li>
            ))}
        </ul>
        <button 
            onClick={onChoose}
            disabled={isLoading}
            className={`w-full px-4 py-2 mt-8 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait ${isPopular ? 'text-white bg-gray-900 hover:bg-gray-800' : 'text-gray-800 bg-white border border-gray-300 hover:bg-gray-50'}`}>
            {isLoading ? 'Aguarde...' : 'Escolher Plano'}
        </button>
    </div>
);


const Plans: React.FC = () => {
    const { profile, session } = useContext(AppContext)!;
    const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // TODO: Replace these with your actual Price IDs from your Stripe dashboard.
    const priceIds = {
        basic: 'price_1PScF3A5qkZtHvNNs4v5L2pX', // Example
        professional: 'price_1PScGBA5qkZtHvNN3N0aEeyB', // Example
        premium: 'price_1PScGgA5qkZtHvNNTj4bXh2C', // Example
        tokens: 'price_1PScHNA5qkZtHvNNuP3wzI6Q', // Example
    };
    
    const handlePurchase = async (priceId: string) => {
        setLoadingPriceId(priceId);
        setError(null);
        try {
            const response = await fetch('/.netlify/functions/create-stripe-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ priceId, userEmail: session?.user?.email }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody.error || `HTTP error! status: ${response.status}`);
            }

            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error("URL de checkout não recebida.");
            }

        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            setError("Não foi possível iniciar o pagamento. Por favor, tente novamente.");
            setLoadingPriceId(null);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-full">
            <div className="max-w-5xl mx-auto">
                {/* Token Summary */}
                <div className="p-6 text-center bg-white border border-yellow-200 rounded-lg shadow-sm" style={{ background: 'linear-gradient(to right, #fefce8, #fffbeb)'}}>
                    <h2 className="text-lg font-semibold text-gray-600">Seus Tokens</h2>
                    <p className="mt-1 text-5xl font-bold text-gray-900">{profile?.token_balance ?? 0}</p>
                    <p className="mt-1 text-sm text-gray-500">Tokens disponíveis para geração de imagens</p>
                </div>
                
                {error && (
                    <div className="p-4 mt-8 text-sm text-center text-red-800 bg-red-100 border border-red-200 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Subscription Plans */}
                <div className="grid grid-cols-1 gap-8 mt-12 md:grid-cols-3">
                    <PlanCard 
                        icon={<TokenIcon className="w-8 h-8 text-gray-500" />}
                        title="Básico"
                        price="29.90"
                        description="Plano básico com 500 tokens mensais"
                        features={['500 tokens mensais', 'Até 7 produtos', 'Galeria de imagens geradas']}
                        onChoose={() => handlePurchase(priceIds.basic)}
                        isLoading={loadingPriceId === priceIds.basic}
                    />
                     <PlanCard 
                        icon={<CrownIcon className="w-8 h-8 text-gray-500" />}
                        title="Profissional"
                        price="49.90"
                        description="Plano profissional com 1000 tokens mensais"
                        features={['1000 tokens mensais', 'Até 7 produtos', 'Galeria de imagens geradas']}
                        onChoose={() => handlePurchase(priceIds.professional)}
                        isLoading={loadingPriceId === priceIds.professional}
                    />
                     <PlanCard 
                        icon={<BuildingIcon className="w-8 h-8 text-gray-500" />}
                        title="Premium"
                        price="89.90"
                        description="Plano premium com 1500 tokens mensais"
                        features={['1500 tokens mensais', 'Até 7 produtos', 'Galeria de imagens geradas']}
                        isPopular
                        onChoose={() => handlePurchase(priceIds.premium)}
                        isLoading={loadingPriceId === priceIds.premium}
                    />
                </div>

                {/* One-time Purchase */}
                <div className="mt-16 text-center">
                    <h2 className="text-2xl font-bold text-gray-800">Precisando de mais tokens?</h2>
                    <p className="mt-1 text-gray-600">Compre tokens avulsos para continuar criando</p>
                    <div className="inline-block max-w-sm p-6 mx-auto mt-6 text-left bg-white border border-gray-200 rounded-lg shadow-sm">
                        <p className="text-4xl font-bold text-center text-gray-900">R$ 35,00</p>
                        <p className="mt-1 text-sm text-center text-gray-500">400 Tokens</p>
                        <ul className="mt-6 space-y-3">
                            <li className="flex items-start">
                                <span className="inline-block w-2 h-2 mr-2 bg-green-500 rounded-full mt-1.5"></span>
                                <span className="text-sm text-gray-600">Compra única (não é assinatura)</span>
                            </li>
                             <li className="flex items-start">
                                <span className="inline-block w-2 h-2 mr-2 bg-green-500 rounded-full mt-1.5"></span>
                                <span className="text-sm text-gray-600">400 gerações de imagens</span>
                            </li>
                        </ul>
                         <button 
                            onClick={() => handlePurchase(priceIds.tokens)}
                            disabled={loadingPriceId === priceIds.tokens}
                            className="w-full px-4 py-2 mt-6 font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-wait">
                            {loadingPriceId === priceIds.tokens ? 'Aguarde...' : 'Comprar Tokens'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Plans;