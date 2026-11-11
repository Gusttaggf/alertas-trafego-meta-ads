import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ehEmailDeAdministrador, type Pessoa, type Papel } from '@/lib/permissoes';

/**
 * Garante que quem acabou de entrar tem uma linha em pessoas.
 * Novos ficam aguardando acesso, exceto e-mails em ADMIN_EMAILS (viram administrador).
 */
export async function garantirPessoa(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<Pessoa> {
  const email = user.email || '';
  const nome = String(user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Sem nome');
  const admin = ehEmailDeAdministrador(email, process.env.ADMIN_EMAILS);
  // Grava e devolve a linha na mesma chamada: uma nova leitura poderia vir do cache da página.
  const { data, error } = await supabaseAdmin().from('pessoas')
    .upsert({ id: user.id, nome, email }, { onConflict: 'id', ignoreDuplicates: false })
    .select('id, nome, email, papel, head_id').single();
  if (error || !data) throw new Error('Não consegui registrar seu acesso: ' + (error?.message || 'sem resposta'));
  if (admin && data.papel !== 'administrador') {
    const r = await supabaseAdmin().from('pessoas').update({ papel: 'administrador', head_id: null }).eq('id', user.id)
      .select('id, nome, email, papel, head_id').single();
    if (r.error) throw new Error('Não consegui registrar seu acesso: ' + r.error.message);
    return r.data as Pessoa;
  }
  return data as Pessoa;
}

/** Pessoa logada. Sem login, manda para /login. */
export async function pessoaAtual(): Promise<Pessoa> {
  const supabase = await supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const buscar = async () => {
    const { data, error } = await supabaseAdmin().from('pessoas').select('id, nome, email, papel, head_id').eq('id', user.id).maybeSingle();
    if (error) throw new Error('Não consegui ler seu acesso: ' + error.message);
    return data as Pessoa | null;
  };
  // Primeira visita sem passar pelo /auth/callback: registra uma única vez.
  return (await buscar()) ?? (await garantirPessoa(user));
}

/** Exige um dos papéis; senão volta para o início. */
export async function exigirPapel(...papeis: Exclude<Papel, null>[]): Promise<Pessoa> {
  const eu = await pessoaAtual();
  if (!eu.papel || !papeis.includes(eu.papel)) redirect('/');
  return eu;
}
