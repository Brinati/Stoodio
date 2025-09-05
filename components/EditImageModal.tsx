import React, { useState } from 'react';
import { GeneratedImage } from '../types';
import { enhancePrompt } from '../services/geminiService';
import { WandIcon } from './icons';

interface EditImageModalProps {
    image: GeneratedImage;
    onClose: () => void;
    onEdit: (image: GeneratedImage, prompt: string) => Promise<void>;
    onDownload: (src: string, name: string) => void;
}

const EditImageModal: React.FC<EditImageModalProps> = ({ image, onClose, onEdit, onDownload }) => {
    const [prompt, setPrompt] = useState(image.prompt);
    const [isEditing, setIsEditing] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEnhance = async () => {
        if (!prompt) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePrompt(prompt);
            setPrompt(enhanced);
        } catch (e) {
            console.error(e);
        } finally {
            setIsEnhancing(false);
        }
    };
    
    const handleEdit = async () => {
        if (!prompt) {
            setError("O prompt não pode estar vazio.");
            return;
        }
        setIsEditing(true);
        setError(null);
        try {
            await onEdit(image, prompt);
            onClose();
        } catch(err: any) {
            setError(err.message || "Falha ao editar a imagem.");
        } finally {
            setIsEditing(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="relative w-full max-w-4xl p-8 bg-white rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute text-3xl top-4 right-5 text-gray-400 hover:text-gray-600">&times;</button>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {/* Image Preview Column */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-800">Visualizar Imagem</h3>
                        <div className="flex-grow mt-4 flex items-center justify-center p-4 border rounded-md bg-gray-50">
                            <img src={image.src} alt="Editing preview" className="object-contain w-full rounded-md max-h-[400px]" />
                        </div>
                         <button 
                            onClick={() => onDownload(image.src, 'stoodio-image.png')} 
                            className="w-full px-6 py-3 mt-4 font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                         >
                            Download
                        </button>
                    </div>
                    {/* Editing Column */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-semibold text-gray-800">Editar Prompt</h3>
                        <div className="flex flex-col flex-grow mt-4">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-full p-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 min-h-[200px]"
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleEnhance}
                                    disabled={!prompt || isEnhancing}
                                    className="flex items-center px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-100 rounded-md hover:bg-amber-200 disabled:opacity-50"
                                >
                                    <WandIcon className={`w-4 h-4 mr-2 ${isEnhancing ? 'animate-spin' : ''}`} />
                                    {isEnhancing ? 'Aprimorando...' : 'Aprimorar'}
                                </button>
                            </div>
                        </div>
                        <div className="mt-6">
                            <button onClick={handleEdit} disabled={isEditing} className="w-full px-6 py-3 font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:bg-gray-400">
                                 {isEditing ? 'Gerando...' : 'Gerar Nova Versão (16 tokens)'}
                            </button>
                             {error && <p className="mt-2 text-sm text-center text-red-600">{error}</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditImageModal;
