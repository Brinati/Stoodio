import { createClient } from '@supabase/supabase-js';

// Lê as variáveis do ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing. Please check your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
