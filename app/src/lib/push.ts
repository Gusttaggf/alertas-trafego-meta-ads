import 'server-only';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { montarNotificacao } from '@/lib/avisos';
import type { TipoAviso } from '@/lib/dados';

import type { Notificacao } from '@/lib/avisos';
export type { Notificacao };

/** Chaves VAPID das notificações. Criadas uma vez e guardadas em configuracoes (só o servidor lê). */
export async function chavesVapid(): Promise<{ publica: string; privada: string }> {
  const db = supabaseAdmin();
  const { data } = await db.from('configuracoes').select('vapid_publica, vapid_privada').eq('id', 1).single();
  if (data?.vapid_publica && data?.vapid_privada) return { publica: data.vapid_publica, privada: data.vapid_privada };
  const k = webpush.generateVAPIDKeys();
  // Grava só se ainda estiver vazio (duas chamadas ao mesmo tempo não trocam a chave de quem já ativou).
  const { data: gravado } = await db.from('configuracoes').update({ vapid_publica: k.publicKey, vapid_privada: k.privateKey })
    .eq('id', 1).is('vapid_publica', null).select('vapid_publica, vapid_privada').maybeSingle();
  if (gravado) return { publica: gravado.vapid_publica, privada: gravado.vapid_privada };
  return chavesVapid();
}

/** Manda para todos os aparelhos da pessoa. Aparelhos que não existem mais são apagados. */
export async function enviarParaPessoa(pessoaId: string, n: Notificacao): Promise<number> {
  const db = supabaseAdmin();
  const { data: aparelhos } = await db.from('push_inscricoes').select('id, endpoint, p256dh, auth').eq('pessoa_id', pessoaId);
  if (!aparelhos?.length) return 0;
  const { publica, privada } = await chavesVapid();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://gestor-estrategista.vercel.app', publica, privada);
  let enviados = 0;
  await Promise.all(aparelhos.map(async (a) => {
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(n), { TTL: 6 * 3600, urgency: 'high' });
      enviados++;
      await db.from('push_inscricoes').update({ ultimo_envio: new Date().toISOString() }).eq('id', a.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from('push_inscricoes').delete().eq('id', a.id);
    }
  }));
  return enviados;
}

/**
 * Notifica os avisos que acabaram de ficar visíveis e ainda não foram notificados.
 * Cada pessoa recebe uma notificação só, com o resumo das contas dela (gestor responsável e inscrições).
 */
export async function notificarAvisosNovos(agora = new Date()) {
  const db = supabaseAdmin();
  const ontem = new Date(agora.getTime() - 36 * 3600 * 1000).toISOString();
  const { data: avisos } = await db.from('avisos').select('id, conta_id, tipo, horario')
    .is('notificado_em', null).is('resolvido_em', null).lte('visivel_em', agora.toISOString()).gte('visivel_em', ontem);
  if (!avisos?.length) return { avisos: 0, pessoas: 0, aparelhos: 0 };

  const contaIds = [...new Set(avisos.map((a) => a.conta_id as string))];
  const [{ data: contas }, { data: inscr }] = await Promise.all([
    db.from('contas').select('id, nome, gestor_id').in('id', contaIds),
    db.from('inscricoes').select('pessoa_id, conta_id').in('conta_id', contaIds),
  ]);
  const contaDe = new Map((contas || []).map((c) => [c.id as string, c]));
  const porPessoa = new Map<string, { conta: string; tipo: TipoAviso; horario: string }[]>();
  for (const a of avisos) {
    const c = contaDe.get(a.conta_id as string);
    if (!c) continue;
    const quem = new Set<string>([...(c.gestor_id ? [c.gestor_id as string] : []), ...(inscr || []).filter((i) => i.conta_id === c.id).map((i) => i.pessoa_id as string)]);
    for (const p of quem) {
      const lista = porPessoa.get(p) || [];
      lista.push({ conta: c.nome as string, tipo: a.tipo as TipoAviso, horario: String(a.horario).slice(0, 5) });
      porPessoa.set(p, lista);
    }
  }
  let aparelhos = 0;
  for (const [pessoa, itens] of porPessoa) aparelhos += await enviarParaPessoa(pessoa, montarNotificacao(itens));
  await db.from('avisos').update({ notificado_em: agora.toISOString() }).in('id', avisos.map((a) => a.id as string));
  return { avisos: avisos.length, pessoas: porPessoa.size, aparelhos };
}
