import { createClient } from '@supabase/supabase-js';

// These should be in your environment variables, but for now, we'll use the ones you provided.
const supabaseUrl = 'https://dmzuablzbrxzguxzivlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenVhYmx6YnJ4emd1eHppdmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMjU1OTYsImV4cCI6MjA3MjYwMTU5Nn0.JQatNyQ6yH5cSnij8yn9sbAIa1KZzmj3skCB_HLQASM';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase URL or Anon Key is missing. Please check your configuration.");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
