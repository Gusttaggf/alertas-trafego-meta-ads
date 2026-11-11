import { redirect } from 'next/navigation';
import { supabaseServidor } from '@/lib/supabase/server';
import { lerConexao, listarContas, type ErroMeta } from '@/lib/meta';
import { textoSaldo, textoStatus, type ContaMeta } from '@/lib/saldo';

export const dynamic = 'force-dynamic';

function dataBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default async function Contas() {
  const supabase = await supabaseServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const conexao = await lerConexao(user.id);
  if (!conexao) redirect('/login?erro=sem_token');

  let contas: ContaMeta[] = [];
  let erro = '';
  try {
    contas = await listarContas(conexao.token);
  } catch (e) {
    const err = e as ErroMeta;
    erro = err.codigo === 190 ? 'Token inválido ou expirado. Saia e entre de novo com o Facebook.' : err.message;
  }

  return (
    <main>
      <div className="topo">
        <div>
          <h1>Contas de anúncio</h1>
          <p className="suave">
            Conectado como {conexao.fb_nome}
            {conexao.expira_em ? ` · acesso ao Meta válido até ${dataBR(conexao.expira_em)}` : ''}
          </p>
        </div>
        <form action="/auth/sair" method="post">
          <button className="botao leve" type="submit">Sair</button>
        </form>
      </div>

      <div className="cartao">
        {erro ? <p className="erro">{erro}</p> : contas.length === 0 ? (
          <p className="suave">Nenhuma conta de anúncio encontrada para este Facebook.</p>
        ) : (
          <div className="rolagem">
            <table>
              <thead>
                <tr><th>Conta</th><th>ID</th><th>Situação</th><th className="num">Saldo</th></tr>
              </thead>
              <tbody>
                {contas.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="suave">{c.account_id}</td>
                    <td className={c.account_status === 1 ? '' : 'problema'}>{textoStatus(c)}</td>
                    <td className="num">{textoSaldo(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
