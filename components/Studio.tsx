import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Product, SnippetCategory, GeneratedImage, Page } from '../types';
import { CopyIcon, ImageIcon, WandIcon } from './icons';
import { generateImage, enhancePrompt, ImageSource } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import EditImageModal from './EditImageModal';

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
    const { profile, products, logo, addGeneratedImage, generatedImages, deductTokens, session, setActivePage } = useContext(AppContext)!;
    const [prompt, setPrompt] = useState<string>('');
    const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);

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

    const handleSnippetClick = (promptText: string) => {
        setPrompt(prev => prev ? `${prev}, ${promptText}` : promptText);
    };

    const handleProductSelection = (product: Product) => {
        setSelectedProducts(prevSelected => {
            const isAlreadySelected = prevSelected.some(p => p.id === product.id);
            if (isAlreadySelected) {
                return prevSelected.filter(p => p.id !== product.id);
            } else {
                return [...prevSelected, product];
            }
        });
    };
    
    const handleEnhancePrompt = async () => {
        if (!prompt || isEnhancing) return;
        setIsEnhancing(true);
        setError(null);
        try {
            const enhanced = await enhancePrompt(prompt);
            setPrompt(enhanced);
        } catch (err: any) {
            setError(err.message || "Não foi possível aprimorar o prompt.");
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const urlToImageSource = async (url: string): Promise<ImageSource> => {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Falha ao buscar imagem para edição.');
        }
        const blob = await response.blob();
        const mimeType = blob.type;
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ imageBase64: base64, mimeType });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };
    
    const getProductImageSource = async (product: Product): Promise<ImageSource> => {
        if (product.imageBase64 && product.mimeType) {
            return { imageBase64: product.imageBase64, mimeType: product.mimeType };
        }
        if (product.src) {
            return await urlToImageSource(product.src);
        }
        throw new Error(`O produto ${product.name} não possui uma fonte de imagem válida.`);
    };

    const handleGenerateClick = async () => {
        if (!prompt || selectedProducts.length === 0) {
            setError("Por favor, descreva sua imagem e selecione pelo menos um produto ou logo.");
            return;
        }
        
        const cost = selectedProducts.length * 16;
        if ((profile?.token_balance ?? 0) < cost) {
            setError(`Você não tem tokens suficientes. Necessário: ${cost}, disponível: ${profile?.token_balance ?? 0}.`);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const success = await deductTokens(cost);
            if (!success) {
                throw new Error("Falha ao deduzir tokens.");
            }

            const generationPromises = selectedProducts.map(async (product) => {
                const source = await getProductImageSource(product);
                return generateImage(prompt, source);
            });
            const results = await Promise.all(generationPromises);

            for (const [index, result] of results.entries()) {
                if (result && session?.user) {
                    const product = selectedProducts[index];
                    const blob = base64ToBlob(result.base64, result.mimeType);
                    const fileName = `${Date.now()}-${product.name.replace(/\s+/g, '-')}.png`;
                    const filePath = `${session.user.id}/${fileName}`;
                    
                    const { error: uploadError } = await supabase.storage.from('generated_images').upload(filePath, blob);
                    if (uploadError) {
                        console.error('Error uploading image:', uploadError);
                        continue;
                    }

                    const { data: dbData, error: dbError } = await supabase
                        .from('generated_images')
                        .insert({ user_id: session.user.id, prompt: prompt, image_path: filePath })
                        .select().single();
                    
                    if (dbError) {
                        console.error('Error saving image metadata:', dbError);
                        continue;
                    }

                    const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(filePath);

                    addGeneratedImage({
                        id: dbData.id,
                        src: publicUrl,
                        prompt: prompt,
                        image_path: filePath,
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || "Ocorreu um erro desconhecido ao gerar imagens.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditImage = async (image: GeneratedImage, newPrompt: string) => {
        const cost = 16;
        if ((profile?.token_balance ?? 0) < cost || !session?.user) {
            throw new Error(`Tokens insuficientes ou usuário não logado.`);
        }
        
        const success = await deductTokens(cost);
        if(!success) throw new Error("Falha ao deduzir tokens para edição.");
        
        let referenceImage: ImageSource;
        try {
            referenceImage = await urlToImageSource(image.src);
        } catch (error) {
            console.error(error);
            await deductTokens(-cost); // Refund tokens on failure
            throw new Error("Não foi possível carregar a imagem original para edição.");
        }

        const result = await generateImage(newPrompt, referenceImage);

        if (result) {
            const blob = base64ToBlob(result.base64, result.mimeType);
            const fileName = `${Date.now()}-edit.png`;
            const filePath = `${session.user.id}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage.from('generated_images').upload(filePath, blob);
            if (uploadError) {
                await deductTokens(-cost); // Refund
                throw new Error("Falha ao fazer upload da nova imagem.");
            }

            const { data: dbData, error: dbError } = await supabase
                .from('generated_images')
                .insert({ user_id: session.user.id, prompt: newPrompt, image_path: filePath })
                .select().single();

            if (dbError) {
                 await deductTokens(-cost); // Refund
                throw new Error("Falha ao salvar metadados da nova imagem.");
            }
            
            const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(filePath);

            addGeneratedImage({
                id: dbData.id,
                src: publicUrl,
                prompt: newPrompt,
                image_path: filePath,
            });
        } else {
            await deductTokens(-cost); // Refund tokens
            throw new Error("A IA não conseguiu gerar uma nova versão da imagem.");
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

    return (
        <>
        {editingImage && <EditImageModal image={editingImage} onClose={() => setEditingImage(null)} onEdit={handleEditImage} onDownload={downloadImage} />}
        <div className="flex h-full bg-gray-50">
            <main className="flex-1 p-6 overflow-y-auto">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    {/* Left Column */}
                    <div className="lg:col-span-3">
                        <div className="p-6 bg-white border border-gray-200 rounded-lg">
                            <h2 className="flex items-center text-xl font-semibold text-gray-800"><i className="mr-2 text-amber-500 fas fa-wand-magic-sparkles"></i> AI Co-Pilot</h2>
                            <p className="mt-1 text-sm text-gray-500">Descreva detalhes para criação da sua imagem</p>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Descreva sua imagem em detalhes..."
                                className="w-full h-32 p-3 mt-4 text-gray-700 bg-white border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                            />
                             <div className="flex items-center justify-between mt-2">
                                <button onClick={copyPrompt} className="flex items-center text-sm font-medium text-gray-600 hover:text-amber-600">
                                    <CopyIcon className="w-4 h-4 mr-1" /> Copiar
                                </button>
                                <button
                                    onClick={handleEnhancePrompt}
                                    disabled={!prompt || isEnhancing}
                                    className="flex items-center px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isEnhancing ? (
                                        <svg className="w-4 h-4 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <WandIcon className="w-4 h-4 mr-2" />
                                    )}
                                    <span>{isEnhancing ? 'Aprimorando...' : 'Aprimorar com IA'}</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 mt-6 bg-white border border-gray-200 rounded-lg">
                             <h3 className="font-semibold text-gray-800">Snippets para inspiração:</h3>

                            <div className="mt-4">
                                <h4 className="font-semibold text-gray-600">Seus produtos</h4>
                                <div className="flex flex-wrap gap-3 mt-2">
                                    {products.length > 0 ? products.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleProductSelection(p)}
                                            className={`flex items-center p-2 text-sm text-left border rounded-lg transition-colors ${selectedProducts.some(sp => sp.id === p.id) ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                        >
                                            <img src={p.src || `data:${p.mimeType};base64,${p.imageBase64}`} alt={p.name} className="object-contain w-14 h-14 mr-3" />
                                            <span className="font-medium text-gray-700">{p.name}</span>
                                        </button>
                                    )) : <p className="text-sm text-gray-500">Nenhum produto enviado. Vá para a aba 'Produtos' para fazer upload.</p>}
                                </div>
                            </div>
                            
                            {logo && (
                                <div className="mt-6">
                                    <h4 className="font-semibold text-gray-600">Logo</h4>
                                    <div className="flex flex-wrap gap-3 mt-2">
                                        <button
                                            onClick={() => handleProductSelection(logo)}
                                            className={`flex items-center p-2 text-sm text-left border rounded-lg transition-colors ${selectedProducts.some(sp => sp.id === logo.id) ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                                        >
                                            <img src={logo.src} alt={logo.name} className="object-contain w-14 h-14 mr-3" />
                                            <span className="font-medium text-gray-700">{logo.name}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {snippetCategories.map(category => (
                                <div className="mt-4" key={category.title}>
                                    <h4 className="flex items-center font-semibold text-gray-600">{category.icon}{category.title}</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {category.snippets.map(snippet => (
                                            <button
                                                key={snippet.id}
                                                onClick={() => handleSnippetClick(snippet.prompt)}
                                                className="px-3 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 hover:border-gray-300"
                                            >
                                                {snippet.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                         <div className="mt-6">
                            <button
                                onClick={handleGenerateClick}
                                disabled={!prompt || selectedProducts.length === 0 || isLoading}
                                className="w-full px-6 py-3 text-lg font-semibold text-white bg-amber-500 rounded-lg shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                            >
                                {isLoading ? 'Gerando...' : `Gerar Imagem (${selectedProducts.length * 16} tokens)`}
                            </button>
                            {error && <p className="mt-2 text-sm text-center text-red-600">{error}</p>}
                        </div>

                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2">
                        <div className="sticky top-6">
                             <div className="p-6 bg-white border border-gray-200 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-800">Imagens Geradas</h2>
                                <p className="mt-1 text-sm text-gray-500">As 6 imagens mais recentes</p>
                                
                                {isLoading && !generatedImages.length && (
                                    <div className="flex flex-col items-center justify-center h-64 mt-4 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
                                        <p className="text-gray-500">Gerando sua obra-prima...</p>
                                        <div className="w-16 h-16 mt-4 border-4 border-t-4 rounded-full border-t-amber-500 border-gray-200 animate-spin"></div>
                                    </div>
                                )}

                                {!isLoading && generatedImages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-64 mt-4 border-2 border-dashed rounded-lg border-gray-300 bg-gray-50">
                                        <ImageIcon className="w-16 h-16 text-gray-400" />
                                        <p className="mt-2 text-gray-500">Sua imagem aparecerá aqui</p>
                                    </div>
                                )}

                                {generatedImages.length > 0 && (
                                     <div className="grid grid-cols-2 gap-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
                                        {generatedImages.slice(0, 6).map(image => (
                                             <div key={image.id} className="relative overflow-hidden border border-gray-200 rounded-lg group">
                                                 <img src={image.src} alt={image.prompt} className="object-cover w-full h-auto cursor-pointer" onClick={() => setEditingImage(image)} />
                                                 <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black bg-opacity-0 pointer-events-none group-hover:bg-opacity-50">
                                                     <button onClick={() => setEditingImage(image)} className="px-4 py-2 text-sm font-semibold text-white transition-opacity duration-300 bg-gray-800 bg-opacity-80 rounded-md opacity-0 pointer-events-auto group-hover:opacity-100 hover:bg-opacity-100">
                                                         Ver & Editar
                                                     </button>
                                                 </div>
                                         </div>
                                        ))}
                                    </div>
                                )}
                                {generatedImages.length > 6 && (
                                    <div className="mt-4 text-center">
                                        <button 
                                            onClick={() => setActivePage('gallery')}
                                            className="w-full px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                        >
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