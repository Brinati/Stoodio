// FIX: Changed to a type-only import for `Session` to resolve TypeScript module resolution errors.
import type { Session } from '@supabase/supabase-js';

export interface Product {
  id: string;
  name: string;
  mimeType: string;
  type: 'product' | 'logo';
  imageBase64?: string;
  src?: string;
  image_path?: string;
}

export interface Snippet {
  id: string;
  text: string;
  prompt: string;
  icon?: React.ReactNode;
}

export interface SnippetCategory {
  title: string;
  icon?: React.ReactNode;
  snippets: Snippet[];
}

export interface GeneratedImage {
    id: string; // UUID from DB
    src: string; // Public URL from Storage
    prompt: string;
    image_path: string; // Path in storage bucket
}

export type Page = "studio" | "products" | "gallery" | "plans" | "settings" | "admin";

export interface UserProfile {
    id: string;
    username: string;
    full_name: string;
    token_balance: number;
    role?: 'user' | 'super_admin';
}


export interface AppContextType {
  session: Session | null;
  profile: UserProfile | null;
  products: Product[];
  logo: Product | null;
  addProducts: (newProducts: Product[]) => void;
  clearProducts: () => Promise<void>;
  addLogo: (newLogo: Product) => Promise<void>;
  removeLogo: () => Promise<void>;
  generatedImages: GeneratedImage[];
  addGeneratedImage: (image: GeneratedImage) => void;
  deductTokens: (amount: number) => Promise<boolean>; // Returns true on success
  setActivePage: (page: Page) => void;
  // New generation state
  isGenerating: boolean;
  generationProgress: { completed: number; total: number };
  generationError: string | null;
  runGeneration: (prompt: string, products: Product[]) => Promise<void>;
  runTextToImageGeneration: (prompt: string) => Promise<void>;
  clearGenerationError: () => void;
}