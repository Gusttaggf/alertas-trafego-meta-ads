import Aviso from '@/components/Aviso';
import SelectAuto from '@/components/SelectAuto';
import { exigirPapel } from '@/lib/sessao';
import { listarContas, listarPessoas } from '@/lib/dados';
import { NOME_PAPEL, pessoasVisiveis, type Pessoa } from '@/lib/permissoes';
import { salvarPessoa } from './acoes';

const ordem = (p: Pessoa) => (!p.papel ? 0 : p.papel === 'administrador' ? 1 : p.papel === 'head' ? 2 : 3);

export default async function Pessoas({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const eu = await exigirPapel('administrador', 'head');
  const { ok, erro } = await searchParams;
  const [todas, contas] = await Promise.all([listarPessoas(), listarContas()]);
  const lista = pessoasVisiveis(eu, todas).sort((a, b) => ordem(a) - ordem(b) || a.nome.localeCompare(b.nome));
  const heads = todas.filter((p) => p.papel === 'head');
  const admin = eu.papel === 'administrador';
  const aguardando = lista.filter((p) => !p.papel).length;
  const nContas = (p: Pessoa) => p.papel === 'gestor' ? contas.filter((c) => c.gestor_id === p.id).length
    : p.papel === 'head' ? contas.filter((c) => c.head_id === p.id).length : null;

  return (
    <>
      <div className="head">
        <div>
          <h1>{admin ? 'Pessoas' : 'Pessoas da equipe'}</h1>
          <span className="muted">{admin
            ? 'Defina quem é head e quem é gestor. Quem entra no app pela primeira vez fica aguardando acesso.'
            : 'Coloque como gestor da sua equipe quem entrou no app e está aguardando acesso.'}</span>
        </div>
        {aguardando > 0 && <span className="late">{aguardando} pessoa{aguardando === 1 ? '' : 's'} aguardando acesso</span>}
      </div>
      <Aviso ok={ok} erro={erro} />
      {lista.length === 0 ? <div className="vazio">Ninguém por aqui ainda. Quem entrar no app com o Google aparece nesta lista.</div> : (
        <div className="panel"><div className="tscroll"><table>
          <thead><tr><th>Pessoa</th><th>Papel</th>{admin && <th>Equipe (head)</th>}<th className="r">Contas</th>{!admin && <th />}</tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td><b>{p.nome}</b><div className="muted pequeno">{p.email}</div></td>
                <td>
                  {admin && p.papel !== 'administrador' ? (
                    <form action={salvarPessoa}>
                      <input type="hidden" name="alvo" value={p.id} />
                      <SelectAuto name="papel" defaultValue={p.papel ?? ''} aria-label={`Papel de ${p.nome}`}>
                        <option value="">Sem acesso</option>
                        <option value="head">Head</option>
                        <option value="gestor">Gestor</option>
                      </SelectAuto>
                    </form>
                  ) : <span className={`pill ${p.papel ?? 'aguardando'}`}>{p.papel ? NOME_PAPEL[p.papel] : 'Aguardando acesso'}</span>}
                </td>
                {admin && (
                  <td>
                    {p.papel === 'gestor' ? (
                      <form action={salvarPessoa}>
                        <input type="hidden" name="alvo" value={p.id} />
                        <input type="hidden" name="papel" value="gestor" />
                        <SelectAuto name="head_id" defaultValue={p.head_id ?? ''} aria-label={`Equipe de ${p.nome}`}>
                          <option value="">Sem equipe</option>
                          {heads.map((h) => <option key={h.id} value={h.id}>{h.nome}</option>)}
                        </SelectAuto>
                      </form>
                    ) : <span className="muted">—</span>}
                  </td>
                )}
                <td className="r num">{nContas(p) ?? '—'}</td>
                {!admin && (
                  <td>
                    <form action={salvarPessoa}>
                      <input type="hidden" name="alvo" value={p.id} />
                      <input type="hidden" name="papel" value="gestor" />
                      {p.papel ? (
                        <><input type="hidden" name="head_id" value="" /><button className="btn" type="submit">Tirar da equipe</button></>
                      ) : (
                        <><input type="hidden" name="head_id" value={eu.id} /><button className="btn primary" type="submit">Colocar na minha equipe</button></>
                      )}
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table></div></div>
      )}
    </>
  );
}
