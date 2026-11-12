import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { conexaoMetaDaAgencia, lerConfiguracoes } from '@/lib/dados';
import { graph, graphTodos, ErroMeta } from '@/lib/meta';
import { lerSaldo, type ContaMeta } from '@/lib/saldo';
import {
  avaliarCusto, avaliarOrcamento, avaliarRuim2Semanas, avaliarSaldo, detalharCriativos,
  type Achado, type Insight, type Limites, type Orcamento,
} from '@/lib/regras';
import { diaSP, ddmm, horarioAtual, proximoHorario, somarDias } from '@/lib/tempo';
import { notificarAvisosNovos } from '@/lib/push';

type ContaAlvo = { id: string; id_externo: string; nome: string; ruim_verificado_em: string | null };

const CAMPOS_CAMPANHA = 'campaign_id,campaign_name,objective,spend,actions';
const CAMPOS_ANUNCIO = 'campaign_id,campaign_name,objective,adset_id,adset_name,ad_id,ad_name,spend,actions';
const ATIVOS = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]);

/** Busca no Meta tudo o que as regras precisam de uma conta e devolve os achados. */
async function verificarContaMeta(token: string, c: ContaAlvo, limites: Limites, rodarRuim: boolean, hoje: string) {
  const act = `act_${c.id_externo}`;
  const [conta, campHoje, campSemana, campanhas, conjuntosTodos] = await Promise.all([
    graph<ContaMeta>(act, token, { fields: 'name,account_status,currency,amount_spent,spend_cap,balance,is_prepay_account,funding_source_details{id,display_string,type}' }),
    graphTodos<Insight>(`${act}/insights`, token, { level: 'campaign', date_preset: 'today', fields: CAMPOS_CAMPANHA, limit: 200 }),
    graphTodos<Insight>(`${act}/insights`, token, { level: 'campaign', date_preset: 'last_7d', fields: CAMPOS_CAMPANHA, limit: 200 }),
    graphTodos<Orcamento>(`${act}/campaigns`, token, { fields: 'id,name,daily_budget', filtering: ATIVOS, limit: 200 }),
    graphTodos<Orcamento>(`${act}/adsets`, token, { fields: 'id,name,campaign_id,daily_budget', filtering: ATIVOS, limit: 500 }),
  ]);

  const gastoHoje = campHoje.reduce((s, x) => s + Number(x.spend || 0), 0);
  const gastoMedio = campSemana.reduce((s, x) => s + Number(x.spend || 0), 0) / 7;
  const achados: Achado[] = [];

  const saldo = avaliarSaldo(conta, gastoMedio, limites);
  if (saldo) achados.push(saldo);

  const custo = avaliarCusto(campHoje, campSemana, limites);
  if (custo.sinalizadas.length) {
    const filtro = JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: custo.sinalizadas.map((s) => s.cid) }]);
    const [adsHoje, adsSemana] = await Promise.all([
      graphTodos<Insight>(`${act}/insights`, token, { level: 'ad', date_preset: 'today', fields: CAMPOS_ANUNCIO, filtering: filtro, limit: 500 }),
      graphTodos<Insight>(`${act}/insights`, token, { level: 'ad', date_preset: 'last_7d', fields: CAMPOS_ANUNCIO, filtering: filtro, limit: 500 }),
    ]);
    detalharCriativos(custo.sinalizadas, adsHoje, adsSemana, limites);
  }
  achados.push(...custo.achados);

  const conjuntos = conjuntosTodos.filter((a) => Number(a.daily_budget || 0) > 0);
  const gastoConjunto: Record<string, number> = {};
  if (conjuntos.length) {
    const ins = await graphTodos<{ adset_id: string; spend: string }>(`${act}/insights`, token, { level: 'adset', date_preset: 'today', fields: 'adset_id,spend', limit: 500 });
    for (const x of ins) gastoConjunto[x.adset_id] = Number(x.spend || 0);
  }
  achados.push(...avaliarOrcamento(campHoje, campanhas, conjuntos, gastoConjunto, limites));

  if (rodarRuim) {
    const s1 = { since: somarDias(hoje, -14), until: somarDias(hoje, -8) };
    const s2 = { since: somarDias(hoje, -7), until: somarDias(hoje, -1) };
    const [w1, w2] = await Promise.all([s1, s2].map((tr) =>
      graphTodos<Insight>(`${act}/insights`, token, { level: 'ad', time_range: JSON.stringify(tr), fields: CAMPOS_ANUNCIO, limit: 500 })));
    achados.push(...avaliarRuim2Semanas(w1, w2, [`${ddmm(s1.since)} a ${ddmm(s1.until)}`, `${ddmm(s2.since)} a ${ddmm(s2.until)}`], limites));
  }

  return { achados, gastoHoje, gastoMedio, saldo: lerSaldo(conta)?.valor ?? null };
}

/**
 * Grava os achados de uma conta. Achado novo entra no próximo horário (07h, 12h, 16h).
 * O que já foi resolvido hoje não volta. O que ainda não apareceu e sumiu é apagado.
 */
async function salvarAchados(contaId: string, achados: Achado[], slot: { dia: string; horario: string; visivelEm: Date }, agora: Date, rodouRuim: boolean, imediato: boolean) {
  const db = supabaseAdmin();
  const { data: existentes, error } = await db.from('avisos')
    .select('id, chave, tipo, resolvido_em, visivel_em').eq('conta_id', contaId).eq('dia', slot.dia);
  if (error) throw new Error(error.message);
  const porChave = new Map((existentes || []).map((e) => [e.chave as string, e]));
  const novos: Record<string, unknown>[] = [];

  for (const a of achados) {
    const ex = porChave.get(a.chave);
    if (ex?.resolvido_em) continue;
    if (ex) {
      await db.from('avisos').update({ titulo: a.titulo, detalhe: a.detalhe, dados: a.dados || {}, atualizado_em: agora.toISOString() }).eq('id', ex.id);
    } else {
      novos.push({
        conta_id: contaId, tipo: a.tipo, chave: a.chave, dia: slot.dia, horario: slot.horario,
        visivel_em: (imediato ? agora : slot.visivelEm).toISOString(), titulo: a.titulo, detalhe: a.detalhe, dados: a.dados || {},
      });
    }
  }
  if (novos.length) {
    const r = await db.from('avisos').insert(novos);
    if (r.error) throw new Error(r.error.message);
  }
  const chaves = new Set(achados.map((a) => a.chave));
  const sumiram = (existentes || []).filter((e) => !e.resolvido_em && new Date(e.visivel_em as string) > agora
    && !chaves.has(e.chave as string) && (e.tipo !== 'ruim' || rodouRuim)).map((e) => e.id as string);
  if (sumiram.length) await db.from('avisos').delete().in('id', sumiram);
  return novos.length;
}

async function emLotes<T, R>(itens: T[], tamanho: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < itens.length; i += tamanho) out.push(...await Promise.all(itens.slice(i, i + tamanho).map(fn)));
  return out;
}

export type ResumoVerificacao = { contas: number; novos: number; erros: { conta: string; erro: string }[]; parou?: string; notificados?: number };

/**
 * Verifica todas as contas do Meta que alguém recebe (gestor responsável ou inscrição).
 * Roda de hora em hora pelo agendador do Supabase. `imediato` (botão do administrador) mostra os avisos novos na hora.
 */
export async function verificarTudo({ agora = new Date(), imediato = false } = {}): Promise<ResumoVerificacao> {
  const db = supabaseAdmin();
  const conexao = await conexaoMetaDaAgencia();
  if (!conexao) return { contas: 0, novos: 0, erros: [], parou: 'Meta não conectado.' };
  const cfg = await lerConfiguracoes();
  const limites: Limites = {
    dias_min_saldo: cfg.dias_min_saldo, pct_custo_alto: cfg.pct_custo_alto, gasto_min_custo: cfg.gasto_min_custo,
    tolerancia_orc: cfg.tolerancia_orc_meta, pct_ruim_2_semanas: cfg.pct_ruim_2_semanas, gasto_min_ruim: cfg.gasto_min_ruim,
  };

  const [{ data: contas, error }, { data: inscr }] = await Promise.all([
    db.from('contas').select('id, id_externo, nome, gestor_id, ruim_verificado_em').eq('plataforma', 'meta').eq('ativa', true),
    db.from('inscricoes').select('conta_id'),
  ]);
  if (error) throw new Error(error.message);
  const inscritas = new Set((inscr || []).map((i) => i.conta_id as string));
  const alvo = (contas || []).filter((c) => c.gestor_id || inscritas.has(c.id)) as (ContaAlvo & { gestor_id: string | null })[];

  const hoje = diaSP(agora);
  // Automático: o que é achado aparece no próximo horário. Botão "Verificar agora": aparece já, no horário atual.
  const slot = imediato ? horarioAtual(cfg.horarios, agora) : proximoHorario(cfg.horarios, agora);
  const resumo: ResumoVerificacao = { contas: alvo.length, novos: 0, erros: [] };
  let tokenInvalido: string | null = null;

  await emLotes(alvo, 4, async (c) => {
    if (tokenInvalido) return;
    const rodarRuim = c.ruim_verificado_em !== hoje;
    try {
      const r = await verificarContaMeta(conexao.token, c, limites, rodarRuim, hoje);
      resumo.novos += await salvarAchados(c.id, r.achados, slot, agora, rodarRuim, imediato);
      await db.from('contas').update({
        ultima_verificacao: agora.toISOString(), ultimo_erro: null, saldo: r.saldo,
        gasto_hoje: r.gastoHoje, gasto_medio_7d: r.gastoMedio, ...(rodarRuim ? { ruim_verificado_em: hoje } : {}),
      }).eq('id', c.id);
    } catch (e) {
      const err = e as ErroMeta;
      if (err.codigo === 190) { tokenInvalido = err.message; return; }
      resumo.erros.push({ conta: c.nome, erro: err.message });
      await db.from('contas').update({ ultima_verificacao: agora.toISOString(), ultimo_erro: err.message.slice(0, 500) }).eq('id', c.id);
    }
  });

  await db.from('meta_conexoes').update(tokenInvalido
    ? { ultimo_erro: 'O acesso ao Meta expirou ou foi revogado. Reconecte em Contas.', erro_em: agora.toISOString() }
    : { ultimo_erro: null, erro_em: null }).eq('user_id', conexao.user_id);
  if (tokenInvalido) resumo.parou = 'Acesso ao Meta expirado.';
  // Avisos que ficaram visíveis agora (no horário 07h/12h/16h ou pelo "Verificar agora") vão para o celular.
  try { resumo.notificados = (await notificarAvisosNovos(agora)).aparelhos; }
  catch (e) { resumo.erros.push({ conta: 'Notificações', erro: (e as Error).message }); }
  return resumo;
}
