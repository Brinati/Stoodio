import { Handler } from '@netlify/functions';
import { GoogleGenAI, Modality } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

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
    
    // Lida com a requisição preflight do CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Chamada de preflight bem-sucedida.' }),
        };
    }

    // Validação de variáveis de ambiente com mensagens de erro claras
    const apiKey = process.env.API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    // SOLUÇÃO: Hardcoding das chaves Supabase para contornar problemas de configuração de ambiente.
    const supabaseUrl = 'https://dmzuablzbrxzguxzivlr.supabase.co';
    const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenVhYmx6YnJ4emd1eHppdmxyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAyNTU5NiwiZXhwIjoyMDcyNjAxNTk2fQ.hDV5rzhbwggzcPAndAhoe6keuoXv89anz5JlseU1BvQ';

    const missingEnvs = [];
    if (!apiKey) missingEnvs.push('API_KEY');

    if (missingEnvs.length > 0) {
        const errorMsg = `O servidor não está configurado corretamente. Faltam as seguintes variáveis de ambiente: API_KEY. Certifique-se de que a API_KEY do Gemini está configurada no seu ambiente Netlify.`;
        console.error(errorMsg);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: errorMsg }),
        };
    }

    if (event.httpMethod !== 'POST' || !event.body) {
        return { statusCode: 405, headers, body: 'Método Não Permitido' };
    }

    try {
        // Initialize clients now that ENV vars are confirmed
        const ai = new GoogleGenAI({ apiKey });
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

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

            // Etapa 1: Aprimorar o prompt automaticamente
            const enhanceResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: enhanceSystemInstruction,
                },
            });
            const enhancedPrompt = enhanceResponse.text.trim();

            // Etapa 2: Usar o prompt aprimorado para gerar a imagem
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

        } else if (action === 'generateImageFromText') {
            const { prompt } = payload;
            if (!prompt) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt ausente' }) };
            }
            
            const enhanceResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: enhanceSystemInstruction,
                },
            });
            const enhancedPrompt = enhanceResponse.text.trim();

            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: enhancedPrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                },
            });
    
            const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    
            if (base64ImageBytes) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ base64: base64ImageBytes, mimeType: 'image/jpeg' }),
                };
            }
            
            throw new Error("Nenhum dado de imagem encontrado na resposta da IA para text-to-image.");

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