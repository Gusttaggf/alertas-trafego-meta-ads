import CartoesGestores from '@/components/CartoesGestores';
import { exigirPapel } from '@/lib/sessao';
import { listarContas, listarPessoas } from '@/lib/dados';
import { pendenciasPorGestor } from '@/lib/agenda';
import { ORDEM_TIPOS, TIPOS } from '@/lib/avisos';

export default async function Equipe() {
  const eu = await exigirPapel('head');
  const [pessoas, contas] = await Promise.all([listarPessoas(), listarContas()]);
  const minhas = contas.filter((c) => c.head_id === eu.id);
  const pend = await pendenciasPorGestor(minhas);
  const totalTipo = (t: (typeof ORDEM_TIPOS)[number]) => [...pend.values()].reduce((s, p) => s + p.porTipo[t], 0);
  return (
    <>
      <div className="head">
        <div><h1>Minha equipe</h1><span className="muted">Pendências de hoje e atrasadas da equipe. Os avisos vão para os gestores; clique num gestor para ver os detalhes.</span></div>
        <div className="stats">
          {ORDEM_TIPOS.map((t) => <div key={t} className={`stat t-${t}`}><b className="num" style={{ color: 'var(--c)' }}>{totalTipo(t)}</b><span>{TIPOS[t]}</span></div>)}
          <div className="stat"><b className="num">{minhas.length}</b><span>contas da equipe</span></div>
          <div className="stat"><b className="num" style={{ color: minhas.some((c) => !c.gestor_id) ? 'var(--custo)' : undefined }}>{minhas.filter((c) => !c.gestor_id).length}</b><span>sem gestor</span></div>
        </div>
      </div>
      <CartoesGestores gestores={pessoas.filter((p) => p.papel === 'gestor' && p.head_id === eu.id)} contas={minhas} pendencias={pend} />
    </>
  );
}
