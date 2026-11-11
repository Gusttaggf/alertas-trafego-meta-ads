import Aviso from '@/components/Aviso';
import SelectAuto from '@/components/SelectAuto';
import { exigirPapel } from '@/lib/sessao';
import { conexaoMetaDaAgencia, listarContas, listarPessoas } from '@/lib/dados';
import { contasVisiveis } from '@/lib/permissoes';
import { importarContasMeta, salvarConta } from './acoes';

const PLAT = { meta: 'Meta', google: 'Google Ads' } as const;
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export default async function Contas({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const eu = await exigirPapel('administrador', 'head');
  const { ok, erro } = await searchParams;
  const admin = eu.papel === 'administrador';
  const [todas, pessoas, conexao] = await Promise.all([listarContas(), listarPessoas(), admin ? conexaoMetaDaAgencia() : null]);
  const contas = contasVisiveis(eu, todas);
  const heads = pessoas.filter((p) => p.papel === 'head');
  const gestoresDe = (headId: string | null) => pessoas.filter((p) => p.papel === 'gestor' && p.head_id === headId);
  const semHead = contas.filter((c) => !c.head_id).length;
  const semGestor = contas.filter((c) => c.head_id && !c.gestor_id).length;

  return (
    <>
      <div className="head">
        <div>
          <h1>{admin ? 'Contas' : 'Distribuir contas'}</h1>
          <span className="muted">{admin
            ? 'Passe cada conta para um head. O head escolhe o gestor da equipe dele (você também pode escolher).'
            : 'Contas que o administrador passou para a sua equipe. Escolha o gestor de cada uma; ele passa a receber os avisos dela.'}</span>
        </div>
        <div className="stats">
          {admin && semHead > 0 && <span className="late">{semHead} sem head</span>}
          {semGestor > 0 && <span className="late">{semGestor} sem gestor</span>}
        </div>
      </div>
      <Aviso ok={ok} erro={erro} />

      {admin && (
        <div className="panel pad" style={{ paddingBlock: 4 }}>
          <div className="conex">
            <span className="plat">Meta</span>
            <div style={{ minWidth: 0 }}>
              {conexao ? <><b>{conexao.fb_nome}</b><div className="muted">Conta mãe{conexao.expira_em ? ` · acesso válido até ${dataBR(conexao.expira_em)}` : ''}</div></>
                : <><b>Meta não conectado</b><div className="muted">Conecte o Facebook que enxerga todas as contas de anúncio da agência.</div></>}
            </div>
            <div className="acoes">
              {conexao && <form action={importarContasMeta}><button className="btn" type="submit">Importar contas do Meta</button></form>}
              <a className={`btn ${conexao ? '' : 'primary'}`} href="/api/meta/conectar">{conexao ? 'Reconectar Meta' : 'Conectar Meta'}</a>
            </div>
          </div>
          <div className="conex">
            <span className="plat google">Google Ads</span>
            <div><b>Pelo login de cada pessoa</b><div className="muted">Chega na próxima etapa: cada pessoa autoriza o Google Ads dela e as contas aparecem aqui.</div></div>
          </div>
        </div>
      )}

      {contas.length === 0 ? (
        <div className="vazio">{admin ? 'Nenhuma conta ainda. Conecte o Meta e clique em "Importar contas do Meta".' : 'O administrador ainda não passou contas para a sua equipe.'}</div>
      ) : (
        <div className="panel"><div className="tscroll"><table>
          <thead><tr><th>Cliente</th><th>Plataforma</th><th>ID da conta</th>{admin && <th>Head</th>}<th>Gestor responsável</th></tr></thead>
          <tbody>
            {contas.map((c) => {
              const gs = gestoresDe(c.head_id);
              return (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td><span className={`plat ${c.plataforma}`}>{PLAT[c.plataforma]}</span></td>
                  <td className="num muted">{c.plataforma === 'meta' ? 'act_' : ''}{c.id_externo}</td>
                  {admin && (
                    <td>
                      <form action={salvarConta}>
                        <input type="hidden" name="conta" value={c.id} />
                        <SelectAuto name="head_id" defaultValue={c.head_id ?? ''} aria-label={`Head de ${c.nome}`}>
                          <option value="">Sem head</option>
                          {heads.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
                        </SelectAuto>
                      </form>
                    </td>
                  )}
                  <td>
                    <form action={salvarConta}>
                      <input type="hidden" name="conta" value={c.id} />
                      <SelectAuto name="gestor_id" defaultValue={c.gestor_id ?? ''} disabled={!c.head_id} aria-label={`Gestor de ${c.nome}`}>
                        <option value="">{c.head_id ? (gs.length ? 'Escolher gestor' : 'Equipe sem gestores') : 'Escolha o head antes'}</option>
                        {gs.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                      </SelectAuto>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}
