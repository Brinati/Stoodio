// FIX: Added vite/client type reference to correctly type `import.meta.env`.
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

// Reads Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing. Check your Netlify environment variables.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);