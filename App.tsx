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


const PlaceholderPage: React.FC<{title: string}> = ({title}) => (
    <div className="flex items-center justify-center w-full h-full p-8 bg-gray-50">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-400">{title}</h1>
            <p className="mt-2 text-gray-500">Esta página está em construção.</p>
        </div>
    </div>
);

type AuthView = 'landing' | 'login' | 'register';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [authView, setAuthView] = useState<AuthView>('landing');
    const [activePage, setActivePage] = useState<Page>('studio');
    const [products, setProducts] = useState<Product[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setLoadingSession(false);
        };

        fetchSession();
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session?.user) {
                // Fetch Profile
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (profileError) {
                    console.error('Error fetching profile:', profileError);
                    setProfile(null);
                } else {
                    setProfile(profileData);
                }

                // Fetch Generated Images
                const { data: imagesData, error: imagesError } = await supabase
                    .from('generated_images')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });
                
                if (imagesError) {
                    console.error('Error fetching generated images:', imagesError);
                } else if (imagesData) {
                    const loadedImages = imagesData.map(img => {
                        const { data: { publicUrl } } = supabase.storage.from('generated_images').getPublicUrl(img.image_path);
                        return {
                            id: img.id,
                            prompt: img.prompt,
                            src: publicUrl,
                            image_path: img.image_path,
                        };
                    });
                    setGeneratedImages(loadedImages);
                }

                // Fetch Products
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: true });

                if (productsError) {
                    console.error('Error fetching products:', productsError);
                } else if (productsData) {
                    const loadedProducts = productsData.map(p => {
                        const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(p.image_path);
                        return {
                            id: p.id,
                            name: p.name,
                            mimeType: p.mime_type,
                            src: publicUrl,
                            image_path: p.image_path,
                        };
                    });
                    setProducts(loadedProducts);
                }

            } else {
                setProfile(null);
                setProducts([]);
                setGeneratedImages([]);
            }
        });
        
        return () => subscription?.unsubscribe();
    }, []);


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

    const addGeneratedImage = useCallback((image: GeneratedImage) => {
        setGeneratedImages(prev => [image, ...prev]);
    }, []);

    const deductTokens = async (amount: number): Promise<boolean> => {
        if (!profile || !session?.user) return false;

        const newBalance = profile.token_balance - amount;
        if (newBalance < 0) return false;

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

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            // The onAuthStateChange listener will handle clearing most session state.
            // Explicitly clear state here for immediate UI feedback.
            setSession(null);
            setProfile(null);
            setProducts([]);
            setGeneratedImages([]);
            setActivePage('studio');
            setAuthView('landing'); // Redirect to landing page
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
            case 'settings': return <PlaceholderPage title="Configurações" />;
            case 'admin': 
                return profile?.role === 'super_admin' ? <AdminPage /> : <PlaceholderPage title="Acesso Negado" />;
            default: return <Studio />;
        }
    };

    if (loadingSession) {
        return <div className="flex items-center justify-center h-screen bg-gray-50"></div>; // Or a proper loading spinner
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

    return (
        <AppContext.Provider value={{ session, profile, products, addProducts, clearProducts, generatedImages, addGeneratedImage, deductTokens }}>
            <div className="flex h-screen bg-gray-100">
                <Sidebar activePage={activePage} setActivePage={setActivePage} />
                <div className="flex flex-col flex-1 w-0 h-full">
                    <Header onLogout={handleLogout} />
                    <div className="flex-1 overflow-auto">
                      {renderPage()}
                    </div>
                </div>
            </div>
        </AppContext.Provider>
    );
};

export default App;
