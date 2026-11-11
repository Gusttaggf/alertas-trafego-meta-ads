import type { Conta } from '@/lib/permissoes';

const PLAT = { meta: 'Meta', google: 'Google Ads' } as const;

export default function TabelaContas({ contas, vazio }: { contas: Conta[]; vazio: string }) {
  if (!contas.length) return <div className="vazio">{vazio}</div>;
  return (
    <div className="panel"><div className="tscroll"><table>
      <thead><tr><th>Cliente</th><th>Plataforma</th><th>ID da conta</th></tr></thead>
      <tbody>
        {contas.map((c) => (
          <tr key={c.id}>
            <td>{c.nome}</td>
            <td><span className={`plat ${c.plataforma}`}>{PLAT[c.plataforma]}</span></td>
            <td className="num muted">{c.plataforma === 'meta' ? 'act_' : ''}{c.id_externo}</td>
          </tr>
        ))}
      </tbody>
    </table></div></div>
  );
}
