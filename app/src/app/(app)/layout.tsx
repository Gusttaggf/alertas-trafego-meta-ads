import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ItemMenu from '@/components/ItemMenu';
import TemaToggle from '@/components/TemaToggle';
import { pessoaAtual } from '@/lib/sessao';
import { listarPessoas } from '@/lib/dados';
import { NOME_PAPEL } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const eu = await pessoaAtual();
  if (!eu.papel) redirect('/aguardando');
  const tema = (await cookies()).get('tema')?.value || 'auto';
  const aguardando = eu.papel === 'gestor' ? 0 : (await listarPessoas()).filter((p) => !p.papel).length;

  const menu: [string, string, number?][] =
    eu.papel === 'administrador' ? [['/visao-geral', 'Visão geral'], ['/contas', 'Contas'], ['/pessoas', 'Pessoas', aguardando], ['/configuracoes', 'Configurações']]
    : eu.papel === 'head' ? [['/equipe', 'Minha equipe'], ['/contas', 'Distribuir contas'], ['/pessoas', 'Pessoas da equipe', aguardando]]
    : [['/minhas-contas', 'Minhas contas']];

  return (
    <div className="shell">
      <nav className="side" aria-label="Menu">
        <div className="brand">
          <span className="logo" role="img" aria-label="Agência Estrategista" />
          <small>Alertas de tráfego · {NOME_PAPEL[eu.papel]}</small>
        </div>
        {menu.map(([href, texto, n]) => <ItemMenu key={href} href={href} texto={texto} numero={n} />)}
        <TemaToggle inicial={tema} />
        <div className="who">
          <b>{eu.nome}</b>
          <span className="muted pequeno">{eu.email}</span>
          <form action="/auth/sair" method="post"><button className="btn" type="submit">Sair</button></form>
        </div>
        <span className="selo" aria-hidden="true" />
      </nav>
      <main>{children}</main>
    </div>
  );
}
