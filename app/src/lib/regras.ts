// Regras dos avisos do Meta, portadas de src/AlertasTrafego.gs (verificarConta_, verificarOrcamentos_,
// detalharCriativos_) e o aviso novo "Ruim há 2 semanas". Funções puras: recebem o que veio da API
// do Meta e devolvem os achados. Testadas em tests/regras.test.ts.

import { brl, lerSaldo, type ContaMeta } from './saldo.ts';

export type Acao = { action_type: string; value: string };
export type Insight = {
  campaign_id: string; campaign_name?: string; objective?: string;
  adset_id?: string; adset_name?: string; ad_id?: string; ad_name?: string;
  spend?: string; actions?: Acao[];
};
export type Orcamento = { id: string; name: string; daily_budget?: string; campaign_id?: string };

export type TipoAviso = 'saldo' | 'custo' | 'orcamento' | 'ruim';
export type Achado = {
  tipo: TipoAviso;
  /** Identifica o aviso no dia: o mesmo problema não vira dois avisos. */
  chave: string;
  titulo: string;
  detalhe: string;
  dados?: Record<string, unknown>;
};

export type Limites = {
  dias_min_saldo: number;
  pct_custo_alto: number;      // em %, ex.: 40
  gasto_min_custo: number;     // R$
  tolerancia_orc: number;      // em %, ex.: 0
  pct_ruim_2_semanas: number;  // em %
  gasto_min_ruim: number;      // R$ em 14 dias
};

// ---------------- Resultado de cada campanha ----------------

export const TIPOS_RESULTADO: Record<string, string[]> = {
  Mensagens: ['onsite_conversion.messaging_conversation_started_7d'],
  Compras: ['omni_purchase', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'onsite_web_purchase'],
  Leads: ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead'],
  Cliques: ['link_click'],
};
const RESULTADO_POR_OBJETIVO: Record<string, string[]> = {
  OUTCOME_ENGAGEMENT: ['Mensagens'], MESSAGES: ['Mensagens'],
  OUTCOME_SALES: ['Compras', 'Mensagens'], CONVERSIONS: ['Compras', 'Mensagens'], PRODUCT_CATALOG_SALES: ['Compras'],
  OUTCOME_LEADS: ['Leads', 'Mensagens'], LEAD_GENERATION: ['Leads'],
  OUTCOME_TRAFFIC: ['Cliques'], LINK_CLICKS: ['Cliques'],
};
export const SINGULAR: Record<string, string> = { Mensagens: 'conversa', Compras: 'venda', Leads: 'lead', Cliques: 'clique' };
export const PLURAL: Record<string, string> = { Mensagens: 'conversas', Compras: 'vendas', Leads: 'leads', Cliques: 'cliques' };

export type AcaoEscolhida = { acao: string; rotulo: string; singular: string };

export function contar(actions: Acao[] | undefined, tipo: string): number {
  const a = actions?.find((x) => x.action_type === tipo);
  return a ? Number(a.value || 0) : 0;
}

/** Qual ação conta como resultado: a do tipo do cliente ou, no automático, a do objetivo da campanha. */
export function escolherAcao(tipoCliente: string, principal: Insight, apoio?: Insight): AcaoEscolhida | null {
  const tipos = TIPOS_RESULTADO[tipoCliente] ? [tipoCliente]
    : RESULTADO_POR_OBJETIVO[principal.objective || apoio?.objective || ''] || ['Mensagens', 'Compras', 'Leads', 'Cliques'];
  for (const fonte of [apoio?.actions, principal.actions]) {
    if (!fonte) continue;
    for (const t of tipos) {
      for (const acao of TIPOS_RESULTADO[t]) {
        if (contar(fonte, acao) > 0) return { acao, rotulo: t, singular: SINGULAR[t] };
      }
    }
  }
  return null;
}

const num = (v: string | number | undefined) => Number(v || 0);
const dec = (v: number, casas = 1) => v.toFixed(casas).replace('.', ',');
const pctAcima = (valor: number, ref: number) => Math.round((valor / ref - 1) * 100);

// ---------------- Saldo acabando ----------------

export function avaliarSaldo(conta: ContaMeta, gastoMedio: number, limites: Limites): Achado | null {
  const s = lerSaldo(conta);
  if (!s || gastoMedio <= 0) return null;
  const dias = s.valor / gastoMedio;
  if (dias >= limites.dias_min_saldo) return null;
  return {
    tipo: 'saldo', chave: 'saldo',
    titulo: s.tipo === 'Saldo pré-pago' ? `${brl(s.valor)} de saldo` : `${brl(s.valor)} de limite restante`,
    detalhe: `Dura ~${dec(Math.max(dias, 0))} dia${dias >= 0.95 && dias < 1.05 ? '' : 's'} no ritmo de ${brl(gastoMedio)}/dia (média de 7 dias).`,
    dados: { saldo: s.valor, gasto_medio: gastoMedio, dias },
  };
}

// ---------------- Custo alto (hoje x média dos últimos 7 dias) ----------------

export type Sinalizada = { cid: string; acao: AcaoEscolhida; ref: number; achado: Achado };

export function avaliarCusto(hoje: Insight[], semana: Insight[], limites: Limites, tipoCliente = 'Automático') {
  const porCampanha = new Map(semana.map((s) => [s.campaign_id, s]));
  const achados: Achado[] = [];
  const sinalizadas: Sinalizada[] = [];
  for (const h of hoje) {
    const s = porCampanha.get(h.campaign_id);
    const acao = escolherAcao(tipoCliente, h, s);
    if (!acao) continue;
    const gH = num(h.spend), rH = contar(h.actions, acao.acao);
    const gS = num(s?.spend), rS = contar(s?.actions, acao.acao);
    if (rH === 0 || rS === 0 || gH < limites.gasto_min_custo) continue;
    const cprH = gH / rH, cprS = gS / rS;
    if (cprH <= cprS * (1 + limites.pct_custo_alto / 100)) continue;
    const nome = h.campaign_name || h.campaign_id;
    const achado: Achado = {
      tipo: 'custo', chave: `custo|${h.campaign_id}`,
      titulo: `${brl(cprH)} por ${acao.singular}`,
      detalhe: `Campanha "${nome}": média de 7 dias ${brl(cprS)} (+${pctAcima(cprH, cprS)}%). Hoje: ${brl(gH)} gastos, ${rH} ${rH === 1 ? acao.singular : PLURAL[acao.rotulo]}.`,
      dados: { campanha: nome, custo_hoje: cprH, custo_7d: cprS, gasto_hoje: gH, resultados: rH },
    };
    achados.push(achado);
    sinalizadas.push({ cid: h.campaign_id, acao, ref: cprS, achado });
  }
  return { achados, sinalizadas };
}

/** Acrescenta ao aviso de custo os até 3 criativos que mais encarecem o resultado. */
export function detalharCriativos(sinalizadas: Sinalizada[], hojeAds: Insight[], semanaAds: Insight[], limites: Limites) {
  const s7 = new Map(semanaAds.map((a) => [a.ad_id, a]));
  for (const sx of sinalizadas) {
    const ruins = hojeAds.filter((a) => a.campaign_id === sx.cid && num(a.spend) > 0).flatMap((a) => {
      const g = num(a.spend), r = contar(a.actions, sx.acao.acao);
      const sem = s7.get(a.ad_id), r7 = contar(sem?.actions, sx.acao.acao);
      const cpr = r > 0 ? g / r : null;
      const cpr7 = r7 > 0 ? num(sem?.spend) / r7 : null;
      const semResultado = r === 0 && g >= Math.max(10, sx.ref);
      const caro = cpr !== null && cpr > sx.ref * (1 + limites.pct_custo_alto / 100);
      if (!semResultado && !caro) return [];
      return [{ nome: a.ad_name || a.ad_id || '', conjunto: a.adset_name || '', g, r, cpr, cpr7, excesso: g - r * sx.ref }];
    }).sort((x, y) => y.excesso - x.excesso);

    if (!ruins.length) {
      sx.achado.detalhe += ' O custo subiu de forma parecida em todos os anúncios (pode ser público, leilão ou horário).';
      continue;
    }
    const top = ruins.slice(0, 3);
    sx.achado.dados = {
      ...sx.achado.dados,
      criativos: top.map((x) => ({
        nome: x.nome, conjunto: x.conjunto, gasto: x.g, resultados: x.r, custo: x.cpr, custo_7d: x.cpr7,
        texto: `${x.nome}${x.conjunto ? ` (${x.conjunto})` : ''}: ${brl(x.g)} hoje, ${x.r === 0 ? 'nenhum resultado' : `${x.r} ${x.r === 1 ? sx.acao.singular : PLURAL[sx.acao.rotulo]} (${brl(x.cpr!)} cada)`}${x.cpr7 !== null ? `; nos 7 dias saía a ${brl(x.cpr7)}` : ''}`,
      })),
      outros_criativos: ruins.length - top.length,
    };
  }
}

// ---------------- Gasto acima do orçamento diário ----------------

export function avaliarOrcamento(
  hoje: Insight[], campanhas: Orcamento[], conjuntos: Orcamento[], gastoConjunto: Record<string, number>, limites: Limites,
): Achado[] {
  const achados: Achado[] = [];
  const margem = 1 + limites.tolerancia_orc / 100;
  const gastoCampanha = new Map(hoje.map((h) => [h.campaign_id, num(h.spend)]));
  const nomeCampanha = new Map(campanhas.map((c) => [c.id, c.name]));
  const avisar = (chave: string, oque: string, gasto: number, orc: number) => achados.push({
    tipo: 'orcamento', chave,
    titulo: `${brl(gasto)} gastos hoje`,
    detalhe: `${oque}: orçamento diário de ${brl(orc)} (+${pctAcima(gasto, orc)}%).`,
    dados: { gasto, orcamento: orc },
  });
  for (const c of campanhas) {
    const orc = num(c.daily_budget) / 100;
    const gasto = gastoCampanha.get(c.id) || 0;
    if (orc > 0 && gasto > orc * margem) avisar(`orc|c${c.id}`, `Campanha "${c.name}"`, gasto, orc);
  }
  for (const a of conjuntos) {
    const orc = num(a.daily_budget) / 100;
    const gasto = gastoConjunto[a.id] || 0;
    const camp = a.campaign_id ? nomeCampanha.get(a.campaign_id) : undefined;
    if (orc > 0 && gasto > orc * margem) avisar(`orc|a${a.id}`, `Conjunto "${a.name}"${camp ? ` (campanha "${camp}")` : ''}`, gasto, orc);
  }
  return achados;
}

// ---------------- Ruim há 2 semanas ----------------

type Soma = { gasto: number; res: number };
type Item = { nivel: 'Campanha' | 'Conjunto' | 'Anúncio'; id: string; nome: string; pai?: string; campanha: string; cid: string; s: [Soma, Soma] };

/**
 * Compara campanhas, conjuntos e anúncios com a média da conta em cada uma das duas últimas semanas.
 * Avisa o que ficou acima da média nas duas (ou sem resultado gastando o custo de um resultado).
 * Quando um anúncio ou conjunto é o culpado, o nível de cima não é avisado de novo. No máximo 3 por conta.
 */
export function avaliarRuim2Semanas(
  semana1: Insight[], semana2: Insight[], periodos: [string, string], limites: Limites, tipoCliente = 'Automático',
): Achado[] {
  // Resultado de cada campanha, olhando as duas semanas juntas
  const porCamp = new Map<string, Insight>();
  for (const r of [...semana1, ...semana2]) {
    const c = porCamp.get(r.campaign_id) || { campaign_id: r.campaign_id, campaign_name: r.campaign_name, objective: r.objective, actions: [] };
    for (const a of r.actions || []) {
      const ex = c.actions!.find((x) => x.action_type === a.action_type);
      if (ex) ex.value = String(num(ex.value) + num(a.value)); else c.actions!.push({ ...a });
    }
    porCamp.set(r.campaign_id, c);
  }
  const acaoDe = new Map<string, AcaoEscolhida | null>();
  for (const [cid, c] of porCamp) acaoDe.set(cid, escolherAcao(tipoCliente, c));

  const itens = new Map<string, Item>();
  const media: Record<string, [Soma, Soma]> = {};
  const somar = (linhas: Insight[], w: 0 | 1) => {
    for (const r of linhas) {
      const acao = acaoDe.get(r.campaign_id);
      if (!acao) continue;
      const g = num(r.spend), res = contar(r.actions, acao.acao);
      (media[acao.acao] ||= [{ gasto: 0, res: 0 }, { gasto: 0, res: 0 }])[w].gasto += g;
      media[acao.acao][w].res += res;
      const camp = r.campaign_name || r.campaign_id;
      const niveis: [Item['nivel'], string | undefined, string | undefined, string | undefined][] = [
        ['Campanha', r.campaign_id, camp, undefined],
        ['Conjunto', r.adset_id, r.adset_name, `Campanha|${r.campaign_id}`],
        ['Anúncio', r.ad_id, r.ad_name, r.adset_id ? `Conjunto|${r.adset_id}` : `Campanha|${r.campaign_id}`],
      ];
      for (const [nivel, id, nome, pai] of niveis) {
        if (!id) continue;
        const k = `${nivel}|${id}`;
        const it = itens.get(k) || { nivel, id, nome: nome || id, pai, campanha: camp, cid: r.campaign_id, s: [{ gasto: 0, res: 0 }, { gasto: 0, res: 0 }] as [Soma, Soma] };
        it.s[w].gasto += g; it.s[w].res += res;
        itens.set(k, it);
      }
    }
  };
  somar(semana1, 0);
  somar(semana2, 1);

  const fator = 1 + limites.pct_ruim_2_semanas / 100;
  const ruins: (Item & { pcts: (number | null)[]; mediaConta: number; acao: AcaoEscolhida })[] = [];
  for (const [k, it] of itens) {
    const acao = acaoDe.get(it.cid)!;
    const m = media[acao.acao];
    const total = it.s[0].gasto + it.s[1].gasto;
    if (total < limites.gasto_min_ruim) continue;
    const pcts: (number | null)[] = [];
    let ruimNasDuas = true;
    for (const w of [0, 1] as const) {
      const mw = m[w].res > 0 ? m[w].gasto / m[w].res : 0;
      const { gasto, res } = it.s[w];
      if (mw <= 0 || gasto <= 0) { ruimNasDuas = false; break; }
      if (res === 0) { if (gasto < mw) { ruimNasDuas = false; break; } pcts.push(null); continue; }
      const cpr = gasto / res;
      if (cpr <= mw * fator) { ruimNasDuas = false; break; }
      pcts.push(pctAcima(cpr, mw));
    }
    if (!ruimNasDuas) continue;
    const mediaConta = (m[0].gasto + m[1].gasto) / Math.max(m[0].res + m[1].res, 1);
    ruins.push({ ...it, pcts, mediaConta, acao });
    void k;
  }

  // Avisa o nível mais específico: tira campanhas e conjuntos que já têm um filho na lista.
  const comFilho = new Set(ruins.map((r) => r.pai).filter(Boolean) as string[]);
  return ruins
    .filter((r) => !comFilho.has(`${r.nivel}|${r.id}`))
    .sort((a, b) => (b.s[0].gasto + b.s[1].gasto) - (a.s[0].gasto + a.s[1].gasto))
    .slice(0, 3)
    .map((r) => {
      const gasto = r.s[0].gasto + r.s[1].gasto, res = r.s[0].res + r.s[1].res;
      const cpr = res > 0 ? gasto / res : null;
      return {
        tipo: 'ruim' as const,
        chave: `ruim|${r.nivel}|${r.id}`,
        titulo: cpr !== null ? `${brl(cpr)} por ${r.acao.singular}` : `Sem ${PLURAL[r.acao.rotulo]} em 14 dias`,
        detalhe: `Últimos 14 dias · média da conta ${brl(r.mediaConta)}${cpr !== null ? ` (+${pctAcima(cpr, r.mediaConta)}%)` : ''} · ${brl(gasto)} gastos no período.`,
        dados: {
          nivel: r.nivel, nome: r.nome, campanha: r.campanha,
          semanas: periodos.map((p, i) => ({ periodo: p, pct: r.pcts[i] })),
        },
      };
    });
}
