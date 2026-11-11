'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { pessoaAtual } from '@/lib/sessao';
import { listarContas, listarInscricoes } from '@/lib/dados';
import { podeResolver } from '@/lib/permissoes';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Marca (ou reabre) um aviso. Formulário: aviso, voltar (caminho da página). */
export async function alternarResolvido(form: FormData) {
  const eu = await pessoaAtual();
  const voltar = String(form.get('voltar') || '/agenda');
  const destino = voltar.startsWith('/') && !voltar.startsWith('//') ? voltar : '/agenda';
  const db = supabaseAdmin();
  const { data: aviso } = await db.from('avisos').select('id, conta_id, resolvido_em').eq('id', String(form.get('aviso'))).maybeSingle();
  const conta = aviso && (await listarContas()).find((c) => c.id === aviso.conta_id);
  const inscrito = !!conta && (await listarInscricoes(eu.id)).some((i) => i.conta_id === conta.id);
  if (!aviso || !conta || !podeResolver(eu, conta, inscrito)) redirect(destino);
  await db.from('avisos').update(aviso.resolvido_em
    ? { resolvido_em: null, resolvido_por: null }
    : { resolvido_em: new Date().toISOString(), resolvido_por: eu.id }).eq('id', aviso.id);
  revalidatePath('/', 'layout');
  redirect(destino);
}
