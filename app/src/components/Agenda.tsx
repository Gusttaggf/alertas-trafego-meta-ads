import Link from 'next/link';
import type { Aviso } from '@/lib/dados';
import type { Conta } from '@/lib/permissoes';
import { ORDEM_TIPOS, TIPOS } from '@/lib/avisos';
import { diaDaSemana, inicioDaSemana, instante, somarDias } from '@/lib/tempo';
import { alternarResolvido } from '@/app/(app)/agenda/acoes';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PLAT = { meta: 'Meta', google: 'Google Ads' } as const;
const horaBR = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

type Props = {
  avisos: Aviso[];          // da semana inteira (já liberados)
  atrasados: number;        // pendentes de dias anteriores
  contas: Conta[];
  nomes: Map<string, string>;
  podeResolver: (a: Aviso) => boolean;
  dia: string; hoje: string; horarios: string[]; caminho: string;
};

export default function Agenda({ avisos, atrasados, contas, nomes, podeResolver, dia, hoje, horarios, caminho }: Props) {
  const ini = inicioDaSemana(dia);
  const contaDe = new Map(contas.map((c) => [c.id, c]));
  const doDia = avisos.filter((a) => a.dia === dia);
  const pend = doDia.filter((a) => !a.resolvido_em).length;
  const agora = new Date();
  const titulo = new Date(`${dia}T12:00:00-03:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  const voltar = `${caminho}${dia !== hoje ? `?dia=${dia}` : ''}`;

  return (
    <>
      <div className="navsemana">
        <Link href={`${caminho}?dia=${somarDias(ini, -7)}`}>← Semana anterior</Link>
        {dia !== hoje && <Link href={caminho}>Hoje</Link>}
        <Link href={`${caminho}?dia=${somarDias(ini, 7)}`}>Próxima semana →</Link>
      </div>
      <div className="week" role="group" aria-label="Dias da semana">
        {[0, 1, 2, 3, 4, 5, 6].map((k) => {
          const d = somarDias(ini, k);
          const tipos = ORDEM_TIPOS.filter((t) => avisos.some((a) => a.dia === d && a.tipo === t && !a.resolvido_em));
          return (
            <Link key={d} href={`${caminho}?dia=${d}`} className={`day ${d === hoje ? 'hoje' : ''} ${d > hoje ? 'futuro' : ''}`} aria-current={d === dia ? 'date' : undefined}>
              <span className="dw">{DIAS[diaDaSemana(d)]}</span>
              <span className="dn num">{Number(d.slice(8))}</span>
              <span className="dots">{tipos.map((t) => <span key={t} className={`dot t-${t}`} title={TIPOS[t]} />)}</span>
            </Link>
          );
        })}
      </div>

      <div className="head">
        <h2>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
        <div className="stats">
          <div className="stat"><b className="num">{pend}</b><span>pendentes no dia</span></div>
          <div className="stat"><b className="num">{doDia.length - pend}</b><span>resolvidos no dia</span></div>
          <div className="stat"><b className="num" style={atrasados ? { color: 'var(--custo)' } : undefined}>{atrasados}</b><span>atrasados de outros dias</span></div>
        </div>
      </div>

      <div className="slots">
        {horarios.map((h) => {
          const lista = doDia.filter((a) => a.horario === h);
          const chegou = instante(dia, h) <= agora;
          const p = lista.filter((a) => !a.resolvido_em).length;
          return (
            <section key={h} className="slot" aria-label={`Avisos das ${h}`}>
              <div className="slot-h">
                <span className="hr num">{h}</span>
                <span className="st">{lista.length ? `${p} pendente${p === 1 ? '' : 's'} de ${lista.length}` : chegou ? 'Tudo certo' : 'Ainda não chegou'}</span>
              </div>
              {lista.length === 0 && <div className="vazio">{chegou ? 'Nenhum aviso. Todas as contas dentro do normal.' : `Os avisos das ${h} aparecem aqui.`}</div>}
              {lista.map((a) => {
                const c = contaDe.get(a.conta_id);
                const d = a.dados as { nivel?: string; nome?: string; criativos?: { texto: string }[]; outros_criativos?: number; semanas?: { periodo: string; pct: number | null }[] };
                const atrasado = !a.resolvido_em && a.dia < hoje;
                return (
                  <article key={a.id} className={`card t-${a.tipo} ${a.resolvido_em ? 'feito' : ''}`}>
                    <span className="chip">{TIPOS[a.tipo]}</span>
                    <div>
                      <h3>{c?.nome ?? 'Conta'}</h3>
                      {c && <div className="muted pequeno"><span className={`plat ${c.plataforma}`}>{PLAT[c.plataforma]}</span> {c.plataforma === 'meta' ? 'act_' : ''}{c.id_externo}</div>}
                    </div>
                    {d.nivel && <div><div className="nivel">{d.nivel}</div><div>{d.nome}</div></div>}
                    <div className="big num">{a.titulo}</div>
                    <p className="muted">{a.detalhe}</p>
                    {d.criativos?.length ? (
                      <div><div className="nivel">Criativos com custo alto</div>
                        <ul>{d.criativos.map((x, i) => <li key={i}>{x.texto}</li>)}{d.outros_criativos ? <li>+ {d.outros_criativos} outro(s)</li> : null}</ul>
                      </div>
                    ) : null}
                    {d.semanas?.length ? (
                      <div className="semanas num">{d.semanas.map((s) => [
                        <span key={s.periodo + 'p'} className="muted">{s.periodo}</span>,
                        <b key={s.periodo + 'v'}>{s.pct === null ? 'sem resultado' : `+${s.pct}% acima da média`}</b>,
                      ])}</div>
                    ) : null}
                    <div className="row">
                      {a.resolvido_em ? <span className="ok pequeno">✓ Resolvido às {horaBR(a.resolvido_em)}{a.resolvido_por ? ` por ${(nomes.get(a.resolvido_por) || '').split(' ')[0]}` : ''}</span>
                        : atrasado ? <span className="late pequeno">Pendente desde este dia</span> : <span className="muted pequeno">Pendente</span>}
                      {podeResolver(a) && (
                        <form action={alternarResolvido}>
                          <input type="hidden" name="aviso" value={a.id} />
                          <input type="hidden" name="voltar" value={voltar} />
                          <button type="submit" className={`btn ${a.resolvido_em ? '' : 'primary'}`}>{a.resolvido_em ? 'Reabrir' : 'Marcar como resolvido'}</button>
                        </form>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
