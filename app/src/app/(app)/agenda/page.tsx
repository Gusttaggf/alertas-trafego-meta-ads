import Link from 'next/link';
import Agenda from '@/components/Agenda';
import { pessoaAtual } from '@/lib/sessao';
import { lerConfiguracoes, listarContas, listarInscricoes, listarPessoas } from '@/lib/dados';
import { carregarAgenda, diaValido } from '@/lib/agenda';
import { podeResolver } from '@/lib/permissoes';
import { diaSP } from '@/lib/tempo';

export default async function MinhaAgenda({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const eu = await pessoaAtual();
  const dia = diaValido((await searchParams).dia, diaSP());
  const [contas, inscricoes, pessoas, cfg] = await Promise.all([listarContas(), listarInscricoes(eu.id), listarPessoas(), lerConfiguracoes()]);
  const inscritas = new Set(inscricoes.map((i) => i.conta_id));
  const minhas = contas.filter((c) => c.gestor_id === eu.id || inscritas.has(c.id));
  const { avisos, atrasados, hoje } = await carregarAgenda(minhas.map((c) => c.id), dia);
  const contaDe = new Map(contas.map((c) => [c.id, c]));

  return (
    <>
      <div className="head">
        <div>
          <h1>Minha agenda</h1>
          <span className="muted">Avisos {eu.papel === 'gestor' ? 'das suas contas' : 'das contas que você acompanha'} às {cfg.horarios.join(', ')}.</span>
        </div>
      </div>
      {minhas.length === 0 && (
        <div className="vazio">
          {eu.papel === 'gestor' ? 'Seu head ainda não passou contas para você.'
            : <>Você ainda não acompanha nenhuma conta. Em <Link href="/contas">Contas</Link>, marque &quot;Receber avisos&quot; nas que quiser.</>}
        </div>
      )}
      <Agenda
        avisos={avisos} atrasados={atrasados} contas={minhas} dia={dia} hoje={hoje} horarios={cfg.horarios} caminho="/agenda"
        nomes={new Map(pessoas.map((p) => [p.id, p.nome]))}
        podeResolver={(a) => { const c = contaDe.get(a.conta_id); return !!c && podeResolver(eu, c, inscritas.has(c.id)); }}
      />
    </>
  );
}
