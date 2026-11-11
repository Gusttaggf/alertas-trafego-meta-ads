import Link from 'next/link';
import type { Conta, Pessoa } from '@/lib/permissoes';
import type { Pendencias } from '@/lib/agenda';
import { ORDEM_TIPOS, TIPOS } from '@/lib/avisos';

/** Cartões de gestores para o head e o administrador, com as pendências por tipo de aviso. */
export default function CartoesGestores({ gestores, contas, pendencias }: { gestores: Pessoa[]; contas: Conta[]; pendencias: Map<string, Pendencias> }) {
  if (!gestores.length) return <div className="vazio">Nenhum gestor nesta equipe ainda.</div>;
  return (
    <div className="grid-g">
      {gestores.map((g) => {
        const n = contas.filter((c) => c.gestor_id === g.id).length;
        const p = pendencias.get(g.id);
        const max = Math.max(3, ...ORDEM_TIPOS.map((t) => p?.porTipo[t] || 0));
        return (
          <Link key={g.id} className="gcard" href={`/gestor/${g.id}`}>
            <div className="top">
              <div><h3>{g.nome}</h3><span className="muted pequeno">{n} conta{n === 1 ? '' : 's'}</span></div>
              <div className="grande-num num" style={!p?.total ? { color: 'var(--ok)' } : undefined}>{p?.total || 0}<small>pendentes</small></div>
            </div>
            <div className="bars">
              {ORDEM_TIPOS.map((t) => {
                const k = p?.porTipo[t] || 0;
                return (
                  <div key={t} className={`bar t-${t}`}>
                    <span>{TIPOS[t]}</span>
                    <span className="track"><span className="fill" style={{ width: `${(k / max) * 100}%` }} /></span>
                    <span className="num">{k}</span>
                  </div>
                );
              })}
            </div>
            <div className="foot" style={{ justifyContent: 'space-between' }}>
              <span>{p?.atrasados ? <span className="late">{p.atrasados} atrasado{p.atrasados === 1 ? '' : 's'}</span> : 'Nada atrasado'}</span>
              <span>Ver detalhes →</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
