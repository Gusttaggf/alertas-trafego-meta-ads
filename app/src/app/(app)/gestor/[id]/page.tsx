import Link from 'next/link';
import { notFound } from 'next/navigation';
import TabelaContas from '@/components/TabelaContas';
import Agenda from '@/components/Agenda';
import { carregarAgenda, diaValido } from '@/lib/agenda';
import { diaSP } from '@/lib/tempo';
import { podeResolver } from '@/lib/permissoes';
import { exigirPapel } from '@/lib/sessao';
import { lerConfiguracoes, listarContas, listarPessoas } from '@/lib/dados';

export default async function Gestor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ dia?: string }> }) {
  const eu = await exigirPapel('administrador', 'head');
  const { id } = await params;
  const [pessoas, contas, cfg] = await Promise.all([listarPessoas(), listarContas(), lerConfiguracoes()]);
  const g = pessoas.find((p) => p.id === id && p.papel === 'gestor');
  // Head só vê gestores da própria equipe.
  if (!g || (eu.papel === 'head' && g.head_id !== eu.id)) notFound();
  const head = pessoas.find((p) => p.id === g.head_id);
  const dele = contas.filter((c) => c.gestor_id === g.id);
  const dia = diaValido((await searchParams).dia, diaSP());
  const { avisos, atrasados, hoje } = await carregarAgenda(dele.map((c) => c.id), dia);
  const contaDe = new Map(dele.map((c) => [c.id, c]));
  return (
    <>
      <div className="head">
        <div>
          <Link className="crumb" href={eu.papel === 'head' ? '/equipe' : '/visao-geral'}>← {eu.papel === 'head' ? 'Minha equipe' : 'Visão geral'}</Link>
          <h1>{g.nome}</h1>
          <span className="muted">Gestor · {head ? `equipe de ${head.nome}` : 'sem equipe'} · {g.email}</span>
        </div>
      </div>
      <Agenda
        avisos={avisos} atrasados={atrasados} contas={dele} dia={dia} hoje={hoje} horarios={cfg.horarios} caminho={`/gestor/${g.id}`}
        nomes={new Map(pessoas.map((p) => [p.id, p.nome]))}
        podeResolver={(a) => { const c = contaDe.get(a.conta_id); return !!c && podeResolver(eu, c, false); }}
      />
      <h2>Contas de {g.nome.split(' ')[0]}</h2>
      <TabelaContas contas={dele} vazio="Nenhuma conta com este gestor ainda." />
    </>
  );
}
