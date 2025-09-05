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
    const [logo, setLogo] = useState<Product | null>(null);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [loadingSession, setLoadingSession] = useState(true);

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
            setLogo(null);
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
        <AppContext.Provider value={{ session, profile, products, logo, addProducts, clearProducts, addLogo, removeLogo, generatedImages, addGeneratedImage, deductTokens, setActivePage }}>
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