import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarSaldo, avaliarCusto, detalharCriativos, avaliarOrcamento, avaliarRuim2Semanas, type Insight, type Limites } from '../src/lib/regras.ts';

const L: Limites = { dias_min_saldo: 2, pct_custo_alto: 40, gasto_min_custo: 20, tolerancia_orc: 0, pct_ruim_2_semanas: 40, gasto_min_ruim: 150 };
const MSG = 'onsite_conversion.messaging_conversation_started_7d';
const ins = (cid: string, spend: number, res: number, extra: Partial<Insight> = {}): Insight =>
  ({ campaign_id: cid, campaign_name: 'Camp ' + cid, objective: 'OUTCOME_ENGAGEMENT', spend: String(spend), actions: res ? [{ action_type: MSG, value: String(res) }] : [], ...extra });

test('saldo: avisa quando dura menos que o mínimo; cartão sem limite não avisa', () => {
  const pre = { id: 'act_1', account_id: '1', name: 'X', account_status: 1, funding_source_details: { display_string: 'Saldo disponível (R$150,00 BRL)', type: 20 } };
  const a = avaliarSaldo(pre, 100, L)!;
  assert.equal(a.titulo, 'R$ 150,00 de saldo');
  assert.match(a.detalhe, /~1,5 dias no ritmo de R\$ 100,00\/dia/);
  assert.equal(avaliarSaldo(pre, 50, L), null);
  assert.equal(avaliarSaldo({ ...pre, funding_source_details: { display_string: 'Visa *1234', type: 1 } }, 100, L), null);
});

test('custo alto: campanha acima de 40% da média de 7 dias, com gasto mínimo', () => {
  const hoje = [ins('c1', 60, 3), ins('c2', 60, 5), ins('c3', 15, 1)];
  const semana = [ins('c1', 280, 28), ins('c2', 280, 28), ins('c3', 70, 70)];
  const { achados, sinalizadas } = avaliarCusto(hoje, semana, L);
  assert.deepEqual(achados.map((a) => a.chave), ['custo|c1']); // c1: 20 vs 10 (+100%); c2: 12 vs 10; c3 gastou pouco
  assert.equal(achados[0].titulo, 'R$ 20,00 por conversa');
  assert.match(achados[0].detalhe, /\+100%/);
  detalharCriativos(sinalizadas, [
    { ...ins('c1', 40, 1), ad_id: 'a1', ad_name: 'Vídeo 01', adset_name: 'Aberto' },
    { ...ins('c1', 20, 2), ad_id: 'a2', ad_name: 'Carrossel' },
  ], [{ ...ins('c1', 70, 10), ad_id: 'a1' }], L);
  const cr = achados[0].dados!.criativos as { nome: string; texto: string }[];
  assert.equal(cr.length, 1);
  assert.match(cr[0].texto, /Vídeo 01 \(Aberto\): R\$ 40,00 hoje, 1 conversa \(R\$ 40,00 cada\); nos 7 dias saía a R\$ 7,00/);
});

test('orçamento: campanha (CBO) e conjunto (ABO) acima do diário', () => {
  const r = avaliarOrcamento([ins('c1', 130, 0), ins('c2', 40, 0)],
    [{ id: 'c1', name: 'CBO', daily_budget: '10000' }, { id: 'c2', name: 'Sem', daily_budget: '5000' }],
    [{ id: 's1', name: 'Conj', campaign_id: 'c2', daily_budget: '2000' }], { s1: 35 }, L);
  assert.deepEqual(r.map((a) => a.chave), ['orc|cc1', 'orc|as1']);
  assert.match(r[0].detalhe, /Campanha "CBO": orçamento diário de R\$ 100,00 \(\+30%\)/);
  assert.match(r[1].detalhe, /Conjunto "Conj" \(campanha "Sem"\)/);
  assert.equal(avaliarOrcamento([ins('c1', 130, 0)], [{ id: 'c1', name: 'CBO', daily_budget: '10000' }], [], {}, { ...L, tolerancia_orc: 50 }).length, 0);
});

test('ruim há 2 semanas: só o que ficou acima da média nas duas semanas, no nível mais específico', () => {
  const ad = (id: string, adset: string, spend: number, res: number) =>
    ({ ...ins('c1', spend, res), adset_id: adset, adset_name: 'Conj ' + adset, ad_id: id, ad_name: 'Anúncio ' + id });
  // Conta: média ~R$ 10. a1 caro nas duas semanas; a2 bom; a3 caro só na 2ª.
  const s1 = [ad('a1', 's1', 120, 4), ad('a2', 's2', 300, 40), ad('a3', 's2', 60, 6)];
  const s2 = [ad('a1', 's1', 150, 5), ad('a2', 's2', 300, 40), ad('a3', 's2', 90, 3)];
  const r = avaliarRuim2Semanas(s1, s2, ['28/10 a 03/11', '04/11 a 10/11'], L);
  assert.deepEqual(r.map((a) => a.chave), ['ruim|Anúncio|a1']); // o conjunto s1 e a campanha não repetem
  assert.equal((r[0].dados as { nivel: string }).nivel, 'Anúncio');
  assert.equal(r[0].titulo, 'R$ 30,00 por conversa');
  const sem = (r[0].dados as { semanas: { pct: number }[] }).semanas;
  assert.ok(sem[0].pct > 40 && sem[1].pct > 40);
  // Gasto pequeno não entra
  assert.equal(avaliarRuim2Semanas(s1, s2, ['a', 'b'], { ...L, gasto_min_ruim: 1000 }).length, 0);
});
