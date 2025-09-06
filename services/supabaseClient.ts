import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente não estão sendo injetadas corretamente no processo de build.
// Para desbloquear o uso do aplicativo, as chaves públicas estão sendo
// definidas diretamente aqui. O ideal é corrigir a configuração de build do Netlify
// para usar as variáveis de ambiente.
const supabaseUrl = 'https://dmzuablzbrxzguxzivlr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtenVhYmx6YnJ4emd1eHppdmxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMjU1OTYsImV4cCI6MjA3MjYwMTU5Nn0.JQatNyQ6yH5cSnij8yn9sbAIa1KZzmj3skCB_HLQASM';


if (!supabaseUrl || !supabaseAnonKey) {
    // This check is kept in case the hardcoded values are accidentally removed.
    const errorMessage = "As credenciais do Supabase não estão definidas no código. O aplicativo não pode ser inicializado.";
    console.error(errorMessage);
    throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);