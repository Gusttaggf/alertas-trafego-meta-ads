import Link from 'next/link';
import { notFound } from 'next/navigation';
import TabelaContas from '@/components/TabelaContas';
import { exigirPapel } from '@/lib/sessao';
import { listarContas, listarPessoas } from '@/lib/dados';

export default async function Gestor({ params }: { params: Promise<{ id: string }> }) {
  const eu = await exigirPapel('administrador', 'head');
  const { id } = await params;
  const [pessoas, contas] = await Promise.all([listarPessoas(), listarContas()]);
  const g = pessoas.find((p) => p.id === id && p.papel === 'gestor');
  // Head só vê gestores da própria equipe.
  if (!g || (eu.papel === 'head' && g.head_id !== eu.id)) notFound();
  const head = pessoas.find((p) => p.id === g.head_id);
  return (
    <>
      <div className="head">
        <div>
          <Link className="crumb" href={eu.papel === 'head' ? '/equipe' : '/visao-geral'}>← {eu.papel === 'head' ? 'Minha equipe' : 'Visão geral'}</Link>
          <h1>{g.nome}</h1>
          <span className="muted">Gestor · {head ? `equipe de ${head.nome}` : 'sem equipe'} · {g.email}</span>
        </div>
      </div>
      <div className="vazio">A agenda de avisos deste gestor aparece aqui na próxima etapa.</div>
      <h2>Contas de {g.nome.split(' ')[0]}</h2>
      <TabelaContas contas={contas.filter((c) => c.gestor_id === g.id)} vazio="Nenhuma conta com este gestor ainda." />
    </>
  );
}
