import { Handler } from '@netlify/functions';
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

// Gemini AI setup
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("A variável de ambiente API_KEY não está definida para a função serverless.");
}
const ai = new GoogleGenAI({ apiKey });

// Supabase Admin setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("As variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias.");
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// System instruction for prompt enhancement
const enhanceSystemInstruction = `Você é um otimizador de prompts para geração de imagens no Nano-banana.
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
  - Não criar roteiros ou diálogos; apenas gerar prompts de imagem.`;


const handler: Handler = async (event) => {
    // Cabeçalhos CORS
    const headers = {
        'Access-Control-Allow-Origin': '*', // Ou restrinja à origem do seu site
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Chamada de preflight bem-sucedida.' }),
        };
    }

    if (event.httpMethod !== 'POST' || !event.body) {
        return { statusCode: 405, headers, body: 'Método Não Permitido' };
    }

    try {
        const { action, payload } = JSON.parse(event.body);

        if (action === 'updateUserTokens') {
            const { userId, newBalance } = payload;
            if (!userId || typeof newBalance !== 'number') {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId e newBalance são necessários.' }) };
            }

            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ token_balance: newBalance })
                .eq('id', userId)
                .select()
                .single();
            
            if (error) throw new Error(`Falha ao atualizar tokens no Supabase: ${error.message}`);

            return { statusCode: 200, headers, body: JSON.stringify(data) };

        } else if (action === 'deleteUser') {
            const { userId } = payload;
            if (!userId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId é necessário.' }) };
            }

            const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (error) throw new Error(`Falha ao excluir usuário no Supabase: ${error.message}`);
            
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'Usuário excluído com sucesso.' }) };

        } else if (action === 'generateImage') {
            const { prompt, referenceImage } = payload;
            if (!prompt || !referenceImage) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt ou referenceImage ausente' }) };
            }

            // Step 1: Enhance the prompt automatically
            const enhanceResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: enhanceSystemInstruction,
                },
            });
            const enhancedPrompt = enhanceResponse.text.trim();

            // Step 2: Use the enhanced prompt to generate the image
            const imagePart = {
                inlineData: {
                    data: referenceImage.imageBase64,
                    mimeType: referenceImage.mimeType,
                },
            };
            const textPart = { text: enhancedPrompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [imagePart, textPart] },
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            const candidate = response.candidates?.[0];

            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType }),
                        };
                    }
                }
            }
            
            if (candidate?.finishReason === 'SAFETY') {
                throw new Error("A geração da imagem foi bloqueada por políticas de segurança. Por favor, tente um prompt diferente.");
            }
        
            throw new Error("Nenhum dado de imagem encontrado na resposta da IA. O modelo pode não ter conseguido processar o seu pedido.");

        } else if (action === 'enhancePrompt') {
            const { prompt } = payload;
            if (!prompt) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt ausente' }) };
            }
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: enhanceSystemInstruction,
                },
            });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ text: response.text.trim() }),
            };
        } else {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ação inválida' }) };
        }
    } catch (error: any) {
        console.error("Erro na função Gemini:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message || "Ocorreu um erro interno no servidor." }),
        };
    }
};

export { handler };