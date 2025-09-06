import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Product, SnippetCategory, GeneratedImage, Snippet } from '../types';
import { CopyIcon, ImageIcon, WandIcon } from './icons';
import { enhancePrompt, generateImage, ImageSource } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import EditImageModal from './EditImageModal';
import LowTokenModal from './LowTokenModal';

// Helper functions to handle image data, kept local to the component
const urlToImageSource = async (url: string): Promise<ImageSource> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao buscar imagem para edição.');
    const blob = await response.blob();
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ imageBase64: base64, mimeType: blob.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};


const Studio: React.FC = () => {
    const {
        profile, products, logo, generatedImages, setActivePage, session, addGeneratedImage, deductTokens,
        isGenerating, generationProgress, generationError, runGeneration, runTextToImageGeneration, clearGenerationError
    } = useContext(AppContext)!;
    
    const [prompt, setPrompt] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);
    const [isLowTokenModalOpen, setLowTokenModalOpen] = useState(false);
    const [requiredTokens, setRequiredTokens] = useState(0);
    const [selectedSnippetIds, setSelectedSnippetIds] = useState<Set<string>>(new Set());

    const allSelectableProducts = useMemo(() => {
        const p = [...products];
        if (logo) {
            p.unshift(logo); // Add logo to the beginning for selection
        }
        return p;
    }, [products, logo]);

    const snippetCategories: SnippetCategory[] = useMemo(() => [
        {
            title: 'Estilo Visual',
            icon: <i className="fas fa-palette mr-2"></i>,
            snippets: [
                { id: 'sv1', text: 'Cinematografico', prompt: 'estilo cinematográfico, realista, iluminação de cinema' },
                { id: 'sv2', text: 'Candy Color', prompt: 'paleta candy color, vibrante' },
                { id: 'sv3', text: 'Minimalista', prompt: 'fundo branco, estilo minimalista, clean, fundo neutro' },
                { id: 'sv4', text: 'Rústico', prompt: 'ambiente rústico, madeira, iluminação quente' },
            ]
        },
        {
            title: 'Ângulo / Fotografia',
            icon: <i className="fas fa-camera mr-2"></i>,
            snippets: [
                { id: 'a1', text: 'Vista de Cima', prompt: 'foto vista de cima, composição organizada' },
                { id: 'a2', text: 'Close-up', prompt: 'close-up com foco nos detalhes' },
                { id: 'a3', text: 'Ângulo 45°', prompt: 'ângulo 45 graus, perspectiva natural' },
                { id: 'a4', text: 'Fundo Infinito', prompt: 'fundo branco infinito, sem sombras externas' },
            ]
        },
        {
            title: 'Elementos extras',
            icon: <i className="fas fa-magic mr-2"></i>,
            snippets: [
                { id: 'e1', text: 'Sombras Suaves', prompt: 'sombras suaves, iluminação difusa' },
                { id: 'e2', text: 'Textura Realista', prompt: 'texturas realistas, ultra detalhadas' },
                { id: 'e3', text: 'Produto Central', prompt: 'produto centralizado, foco total' },
                { id: 'e4', text: 'Mockup Profissional', prompt: 'mockup profissional, apresentação de e-commerce' },
            ]
        },
    ], []);
    
    useEffect(() => {
        const currentPromptParts = new Set(prompt.split(',').map(p => p.trim()).filter(Boolean));
        const newSelectedIds = new Set<string>();

        snippetCategories.forEach(category => {
            category.snippets.forEach(snippet => {
                const snippetPromptParts = snippet.prompt.split(',').map(p => p.trim()).filter(Boolean);
                const isPresent = snippetPromptParts.length > 0 && snippetPromptParts.every(part => currentPromptParts.has(part));
                if (isPresent) {
                    newSelectedIds.add(snippet.id);
                }
            });
        });

       setSelectedSnippetIds(newSelectedIds);
    }, [prompt, snippetCategories]);

    const handleSnippetClick = (snippet: Snippet) => {
        const isSelected = selectedSnippetIds.has(snippet.id);
        
        let currentPromptParts = prompt.split(',').map(p => p.trim()).filter(Boolean);
        const snippetPromptParts = snippet.prompt.split(',').map(p => p.trim()).filter(Boolean);

        if (isSelected) {
            currentPromptParts = currentPromptParts.filter(p => !snippetPromptParts.includes(p));
        } else {
            snippetPromptParts.forEach(part => {
                if (!currentPromptParts.includes(part)) {
                    currentPromptParts.push(part);
                }
            });
        }
        setPrompt(currentPromptParts.join(', '));
    };

    const handleProductSelection = (product: Product) => {
        setSelectedProduct(prev => prev?.id === product.id ? null : product);
    };
    
    const handleEnhancePrompt = async () => {
        if (!prompt || isEnhancing) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(prompt);
            setPrompt(enhanced);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setIsEnhancing(false);
        }
    };

    const generationCost = useMemo(() => {
        if (selectedProduct) return 16;
        return 20;
    }, [selectedProduct]);

    const handleGenerateClick = async () => {
        if (!prompt) {
            setValidationError("Por favor, descreva a imagem que você quer criar.");
            return;
        }
        
        const cost = generationCost;
        if ((profile?.token_balance ?? 0) < cost) {
            setRequiredTokens(cost);
            setLowTokenModalOpen(true);
            return;
        }

        setValidationError(null);
        if (selectedProduct) {
            runGeneration(prompt, [selectedProduct]);
        } else {
            runTextToImageGeneration(prompt);
        }
    };

    const copyPrompt = () => {
        navigator.clipboard.writeText(prompt);
    }
    
    const downloadImage = (src: string, name: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEditImage = async (image: GeneratedImage, newPrompt: string) => {
        const cost = 16;
        if ((profile?.token_balance ?? 0) < cost || !session?.user) {
            throw new Error(`Tokens insuficientes ou usuário não logado.`);
        }
        
        const success = await deductTokens(cost);
        if(!success) throw new Error("Falha ao deduzir tokens para edição.");
        
        try {
            const referenceImage = await urlToImageSource(image.src);
            const result = await generateImage(newPrompt, referenceImage);

            if (result) {
                const blob = base64ToBlob(result.base64, result.mimeType);
                const fileName = `${Date.now()}-edit.png`;
                const filePath = `${session.user.id}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('generated_images').upload(filePath, blob);
                if (uploadError) throw uploadError;

                const { data: dbData, error: dbError } = await supabase
                    .from('generated_images')
                    .insert({ user_id: session.user.id, prompt: newPrompt, image_path: filePath })
                    .select().single();
                if (dbError) throw dbError;
                
                const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(filePath);

                addGeneratedImage({ id: dbData.id, src: publicUrl, prompt: newPrompt, image_path: filePath });
            } else {
                throw new Error("A IA não conseguiu gerar uma nova versão da imagem.");
            }
        } catch(error) {
             await deductTokens(-cost); // Refund tokens on failure
             if (error instanceof Error) {
                 throw new Error(error.message);
             }
             throw new Error("Ocorreu um erro desconhecido durante a edição.");
        }
    };

    return (
        <>
        {editingImage && <EditImageModal image={editingImage} onClose={() => setEditingImage(null)} onEdit={handleEditImage} onDownload={downloadImage} />}
        <LowTokenModal
            isOpen={isLowTokenModalOpen}
            onClose={() => setLowTokenModalOpen(false)}
            onGoToPlans={() => { setLowTokenModalOpen(false); setActivePage('plans'); }}
            requiredTokens={requiredTokens}
            currentBalance={profile?.token_balance ?? 0}
        />
        <div className="flex h-full bg-gray-50">
            <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-3 space-y-6">
                        
                        <div className="p-6 bg-white border border-gray-200 rounded-lg">
                            <h2 className="text-xl font-semibold text-gray-800">
                                <span className="text-amber-500">Passo 1:</span> Escolha um Produto
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">Selecione uma imagem de base para a sua criação. (Opcional)</p>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                                {allSelectableProducts.length > 0 ? allSelectableProducts.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleProductSelection(p)}
                                        className={`relative block p-2 text-sm text-left border rounded-lg transition-all duration-200 focus:outline-none ${selectedProduct?.id === p.id ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-200 bg-white hover:border-gray-400'}`}
                                        aria-pressed={selectedProduct?.id === p.id}
                                    >
                                        <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                                           <img src={p.src} alt={p.name} className="object-contain w-full h-full" />
                                        </div>
                                        <p className="mt-2 text-xs font-medium text-gray-700 truncate">{p.type === 'logo' ? 'Logo' : p.name}</p>
                                        {selectedProduct?.id === p.id && (
                                            <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-amber-500 rounded-full text-white" aria-hidden="true">
                                                <i className="fas fa-check text-xs"></i>
                                            </div>
                                        )}
                                    </button>
                                )) : (
                                    <div className="col-span-full text-center p-4 border-2 border-dashed rounded-lg">
                                        <p className="text-sm text-gray-500">Nenhum produto enviado.</p>
                                        <button onClick={() => setActivePage('products')} className="mt-1 text-sm font-semibold text-amber-600 hover:underline">
                                            Fazer upload de produtos
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-white border border-gray-200 rounded-lg">
                            <h2 className="text-xl font-semibold text-gray-800">
                                <span className="text-amber-500">Passo 2:</span> Descreva sua Imagem
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">Use os snippets abaixo ou escreva livremente.</p>
                            
                            <textarea
                                value={prompt}
                                onChange={(e) => { setPrompt(e.target.value); if(validationError) setValidationError(null); }}
                                placeholder="Ex: um pódio de mármore branco, com folhas tropicais ao fundo e luz do sol..."
                                className="w-full h-28 p-3 mt-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                                aria-label="Prompt de imagem"
                            />
                            <div className="flex items-center justify-between mt-2">
                                <button onClick={copyPrompt} className="flex items-center text-sm font-medium text-gray-600 hover:text-amber-600">
                                    <CopyIcon className="w-4 h-4 mr-1" /> Copiar
                                </button>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={!prompt || isEnhancing}
                                    className="flex items-center px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <WandIcon className={`w-4 h-4 mr-2 ${isEnhancing ? 'animate-spin' : ''}`} />
                                    <span>{isEnhancing ? 'Aprimorando...' : 'Aprimorar com IA'}</span>
                                </button>
                            </div>

                            <div className="mt-4 space-y-4">
                                {snippetCategories.map(category => (
                                    <div key={category.title}>
                                        <h4 className="flex items-center font-semibold text-gray-600">{category.icon}{category.title}</h4>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {category.snippets.map(snippet => {
                                                const isSelected = selectedSnippetIds.has(snippet.id);
                                                return (
                                                    <button
                                                        key={snippet.id}
                                                        onClick={() => handleSnippetClick(snippet)}
                                                        className={`flex items-center justify-center px-3 py-2 text-sm rounded-full transition-all duration-200 ${
                                                            isSelected 
                                                                ? 'bg-amber-500 border-amber-500 text-white font-semibold' 
                                                                : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                        aria-pressed={isSelected}
                                                    >
                                                        {snippet.text}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                             {validationError && (
                                <div className="p-3 mb-4 text-sm text-center text-red-800 bg-red-100 rounded-md" role="alert">
                                    {validationError}
                                </div>
                            )}
                            <button
                                onClick={handleGenerateClick}
                                disabled={!prompt || isGenerating}
                                className="w-full px-6 py-4 text-lg font-bold text-white bg-amber-500 rounded-lg shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                            >
                                {isGenerating ? 'Gerando, aguarde...' : `Gerar Imagem (${generationCost} tokens)`}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-2">
                        <div className="lg:sticky lg:top-6">
                             <div className="p-6 bg-white border border-gray-200 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-800">Resultado</h2>
                                <p className="mt-1 text-sm text-gray-500">As 6 imagens mais recentes aparecerão aqui.</p>
                                
                                {isGenerating && (
                                    <div className="mt-4" aria-live="polite">
                                        <p className="text-sm font-semibold text-center text-gray-600">
                                            {generationProgress.total > 1 ? `Processando ${generationProgress.completed + 1} de ${generationProgress.total}...` : "Sua imagem está sendo criada..."}
                                        </p>
                                        <div className="w-full h-2 mt-2 overflow-hidden bg-gray-200 rounded-full">
                                            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%` }}/>
                                        </div>
                                    </div>
                                )}
                                
                                {generationError && !isGenerating && (
                                     <div className="relative p-3 pl-4 pr-10 mt-4 text-sm text-left text-red-800 bg-red-100 rounded-md" role="alert">
                                        <strong className="font-semibold">Erro:</strong> {generationError}
                                        <button onClick={clearGenerationError} className="absolute top-1/2 right-3 transform -translate-y-1/2 text-red-700 hover:text-red-900" aria-label="Fechar"><i className="fas fa-times"></i></button>
                                    </div>
                                )}

                                {!isGenerating && generatedImages.length === 0 && !generationError && (
                                    <div className="flex flex-col items-center justify-center h-64 mt-4 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
                                        <ImageIcon className="w-16 h-16 text-gray-400" />
                                        <p className="mt-2 text-gray-500">Sua imagem aparecerá aqui</p>
                                    </div>
                                )}

                                {generatedImages.length > 0 && (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
                                        {generatedImages.slice(0, 6).map(image => (
                                             <div key={image.id} className="relative overflow-hidden border border-gray-200 rounded-lg group aspect-square">
                                                 <img src={image.src} alt={image.prompt} className="object-cover w-full h-full cursor-pointer" onClick={() => setEditingImage(image)} />
                                                 <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black bg-opacity-0 pointer-events-none group-hover:bg-opacity-50">
                                                     <button onClick={() => setEditingImage(image)} className="px-4 py-2 text-sm font-semibold text-white transition-opacity duration-300 bg-gray-800 bg-opacity-80 rounded-md opacity-0 pointer-events-auto group-hover:opacity-100">
                                                         Ver & Editar
                                                     </button>
                                                 </div>
                                         </div>
                                        ))}
                                    </div>
                                )}
                                {generatedImages.length > 6 && (
                                    <div className="mt-4 text-center">
                                        <button onClick={() => setActivePage('gallery')} className="w-full px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                                            Ver todas na Galeria ({generatedImages.length})
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        </>
    );
};

export default Studio;
