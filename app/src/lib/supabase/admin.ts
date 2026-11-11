import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Cliente com a chave service_role: ignora RLS. Só para o servidor,
 * para ler e gravar o token do Meta (tabela meta_conexoes não tem política pública).
 */
export function supabaseAdmin() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
