import Link from 'next/link';
import type { Conta, Pessoa } from '@/lib/permissoes';

/** Cartões de gestores para o head e o administrador. As pendências entram junto com os avisos. */
export default function CartoesGestores({ gestores, contas }: { gestores: Pessoa[]; contas: Conta[] }) {
  if (!gestores.length) return <div className="vazio">Nenhum gestor nesta equipe ainda.</div>;
  return (
    <div className="grid-g">
      {gestores.map((g) => {
        const minhas = contas.filter((c) => c.gestor_id === g.id);
        const google = minhas.filter((c) => c.plataforma === 'google').length;
        return (
          <Link key={g.id} className="gcard" href={`/gestor/${g.id}`}>
            <div className="top">
              <div><h3>{g.nome}</h3><span className="muted pequeno">{g.email}</span></div>
              <div className="grande-num num">{minhas.length}<small>conta{minhas.length === 1 ? '' : 's'}</small></div>
            </div>
            <div className="muted pequeno">{minhas.length - google} Meta · {google} Google Ads</div>
            <div className="foot"><span>Ver detalhes →</span></div>
          </Link>
        );
      })}
    </div>
  );
}
