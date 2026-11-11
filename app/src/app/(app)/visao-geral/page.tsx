import Link from 'next/link';
import CartoesGestores from '@/components/CartoesGestores';
import { exigirPapel } from '@/lib/sessao';
import { listarContas, listarPessoas } from '@/lib/dados';

export default async function VisaoGeral() {
  await exigirPapel('administrador');
  const [pessoas, contas] = await Promise.all([listarPessoas(), listarContas()]);
  const heads = pessoas.filter((p) => p.papel === 'head');
  const semEquipe = pessoas.filter((p) => p.papel === 'gestor' && !p.head_id);
  const aguardando = pessoas.filter((p) => !p.papel).length;
  const stat = (n: number, t: string, alerta = false) => (
    <div className="stat"><b className="num" style={alerta && n ? { color: 'var(--custo)' } : undefined}>{n}</b><span>{t}</span></div>
  );
  return (
    <>
      <div className="head">
        <div><h1>Visão geral</h1><span className="muted">Todas as equipes da agência</span></div>
        <div className="stats">
          {stat(contas.length, 'contas')}
          {stat(contas.filter((c) => !c.head_id).length, 'sem head', true)}
          {stat(contas.filter((c) => c.head_id && !c.gestor_id).length, 'sem gestor', true)}
          {stat(aguardando, 'aguardando acesso', true)}
        </div>
      </div>
      {heads.length === 0 && (
        <div className="vazio">Ainda não há heads. Vá em <Link href="/pessoas">Pessoas</Link> e defina quem é head e quem é gestor.</div>
      )}
      {heads.map((h) => (
        <section key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="head"><h2>Equipe de {h.nome}</h2><span className="muted">{contas.filter((c) => c.head_id === h.id).length} contas</span></div>
          <CartoesGestores gestores={pessoas.filter((p) => p.papel === 'gestor' && p.head_id === h.id)} contas={contas} />
        </section>
      ))}
      {semEquipe.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>Gestores sem equipe</h2>
          <CartoesGestores gestores={semEquipe} contas={contas} />
        </section>
      )}
    </>
  );
}
