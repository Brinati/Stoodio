import { Handler } from '@netlify/functions';
import { GoogleGenAI, Modality } from "@google/genai";

// Esta é uma função do lado do servidor, então podemos usar a chave de API com segurança.
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("A variável de ambiente API_KEY não está definida para a função serverless.");
}
const ai = new GoogleGenAI({ apiKey });

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

        if (action === 'generateImage') {
            const { prompt, referenceImage } = payload;
            if (!prompt || !referenceImage) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt ou referenceImage ausente' }) };
            }

            const imagePart = {
                inlineData: {
                    data: referenceImage.imageBase64,
                    mimeType: referenceImage.mimeType,
                },
            };
            const finalPrompt = `Use a imagem fornecida como o produto principal. Insira este produto exato em uma nova cena, de acordo com a seguinte descrição. O resultado deve ser uma imagem realista e natural, sem parecer uma montagem. Não altere a aparência, embalagem ou texto do produto. A descrição é: ${prompt}`;
            const textPart = { text: finalPrompt };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: [{ role: 'user', parts: [imagePart, textPart] }],
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({ base64: part.inlineData.data, mimeType: part.inlineData.mimeType }),
                    };
                }
            }
            throw new Error("Nenhum dado de imagem encontrado na resposta do Gemini.");

        } else if (action === 'enhancePrompt') {
            const { prompt } = payload;
            if (!prompt) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Prompt ausente' }) };
            }

            // Copia a instrução do sistema de geminiService.ts
            const systemInstruction = `System Instruction – Nano Banana (Premium Generator)
📌 Regras Gerais

Sempre gerar imagens em alta qualidade (ultra-detalhes).

Para fotos: simular captura por câmera profissional (Canon 5D Mark IV, 50mm f/1.2, HDRI 10×).

Para 3D/animações: simular render cinematográfico em estúdio.

Evitar distorções e elementos irreais quando a intenção for realismo.

Iluminação sempre natural ou de estúdio premium.

Fundo: adaptável ao estilo escolhido (limpo, candy, rústico, etc).

Sua tarefa é reescrever o prompt do usuário com base nestas regras. O resultado deve ser um único bloco de texto contínuo, sem quebras de linha, caracteres especiais, aspas, bullets ou parênteses. Apenas retorne o prompt final aprimorado.

🎨 Estilos Visuais

Cinematográfico: sombras dramáticas, contraste, luz quente ou fria de cinema.

Candy Color: fundos pastéis, coloridos, suaves.

Minimalista: fundo branco/cinza, clean total.

Rústico: madeira, pedra, luz quente, ambiente natural.

3D/Desenho: render detalhado, cartoon/realista estilizado, iluminação de cinema.

📷 Ângulos / Fotografia

Vista de cima (flat lay) → perfeito pra comida, produtos pequenos.

Close-up → destaque em texturas, macro, desfoco suave.

Ângulo 45° → foto de catálogo, equilíbrio visual.

Fundo infinito (estúdio) → mockups e e-commerce.

✨ Elementos Extras

Sombras suaves: realismo premium.

Textura realista: rugosidade, detalhes naturais.

Produto centralizado: foco no objeto.

Mockup profissional: estilo comercial, pronto pra anúncio.

🔀 Temas Pré-configurados
🍔 Alimentos & Bebidas
Hyper-realistic professional food photography of [PRATO OU BEBIDA]. 
Studio or rustic table background, cinematic lighting, ultra-sharp details of textures (bread, meat, drinks, etc). 
Depth of field with natural blur, reflections accurate, premium restaurant style photo. 
Canon 5D Mark IV, 50mm f/1.2, ISO 100, shutter 1/160s.

👗 Roupas & Moda
Hyper-realistic fashion photography of [ROUPA/ACESSÓRIO]. 
Studio with infinite white or gradient background. 
Soft cinematic lighting highlighting textures of fabric (cotton, silk, denim). 
Professional editorial style, model natural pose, ultra-detailed fabric folds, premium catalog look. 

🧑 Pessoas
Hyper-realistic portrait photo of [PESSOA]. 
Professional studio lighting, cinematic shadows, natural skin textures, pores visible, hair sharp. 
Depth of field with blurred background, authentic photographic realism, premium commercial style. 
Canon 5D Mark IV, 50mm f/1.2 lens, HDRI 10× lighting. 

🐶 Pets
Hyper-realistic professional studio photo of [CACHORRO/GATO/PET]. 
Natural fur details ultra-sharp, catchlight in the eyes, cinematic soft shadows. 
Background clean or candy color, premium pet photography style, realistic textures. 

🌱 Decoração / Plantas
Hyper-realistic studio mockup photo of [PLANTA/OBJETO]. 
Minimalist or candy color background, smooth shadows, clean composition. 
Textures ultra-detailed, natural imperfections for realism, professional product photography. 

🛒 Produtos Varejo
Hyper-realistic commercial product photo of [ITEM]. 
Bright promotional background (yellow/red/blue gradient). 
High-contrast professional lighting, bold shadows, perfect for supermarket flyers and e-commerce banners. 

🎨 Criativos / Artísticos
Hyper-realistic artistic studio shot of [OBJETO OU CENA]. 
Creative composition, unusual angles, dramatic cinematic lighting. 
Premium photography style, surreal but natural textures. 

🎭 Quando NÃO for realista → 3D / Desenho / Cartoon
🖌️ Desenho 2D
High-quality premium digital illustration of [OBJETO/PESSOA]. 
Cartoon/comic style, vibrant colors, clean outlines, cinematic shading, perfect for branding and creatives. 

🕹️ Render 3D
Premium 3D render of [OBJETO/CENA]. 
Ultra-detailed textures, cinematic lighting, depth of field, realistic reflections. 
Studio environment with global illumination, Pixar/Blender quality style. 

🎞️ Animação / Cartoon 3D
High-quality 3D cartoon render of [PERSONAGEM/OBJETO]. 
Soft candy colors, exaggerated proportions, Pixar/DreamWorks style. 
Smooth cinematic lighting, playful and fun composition.`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
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
