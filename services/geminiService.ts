// O cliente AI agora está do lado do servidor em uma função Netlify.
// Este arquivo agora fará solicitações para essa função.

export interface ImageSource {
    imageBase64: string;
    mimeType: string;
}

const callApi = async (action: string, payload: any) => {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        const data = await response.json();

        if (!response.ok) {
            // Usa o erro da função serverless se disponível
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`Erro ao chamar a API para a ação "${action}":`, error);
        throw error; // Re-lança para ser capturado pelo componente
    }
};


export const generateImage = async (prompt: string, referenceImage: ImageSource): Promise<{base64: string, mimeType: string} | null> => {
    try {
        const result = await callApi('generateImage', { prompt, referenceImage });
        return result;
    } catch (error) {
        console.error("Error generating image:", error);
        // Cria uma mensagem de erro mais amigável.
        throw new Error("Falha ao gerar a imagem. Verifique seu prompt ou tente novamente mais tarde.");
    }
};

export const generateImageFromText = async (prompt: string): Promise<{base64: string, mimeType: string} | null> => {
    try {
        const result = await callApi('generateImageFromText', { prompt });
        return result;
    } catch (error) {
        console.error("Error generating image from text:", error);
        throw new Error("Falha ao gerar a imagem a partir do texto. Tente novamente mais tarde.");
    }
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    try {
        const result = await callApi('enhancePrompt', { prompt });
        return result.text;
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        throw new Error("Falha ao aprimorar o prompt com a IA.");
    }
};

export const updateUserTokens = async (userId: string, newBalance: number): Promise<any> => {
    try {
        const result = await callApi('updateUserTokens', { userId, newBalance });
        return result;
    } catch (error) {
        console.error("Error updating user tokens:", error);
        throw new Error("Falha ao atualizar os tokens do usuário.");
    }
};

export const deleteUser = async (userId: string): Promise<{ message: string }> => {
    try {
        const result = await callApi('deleteUser', { userId });
        return result;
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Falha ao excluir o usuário.");
    }
};
