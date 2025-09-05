

import React, { useState, useCallback, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Product } from '../types';
import { UploadIcon } from './icons';
import { supabase } from '../services/supabaseClient';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
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

const LogoUploader: React.FC = () => {
    const { logo, addLogo, removeLogo, session } = useContext(AppContext)!;
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogoChange = async (file: File | null) => {
        if (!file) return;
        setError(null);

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            setError(`O arquivo ${file.name} excede o limite de 2MB.`);
            return;
        }

        setIsUploading(true);
        try {
            if (!session?.user) throw new Error("Usuário não autenticado.");

            const logoData = {
                name: 'logo',
                imageBase64: await fileToBase64(file),
                mimeType: file.type,
                type: 'logo' as const,
            };

            const blob = base64ToBlob(logoData.imageBase64, logoData.mimeType);
            const fileExt = logoData.mimeType.split('/')[1] || 'png';
            const fileName = `logo-${crypto.randomUUID()}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('products').upload(filePath, blob);
            if (uploadError) throw uploadError;

            const { data: dbData, error: dbError } = await supabase
                .from('products')
                .insert({
                    user_id: session.user.id,
                    name: logoData.name,
                    image_path: filePath,
                    mime_type: logoData.mimeType,
                    type: 'logo',
                })
                .select()
                .single();
            if (dbError) throw dbError;

            const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);

            const savedLogo: Product = {
                id: dbData.id,
                name: logoData.name,
                mimeType: logoData.mimeType,
                imageBase64: logoData.imageBase64,
                src: publicUrl,
                image_path: filePath,
                type: 'logo'
            };
            
            await addLogo(savedLogo);

        } catch (err: any) {
            setError(err.message || "Falha ao salvar o logo.");
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };
    
    return (
        <div className="p-6 bg-white border border-gray-200 rounded-lg h-full">
            <h2 className="text-xl font-semibold text-gray-700">Logo da Marca</h2>
            <p className="mt-1 text-sm text-gray-500">Faça o upload do seu logo para usá-lo nas gerações.</p>
            <div className="mt-4">
                {logo ? (
                    <div className="flex items-center gap-4 p-4 border rounded-lg">
                        <img src={logo.src} alt="Logo" className="w-16 h-16 object-contain" />
                        <div className="flex-grow">
                            <p className="font-semibold">Logo atual</p>
                            <p className="text-xs text-gray-500 truncate">{logo.image_path?.split('/').pop()}</p>
                        </div>
                        <button onClick={removeLogo} className="flex-shrink-0 text-sm font-medium text-red-600 hover:text-red-800">
                           Remover
                        </button>
                    </div>
                ) : (
                    <label 
                        htmlFor="logo-upload" 
                        className="relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100"
                    >
                         {isUploading ? (
                            <div className="text-center">
                                <div className="w-8 h-8 mx-auto border-2 border-t-2 rounded-full border-t-amber-500 border-gray-200 animate-spin"></div>
                                <p className="mt-2 text-sm text-gray-500">Enviando...</p>
                            </div>
                        ) : (
                             <div className="text-center">
                                <UploadIcon className="w-10 h-10 mx-auto text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">
                                    <span className="font-semibold text-amber-600">Escolher logo</span> ou arraste
                                </p>
                            </div>
                        )}
                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/svg+xml" onChange={(e) => handleLogoChange(e.target.files?.[0] || null)} disabled={isUploading} />
                    </label>
                )}
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
        </div>
    );
};


const Products: React.FC = () => {
    const { products, addProducts, clearProducts, session } = useContext(AppContext)!;
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setError(null);
        let validFiles: File[] = [];
        let localError = null;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (products.length + validFiles.length >= 7) {
                localError = "Você pode enviar no máximo 7 imagens de produto.";
                break;
            }
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                localError = `O arquivo ${file.name} excede o limite de 2MB.`;
                continue; // Skip this file
            }
            validFiles.push(file);
        }

        if(localError) setError(localError);

        if (validFiles.length > 0) {
            setIsUploading(true);
            try {
                if (!session?.user) throw new Error("Usuário não autenticado. Faça login para salvar produtos.");

                const newProductsData = await Promise.all(
                    validFiles.map(async (file) => ({
                        name: file.name.split('.')[0],
                        imageBase64: await fileToBase64(file),
                        mimeType: file.type,
                    }))
                );

                const savedProducts: Product[] = [];
                for (const productData of newProductsData) {
                    if (!productData.imageBase64) continue;

                    const blob = base64ToBlob(productData.imageBase64, productData.mimeType);
                    const fileExt = productData.mimeType.split('/')[1] || 'png';
                    const fileName = `${crypto.randomUUID()}.${fileExt}`;
                    const filePath = `${session.user.id}/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('products').upload(filePath, blob);
                    if (uploadError) throw uploadError;

                    const { data: dbData, error: dbError } = await supabase
                        .from('products')
                        .insert({
                            user_id: session.user.id,
                            name: productData.name,
                            image_path: filePath,
                            mime_type: productData.mimeType,
                            type: 'product',
                        })
                        .select()
                        .single();

                    if (dbError) throw dbError;

                    const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(filePath);

                    savedProducts.push({
                        id: dbData.id,
                        name: productData.name,
                        mimeType: productData.mimeType,
                        imageBase64: productData.imageBase64,
                        src: publicUrl,
                        image_path: filePath,
                        type: 'product',
                    });
                }
                addProducts(savedProducts);

            } catch (err: any) {
                setError(err.message || "Falha ao salvar produtos.");
                console.error(err);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products, session]);

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800">Upload de Produtos e Logo</h1>
            <p className="mt-1 text-gray-600">Faça upload das imagens dos seus produtos e da sua marca.</p>

            <div className="p-4 mt-6 text-sm text-blue-800 bg-blue-100 border border-blue-200 rounded-lg">
                <i className="fas fa-info-circle mr-2"></i>
                <strong>Dica para melhores resultados:</strong> Para a IA, use fotos bem focadas com fundo branco ou transparente. Isso permite que a IA identifique melhor o produto e gere imagens mais precisas.
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-1">
                    <LogoUploader />
                </div>
                <div className="lg:col-span-2">
                    <div className="p-6 bg-white border border-gray-200 rounded-lg h-full">
                        <h2 className="text-xl font-semibold text-gray-700">Seus Produtos</h2>
                        <label 
                            htmlFor="file-upload" 
                            className={`relative flex flex-col items-center justify-center w-full h-40 mt-4 border-2 border-dashed rounded-lg cursor-pointer ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {isUploading ? (
                                <div className="text-center">
                                    <div className="w-8 h-8 mx-auto border-2 border-t-2 rounded-full border-t-amber-500 border-gray-200 animate-spin"></div>
                                    <h3 className="mt-2 text-sm font-medium text-gray-700">Enviando produtos...</h3>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <UploadIcon className="w-10 h-10 mx-auto text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-500">
                                        <span className="font-semibold text-amber-600">Escolher arquivos</span> ou arraste e solte
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">Até 7 imagens, máximo 2MB cada</p>
                                </div>
                            )}
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e.target.files)} disabled={isUploading} />
                        </label>
                        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                    </div>
                </div>
            </div>

            {products.length > 0 && (
                <div className="mt-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-700">Produtos Enviados ({products.length})</h2>
                        <button 
                            onClick={clearProducts}
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                            <i className="fas fa-times mr-1"></i>
                            Limpar Produtos
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
                        {products.map((product) => (
                            <div key={product.id} className="relative overflow-hidden bg-white border border-gray-200 rounded-lg group">
                                <img src={product.src || `data:${product.mimeType};base64,${product.imageBase64}`} alt={product.name} className="object-cover w-full h-32" />
                                <div className="p-2">
                                    <p className="text-sm font-medium text-gray-700 truncate">{product.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;