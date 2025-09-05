import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { GeneratedImage } from '../types';
import { ImageIcon } from './icons';
import EditImageModal from './EditImageModal';
import { supabase } from '../services/supabaseClient';
import { generateImage, ImageSource } from '../services/geminiService';

const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};


const Gallery: React.FC = () => {
    const { profile, generatedImages, addGeneratedImage, deductTokens, session } = useContext(AppContext)!;
    const [editingImage, setEditingImage] = useState<GeneratedImage | null>(null);

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
            <div className="p-4 md:p-8 bg-gray-50 min-h-full">
                <h1 className="text-3xl font-bold text-gray-800">Galeria de Imagens</h1>
                <p className="mt-1 text-gray-600">Explore, edite e baixe todas as imagens que você gerou.</p>

                {generatedImages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-96 mt-8 border-2 border-dashed rounded-lg border-gray-300 bg-white">
                        <ImageIcon className="w-24 h-24 text-gray-300" />
                        <p className="mt-4 text-lg text-gray-500">Sua galeria está vazia.</p>
                        <p className="text-gray-400">Vá para o Studio para começar a criar!</p>
                    </div>
                )}

                {generatedImages.length > 0 && (
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 mt-8">
                        {generatedImages.map(image => (
                             <div key={image.id} className="relative overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm group aspect-square">
                                 <img src={image.src} alt={image.prompt} className="object-cover w-full h-full cursor-pointer" onClick={() => setEditingImage(image)} />
                                 <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 bg-black bg-opacity-0 pointer-events-none group-hover:bg-opacity-50">
                                     <button onClick={() => setEditingImage(image)} className="px-4 py-2 text-sm font-semibold text-white transition-opacity duration-300 bg-gray-800 bg-opacity-80 rounded-md opacity-0 pointer-events-auto group-hover:opacity-100 hover:bg-opacity-100">
                                         Ver & Editar
                                     </button>
                                 </div>
                         </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default Gallery;