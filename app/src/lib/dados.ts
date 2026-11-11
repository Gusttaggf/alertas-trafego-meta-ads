import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Conta, Pessoa } from '@/lib/permissoes';

export type Configuracoes = {
  horarios: string[];
  dias_min_saldo: number;
  pct_custo_alto: number;
  tolerancia_orc_meta: number;
  tolerancia_orc_google: number;
  gasto_min_custo: number;
  pct_ruim_2_semanas: number;
  gasto_min_ruim: number;
};

function checar<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export async function listarPessoas(): Promise<Pessoa[]> {
  return checar(await supabaseAdmin().from('pessoas').select('id, nome, email, papel, head_id').order('nome'));
}

export async function listarContas(): Promise<Conta[]> {
  return checar(await supabaseAdmin().from('contas')
    .select('id, plataforma, id_externo, nome, head_id, gestor_id').eq('ativa', true).order('nome'));
}

export async function lerConfiguracoes(): Promise<Configuracoes> {
  const c = checar(await supabaseAdmin().from('configuracoes').select('*').eq('id', 1).single()) as Record<string, unknown>;
  return {
    horarios: (c.horarios as string[]).map((h) => h.slice(0, 5)),
    dias_min_saldo: Number(c.dias_min_saldo),
    pct_custo_alto: Number(c.pct_custo_alto),
    tolerancia_orc_meta: Number(c.tolerancia_orc_meta),
    tolerancia_orc_google: Number(c.tolerancia_orc_google),
    gasto_min_custo: Number(c.gasto_min_custo),
    pct_ruim_2_semanas: Number(c.pct_ruim_2_semanas),
    gasto_min_ruim: Number(c.gasto_min_ruim),
  };
}

/** Conexão do Meta da agência: a mais recente feita por um administrador. */
export async function conexaoMetaDaAgencia() {
  const db = supabaseAdmin();
  const admins = checar(await db.from('pessoas').select('id').eq('papel', 'administrador')) as { id: string }[];
  if (!admins.length) return null;
  const { data } = await db.from('meta_conexoes')
    .select('user_id, token, fb_nome, expira_em, atualizado_em')
    .in('user_id', admins.map((a) => a.id))
    .order('atualizado_em', { ascending: false }).limit(1).maybeSingle();
  return data as null | { user_id: string; token: string; fb_nome: string; expira_em: string | null };
}
