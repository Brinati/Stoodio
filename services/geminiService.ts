import { GoogleGenAI, Modality } from "@google/genai";

// Lê a variável do ambiente do Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY environment variable not set. Using a placeholder. Please set your API key for the app to function.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "YOUR_API_KEY_HERE" });

// ... (o resto do arquivo continua igual)
