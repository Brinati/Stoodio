import { createClient } from '@supabase/supabase-js';

// FIX: Switched from `import.meta.env` to `process.env` to resolve TypeScript errors.
// The execution environment is assumed to have these variables available.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing. Check your environment variables.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);