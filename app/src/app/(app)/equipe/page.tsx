import CartoesGestores from '@/components/CartoesGestores';
import { exigirPapel } from '@/lib/sessao';
import { listarContas, listarPessoas } from '@/lib/dados';

export default async function Equipe() {
  const eu = await exigirPapel('head');
  const [pessoas, contas] = await Promise.all([listarPessoas(), listarContas()]);
  const minhas = contas.filter((c) => c.head_id === eu.id);
  return (
    <>
      <div className="head">
        <div><h1>Minha equipe</h1><span className="muted">Você acompanha a equipe por aqui. Os avisos vão para os gestores.</span></div>
        <div className="stats">
          <div className="stat"><b className="num">{minhas.length}</b><span>contas da equipe</span></div>
          <div className="stat"><b className="num" style={{ color: minhas.some((c) => !c.gestor_id) ? 'var(--custo)' : undefined }}>{minhas.filter((c) => !c.gestor_id).length}</b><span>sem gestor</span></div>
        </div>
      </div>
      <CartoesGestores gestores={pessoas.filter((p) => p.papel === 'gestor' && p.head_id === eu.id)} contas={minhas} />
    </>
  );
}
