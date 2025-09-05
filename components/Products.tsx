
import React, { useState, useCallback, useContext } from 'react';
import { AppContext } from '../App';
import { Product } from '../types';
import { UploadIcon } from './icons';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};

const Products: React.FC = () => {
    const { products, addProducts, clearProducts } = useContext(AppContext)!;
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        
        setError(null);
        let validFiles: File[] = [];
        let localError = null;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (products.length + validFiles.length >= 7) {
                localError = "Você pode enviar no máximo 7 imagens.";
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
            const newProducts: Product[] = await Promise.all(
                validFiles.map(async (file) => ({
                    id: `${file.name}-${Date.now()}`,
                    name: file.name.split('.')[0],
                    imageBase64: await fileToBase64(file),
                    mimeType: file.type,
                }))
            );
            addProducts(newProducts);
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
    }, [products]);

    return (
        <div className="p-8 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800">Upload de Produtos</h1>
            <p className="mt-1 text-gray-600">Faça upload das imagens dos seus produtos</p>

            <div className="p-4 mt-6 text-sm text-blue-800 bg-blue-100 border border-blue-200 rounded-lg">
                <i className="fas fa-info-circle mr-2"></i>
                <strong>Dica para melhores resultados:</strong> Para a IA, use fotos bem focadas com fundo branco ou transparente. Isso permite que a IA identifique melhor o produto e gere imagens mais precisas.
            </div>
            
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-700">Upload de Produtos</h2>
                <div className="p-6 mt-4 bg-white border border-gray-200 rounded-lg">
                    <label 
                        htmlFor="file-upload" 
                        className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer ${isDragging ? 'border-amber-500 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                    >
                        <div className="text-center">
                            <UploadIcon className="w-12 h-12 mx-auto text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium text-gray-700">Selecione suas imagens</h3>
                            <p className="mt-1 text-sm text-gray-500">Até 7 imagens, máximo 2MB cada</p>
                             <p className="mt-4 text-sm text-gray-500">
                                <span className="font-semibold text-amber-600">Escolher arquivos</span> Nenhum arquivo escolhido
                            </p>
                        </div>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept="image/png, image/jpeg" onChange={(e) => handleFileChange(e.target.files)} />
                    </label>
                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
                                <img src={`data:${product.mimeType};base64,${product.imageBase64}`} alt={product.name} className="object-cover w-full h-32" />
                                <div className="p-2">
                                    <p className="text-sm font-medium text-gray-700 truncate">{product.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                     <div className="flex justify-center mt-6">
                        <button className="px-12 py-3 font-semibold text-white bg-amber-500 rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                            Enviar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;