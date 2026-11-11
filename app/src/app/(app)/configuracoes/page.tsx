import Aviso from '@/components/Aviso';
import { exigirPapel } from '@/lib/sessao';
import { lerConfiguracoes } from '@/lib/dados';
import { salvarConfiguracoes } from './acoes';

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await exigirPapel('administrador');
  const { ok, erro } = await searchParams;
  const c = await lerConfiguracoes();
  const campo = (id: keyof typeof c, titulo: string, texto: string, passo = '1') => (
    <label htmlFor={id}><span className="h">{titulo}</span>{texto}
      <input id={id} name={id} type="number" min="0" step={passo} defaultValue={c[id] as number} />
    </label>
  );
  return (
    <>
      <div className="head"><div><h1>Configurações</h1><span className="muted">Valem para todas as contas.</span></div></div>
      <Aviso ok={ok} erro={erro} />
      <form action={salvarConfiguracoes} className="panel">
        <div className="form">
          <label><span className="h">Horários dos avisos</span>Os avisos aparecem na agenda e no celular nesses horários.
            <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.horarios.map((h, i) => <input key={i} name={`h${i + 1}`} type="time" defaultValue={h} aria-label={`Horário ${i + 1}`} />)}
            </span>
          </label>
          {campo('dias_min_saldo', 'Saldo acabando', 'Avisar quando o saldo durar menos de (dias)', '0.5')}
          {campo('pct_custo_alto', 'Custo alto', 'Avisar quando o custo por resultado passar da média de 7 dias em (%)')}
          {campo('gasto_min_custo', 'Custo alto: gasto mínimo', 'Só avalia campanhas que gastaram ao menos (R$) no dia')}
          {campo('tolerancia_orc_meta', 'Gasto acima do diário (Meta)', 'Tolerância acima do orçamento diário (%)')}
          {campo('tolerancia_orc_google', 'Gasto acima do diário (Google Ads)', 'O Google pode gastar até 2x o diário num dia e compensa no mês. Tolerância (%)')}
          {campo('pct_ruim_2_semanas', 'Ruim há 2 semanas', 'Acima da média da conta nas duas últimas semanas em (%)')}
          {campo('gasto_min_ruim', 'Ruim há 2 semanas: gasto mínimo', 'Só avalia o que gastou ao menos isso nos 14 dias (R$)')}
        </div>
        <div style={{ padding: '0 16px 16px' }}><button className="btn primary" type="submit">Salvar configurações</button></div>
      </form>
    </>
  );
}
