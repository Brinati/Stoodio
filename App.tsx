import React, { useState, useCallback, useEffect } from 'react';
import { Page, Product, AppContextType, GeneratedImage, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Studio from './components/Studio';
import Products from './components/Products';
import LoginPage from './components/LoginPage';
import LandingPage from './components/LandingPage';
import Plans from './components/Plans';
import RegisterPage from './components/RegisterPage';
import { supabase } from './services/supabaseClient';
import AdminPage from './components/admin/AdminPage';
import Gallery from './components/Gallery';
import { AppContext } from './context/AppContext';
// FIX: Changed to a type-only import for `Session` to resolve TypeScript module resolution errors.
import type { Session } from '@supabase/supabase-js';
import UserSettings from './components/UserSettings';
import { generateImage, ImageSource } from './services/geminiService';


const PlaceholderPage: React.FC<{title: string}> = ({title}) => (
    <div className="flex items-center justify-center w-full h-full p-8 bg-gray-50">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-400">{title}</h1>
            <p className="mt-2 text-gray-500">Esta página está em construção.</p>
        </div>
    </div>
);

type AuthView = 'landing' | 'login' | 'register';

// Helper functions moved from Studio.tsx to be accessible in the global scope
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
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


const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [authView, setAuthView] = useState<AuthView>('landing');
    const [activePage, setActivePage] = useState<Page>('studio');
    const [products, setProducts] = useState<Product[]>([]);
    const [logo, setLogo] = useState<Product | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [loadingSession, setLoadingSession] = useState(true);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    // Generation State moved to App level
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({ completed: 0, total: 0 });
    const [generationError, setGenerationError] = useState<string | null>(null);


    useEffect(() => {
        setLoadingSession(true);

        // Fetch the initial session state to unblock the UI quickly.
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        }).catch(err => {
            console.error("Error fetching initial session:", err);
        }).finally(() => {
            // This is crucial to prevent the app from being stuck on the loading screen.
            setLoadingSession(false);
        });

        // Listen for future authentication events (login, logout).
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription?.unsubscribe();
    }, []);

    // This effect runs whenever the session object changes, fetching or clearing user data accordingly.
    useEffect(() => {
        const fetchUserData = async (userId: string) => {
            try {
                // Fetch Profile, Images, and Products in parallel for better performance.
                const [profileRes, imagesRes, productsRes, logoRes] = await Promise.all([
                    supabase.from('profiles').select('*').eq('id', userId).single(),
                    supabase.from('generated_images').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                    supabase.from('products').select('*').eq('user_id', userId).eq('type', 'product').order('created_at', { ascending: true }),
                    supabase.from('products').select('*').eq('user_id', userId).eq('type', 'logo').single()
                ]);

                // Handle Profile data
                if (profileRes.error) {
                    console.error('Error fetching profile:', profileRes.error);
                    setProfile(null);
                } else {
                    setProfile(profileRes.data);
                }

                // Handle Generated Images data
                if (imagesRes.error) {
                    console.error('Error fetching generated images:', imagesRes.error);
                } else if (imagesRes.data) {
                    const loadedImages = imagesRes.data.map(img => {
                        const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(img.image_path);
                        return { id: img.id, prompt: img.prompt, src: publicUrl, image_path: img.image_path };
                    });
                    setGeneratedImages(loadedImages);
                }

                // Handle Products data
                if (productsRes.error) {
                    console.error('Error fetching products:', productsRes.error);
                } else if (productsRes.data) {
                    // FIX: Explicitly type `loadedProducts` as `Product[]` to provide type context to the map function, ensuring the 'type' property is correctly inferred as a literal type.
                    const loadedProducts: Product[] = productsRes.data.map(p => {
                        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(p.image_path);
                        return { id: p.id, name: p.name, mimeType: p.mime_type, src: publicUrl, image_path: p.image_path, type: 'product' };
                    });
                    setProducts(loadedProducts);
                }
                
                // Handle Logo data
                if (logoRes.error && logoRes.error.code !== 'PGRST116') { // Ignore 'single row not found' error
                    console.error('Error fetching logo:', logoRes.error);
                    setLogo(null);
                } else if (logoRes.data) {
                    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(logoRes.data.image_path);
                    setLogo({ id: logoRes.data.id, name: logoRes.data.name, mimeType: logoRes.data.mime_type, src: publicUrl, image_path: logoRes.data.image_path, type: 'logo' });
                }

            } catch (error) {
                console.error("Failed to fetch user data:", error);
                // Reset state on error to avoid displaying stale or incomplete data.
                setProfile(null);
                setProducts([]);
                setLogo(null);
                setGeneratedImages([]);
            }
        };

        if (session?.user) {
            fetchUserData(session.user.id);
        } else {
            // If there's no session, clear all user-specific data.
            setProfile(null);
            setProducts([]);
            setLogo(null);
            setGeneratedImages([]);
        }
    }, [session]);


    const addProducts = useCallback((newProducts: Product[]) => {
        setProducts(prev => [...prev, ...newProducts].slice(0, 7)); // Enforce max 7 products
    }, []);

    const clearProducts = useCallback(async () => {
        if (products.length === 0 || !session?.user) return;

        try {
            const imagePaths = products.map(p => p.image_path).filter(Boolean) as string[];
            if (imagePaths.length > 0) {
                const { error: storageError } = await supabase.storage.from('products').remove(imagePaths);
                if (storageError) throw storageError;
            }

            const productIds = products.map(p => p.id);
            const { error: dbError } = await supabase.from('products').delete().in('id', productIds);
            if (dbError) throw dbError;

            setProducts([]);
        } catch (error) {
            console.error("Failed to clear products:", error);
            // Optionally: show an error message to the user
        }
    }, [products, session]);

    const addLogo = async (newLogo: Product) => {
        if (logo) {
            await removeLogo();
        }
        setLogo(newLogo);
    };

    const removeLogo = async () => {
        if (!logo || !session?.user) return;
        try {
            const { image_path, id } = logo;
            if (image_path) {
                const { error: storageError } = await supabase.storage.from('products').remove([image_path]);
                if (storageError) throw storageError;
            }
            const { error: dbError } = await supabase.from('products').delete().eq('id', id);
            if (dbError) throw dbError;
            setLogo(null);
        } catch (error) {
            console.error("Failed to remove logo:", error);
        }
    };

    const addGeneratedImage = useCallback((image: GeneratedImage) => {
        setGeneratedImages(prev => [image, ...prev]);
    }, []);

    const deductTokens = async (amount: number): Promise<boolean> => {
        if (!profile || !session?.user) return false;

        const newBalance = profile.token_balance - amount;
        if (newBalance < 0 && amount > 0) return false; // Allow refunds to go through

        const { data, error } = await supabase
            .from('profiles')
            .update({ token_balance: newBalance })
            .eq('id', session.user.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating tokens:", error);
            return false;
        }

        setProfile(data);
        return true;
    };

    const runGeneration = useCallback(async (prompt: string, productsToProcess: Product[]) => {
        if (!session?.user) {
            setGenerationError("Usuário não autenticado. Por favor, faça login novamente.");
            return;
        }
        
        const cost = 16 + (Math.max(0, productsToProcess.length - 1)) * 4;
        
        setIsGenerating(true);
        setGenerationProgress({ completed: 0, total: productsToProcess.length });
        setGenerationError(null);
        let tokensDeducted = false;

        try {
            const success = await deductTokens(cost);
            if (!success) {
                throw new Error("Falha ao deduzir tokens. Saldo insuficiente ou erro no servidor.");
            }
            tokensDeducted = true;

            for (const [index, product] of productsToProcess.entries()) {
                const source = await getProductImageSource(product);
                const result = await generateImage(prompt, source);
                
                if (!result || !result.base64) {
                    throw new Error(`A IA não conseguiu gerar uma imagem para "${product.name}". Tente um prompt diferente.`);
                }
                
                const blob = base64ToBlob(result.base64, result.mimeType);
                const fileName = `${Date.now()}-${product.name.replace(/\s+/g, '-')}.png`;
                const filePath = `${session.user.id}/${fileName}`;
                
                const { error: uploadError } = await supabase.storage.from('generated_images').upload(filePath, blob);
                if (uploadError) throw new Error(`Falha no upload para o Supabase: ${uploadError.message}`);
                
                const { data: dbData, error: dbError } = await supabase
                    .from('generated_images')
                    .insert({ user_id: session.user.id, prompt, image_path: filePath })
                    .select().single();
                
                if (dbError) throw new Error(`Falha ao salvar no banco de dados: ${dbError.message}`);

                const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(filePath);

                addGeneratedImage({
                    id: dbData.id,
                    src: publicUrl,
                    prompt: prompt,
                    image_path: filePath,
                });
                
                setGenerationProgress({ completed: index + 1, total: productsToProcess.length });
            }

        } catch (err: any) {
            console.error("Generation failed:", err);
            const errorMessage = err.message || "Ocorreu um erro desconhecido ao gerar imagens.";
            setGenerationError(errorMessage);
            
            if (tokensDeducted) {
                await deductTokens(-cost);
                setGenerationError(prev => `${prev || errorMessage} Seus tokens foram devolvidos.`);
            }
        } finally {
            setIsGenerating(false);
        }
    }, [session, deductTokens, addGeneratedImage]);

    const clearGenerationError = useCallback(() => {
        setGenerationError(null);
    }, []);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setSession(null);
            setProfile(null);
            setProducts([]);
            setLogo(null);
            setGeneratedImages([]);
            setActivePage('studio');
            setAuthView('landing');
        } catch (error: any) {
            console.error("Error logging out:", error.message);
            alert(`Falha ao sair: ${error.message}`);
        }
    };
    
    const renderPage = () => {
        switch (activePage) {
            case 'studio': return <Studio />;
            case 'products': return <Products />;
            case 'gallery': return <Gallery />;
            case 'plans': return <Plans />;
            case 'settings': return <UserSettings />;
            case 'admin': 
                return profile?.role === 'super_admin' ? <AdminPage /> : <PlaceholderPage title="Acesso Negado" />;
            default: return <Studio />;
        }
    };

    if (loadingSession) {
        return <div className="flex items-center justify-center h-screen bg-gray-50"></div>;
    }

    if (!session) {
        switch (authView) {
            case 'login':
                return <LoginPage onGoToRegister={() => setAuthView('register')} />;
            case 'register':
                return <RegisterPage onGoToLogin={() => setAuthView('login')} />;
            default:
                return <LandingPage onGoToLogin={() => setAuthView('login')} />;
        }
    }

    const contextValue: AppContextType = {
        session, profile, products, logo, addProducts, clearProducts, addLogo, removeLogo,
        generatedImages, addGeneratedImage, deductTokens, setActivePage,
        isGenerating, generationProgress, generationError, runGeneration, clearGenerationError
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="flex h-screen bg-gray-100">
                <Sidebar activePage={activePage} setActivePage={setActivePage} isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
                <div className="flex flex-col flex-1 w-0 h-full">
                    <Header onLogout={handleLogout} onMenuClick={() => setSidebarOpen(true)} />
                    <div className="flex-1 overflow-auto">
                      {renderPage()}
                    </div>
                </div>
            </div>
        </AppContext.Provider>
    );
};

export default App;