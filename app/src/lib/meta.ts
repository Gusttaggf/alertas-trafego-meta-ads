import 'server-only';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ContaMeta } from '@/lib/saldo';

const versao = () => process.env.META_API_VERSION || 'v23.0';

export class ErroMeta extends Error {
  constructor(mensagem: string, public codigo?: number) { super(mensagem); }
}

async function buscarJson<T>(url: string): Promise<T> {
  const resp = await fetch(url, { cache: 'no-store' });
  let json: any;
  try { json = await resp.json(); }
  catch { throw new ErroMeta(`Resposta inválida do Meta (HTTP ${resp.status})`); }
  if (json.error) throw new ErroMeta(json.error.error_user_msg || json.error.message, json.error.code);
  return json as T;
}

export function graph<T>(caminho: string, token: string, params: Record<string, string | number> = {}) {
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), access_token: token });
  return buscarJson<T>(`https://graph.facebook.com/${versao()}/${caminho}?${qs}`);
}

export async function graphTodos<T>(caminho: string, token: string, params: Record<string, string | number> = {}) {
  let json = await graph<{ data?: T[]; paging?: { next?: string } }>(caminho, token, params);
  let dados = json.data || [];
  for (let p = 0; json.paging?.next && p < 20; p++) {
    json = await buscarJson(json.paging.next);
    dados = dados.concat(json.data || []);
  }
  return dados;
}

/** Endereço do Facebook para o administrador autorizar o acesso às contas de anúncio. */
export function urlAutorizacao(redirectUri: string, state: string) {
  const qs = new URLSearchParams({ client_id: env('META_APP_ID'), redirect_uri: redirectUri, state, response_type: 'code' });
  // App do tipo Empresa usa a configuração de login; os demais pedem a permissão direto.
  if (process.env.META_CONFIG_ID) qs.set('config_id', process.env.META_CONFIG_ID);
  else qs.set('scope', 'ads_read');
  return `https://www.facebook.com/${versao()}/dialog/oauth?${qs}`;
}

/** Troca o código que o Facebook devolve por um token curto. */
export async function trocarCodigo(code: string, redirectUri: string) {
  const qs = new URLSearchParams({
    client_id: env('META_APP_ID'), client_secret: env('META_APP_SECRET'), redirect_uri: redirectUri, code,
  });
  const r = await buscarJson<{ access_token: string }>(`https://graph.facebook.com/${versao()}/oauth/access_token?${qs}`);
  return r.access_token;
}

/** Troca o token curto do login (1–2 h) por um de ~60 dias. */
export async function tokenLongo(tokenCurto: string) {
  const qs = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: env('META_APP_ID'),
    client_secret: env('META_APP_SECRET'),
    fb_exchange_token: tokenCurto,
  });
  const r = await buscarJson<{ access_token: string; expires_in?: number }>(
    `https://graph.facebook.com/${versao()}/oauth/access_token?${qs}`);
  return { token: r.access_token, expiraEm: r.expires_in ? new Date(Date.now() + r.expires_in * 1000) : null };
}

/** Guarda a conexão do Meta do usuário logado (só o servidor lê essa tabela). */
export async function salvarConexao(userId: string, tokenCurto: string) {
  const { token, expiraEm } = await tokenLongo(tokenCurto);
  const me = await graph<{ id: string; name: string }>('me', token, { fields: 'id,name' });
  const { error } = await supabaseAdmin().from('meta_conexoes').upsert({
    user_id: userId,
    fb_user_id: me.id,
    fb_nome: me.name,
    token,
    expira_em: expiraEm?.toISOString() ?? null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) throw new Error('Não consegui salvar a conexão com o Meta: ' + error.message);
}

export function listarContasMeta(token: string) {
  return graphTodos<ContaMeta>('me/adaccounts', token, {
    fields: 'name,account_id,account_status,currency,is_prepay_account,spend_cap,amount_spent,funding_source_details',
    limit: 200,
  });
}
