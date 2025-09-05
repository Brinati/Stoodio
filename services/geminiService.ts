import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Lazily initialize the AI client to prevent app crash on load if API key is missing.
const getAiClient = (): GoogleGenAI => {
    if (ai) {
        return ai;
    }
    
    // The user's build environment (e.g., Netlify) needs to provide this environment variable.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY environment variable not set. The application will not be able to connect to Google AI services.");
        throw new Error("A chave de API do Google AI não está configurada. Por favor, contate o suporte.");
    }

    ai = new GoogleGenAI({ apiKey });
    return ai;
};


export interface ImageSource {
    imageBase64: string;
    mimeType: string;
}

export const generateImage = async (prompt: string, referenceImage: ImageSource): Promise<{base64: string, mimeType: string} | null> => {
    try {
        const aiClient = getAiClient();
        const imagePart = {
            inlineData: {
                data: referenceImage.imageBase64,
                mimeType: referenceImage.mimeType,
            },
        };

        const finalPrompt = `Use a imagem fornecida como o objeto principal. A imagem contém um produto. Coloque este produto exato em uma nova cena de acordo com a seguinte descrição. Não altere a aparência, embalagem ou texto do produto. A descrição é: ${prompt}`;

        const textPart = {
            text: finalPrompt,
        };

        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: [{
                role: 'user',
                parts: [imagePart, textPart],
            }],
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        // Propagate the specific API key error message, otherwise show a generic one.
        if (error instanceof Error && error.message.includes("A chave de API")) {
             throw error;
        }
        throw new Error("Falha ao gerar a imagem. Verifique seu prompt ou a configuração da API.");
    }
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    try {
        const aiClient = getAiClient();
        const systemInstruction = `Você é um otimizador de prompts para geração de imagens no Nano-banana.
Receberá um prompt livre escrito pelo usuário.
Sua tarefa é reescrever esse prompt em um único bloco de texto contínuo, sem caracteres especiais, sem aspas, sem bullets, sem colchetes ou parênteses.
Mantenha apenas a descrição clara da cena e adicione ajustes que garantam melhor qualidade de imagem.
Sempre normalize para o estilo: cinematográfico, realista, iluminação de cinema, qualidade premium, mockup profissional, apresentação de e-commerce.
Inclua o formato e proporção corretos se o usuário informar (ex: 1080x1350 4:5 ou 1080x1920 9:16).
Nunca adicione explicações ou quebras de linha, apenas retorne o prompt final pronto para envio ao Nano-banana.

Padrões:
- Se as instruções forem vagas, posicione o produto ou personagem em um cenário cotidiano que faça sentido.
- Se estilo ou ambiente não forem definidos, assuma realismo casual UGC.

Princípios do Realismo UGC:
- Aparência natural e realista.
- Clima de foto de celular: enquadramento descentralizado, leve desfoque de movimento, luz interna mista, granulação leve.
- Aceite imperfeições: rugas, fios de cabelo soltos, textura de pele, cenários comuns.
- Texto visível em embalagens deve ser reproduzido exatamente, sem inventar palavras, números ou selos.

Indicações de Câmera (use ao menos 2-3 por prompt):
"composição descentralizada"
- "luz natural interna", "sombras suaves", "leve desfoque de movimento"
- "exposição automática", "visual cru", "granulação leve"

Regras de Segurança:
- Não nomear personagens com direitos autorais.
- Não criar roteiros ou diálogos; apenas gerar prompts de imagem.

Escreva um prompt que impressione o Usuario.`;
        
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        if (error instanceof Error && error.message.includes("A chave de API")) {
             throw error;
        }
        throw new Error("Falha ao aprimorar o prompt com a IA.");
    }
};