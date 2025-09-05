import { createClient } from '@supabase/supabase-js';

// FIX: Switched to process.env to access environment variables, resolving TypeScript
// errors with `import.meta.env`. The vite.config.ts file has been updated to
// expose these variables to the client-side code.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or Anon Key is missing. Check your environment variables.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);