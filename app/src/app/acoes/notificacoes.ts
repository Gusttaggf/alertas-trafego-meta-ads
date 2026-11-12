'use server';

import { pessoaAtual } from '@/lib/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { enviarParaPessoa } from '@/lib/push';

type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Guarda o aparelho da pessoa logada para receber notificações. */
export async function salvarAparelho(sub: Inscricao, aparelho: string) {
  const eu = await pessoaAtual();
  if (!sub?.endpoint?.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false, erro: 'Aparelho inválido.' };
  const { error } = await supabaseAdmin().from('push_inscricoes').upsert({
    pessoa_id: eu.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, aparelho: aparelho.slice(0, 300),
  }, { onConflict: 'endpoint' });
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export async function removerAparelho(endpoint: string) {
  const eu = await pessoaAtual();
  await supabaseAdmin().from('push_inscricoes').delete().eq('pessoa_id', eu.id).eq('endpoint', endpoint);
  return { ok: true };
}

export async function testarNotificacao() {
  const eu = await pessoaAtual();
  const n = await enviarParaPessoa(eu.id, {
    titulo: 'Notificações ligadas',
    corpo: `Tudo certo, ${eu.nome.split(' ')[0]}. Os avisos chegam aqui às 07h, 12h e 16h.`,
    url: '/agenda', tag: 'teste',
  });
  return n ? { ok: true } : { ok: false, erro: 'Nenhum aparelho ativo. Ative as notificações de novo.' };
}
