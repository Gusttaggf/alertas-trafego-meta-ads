import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ItemMenu from '@/components/ItemMenu';
import TemaToggle from '@/components/TemaToggle';
import Notificacoes from '@/components/Notificacoes';
import { chavesVapid } from '@/lib/push';
import { pessoaAtual } from '@/lib/sessao';
import { avisosDasContas, listarContas, listarInscricoes, listarPessoas } from '@/lib/dados';
import { diaSP, somarDias } from '@/lib/tempo';
import { NOME_PAPEL } from '@/lib/permissoes';

export const dynamic = 'force-dynamic';

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const eu = await pessoaAtual();
  if (!eu.papel) redirect('/aguardando');
  const tema = (await cookies()).get('tema')?.value || 'auto';
  const aguardando = eu.papel === 'gestor' ? 0 : (await listarPessoas()).filter((p) => !p.papel).length;
  const [contas, inscricoes] = await Promise.all([listarContas(), listarInscricoes(eu.id)]);
  const inscritas = new Set(inscricoes.map((i) => i.conta_id));
  const hoje = diaSP();
  const pendentes = (await avisosDasContas(contas.filter((c) => c.gestor_id === eu.id || inscritas.has(c.id)).map((c) => c.id), somarDias(hoje, -7), hoje))
    .filter((a) => !a.resolvido_em).length;

  const menu: [string, string, number?][] =
    eu.papel === 'administrador' ? [['/visao-geral', 'Visão geral'], ['/agenda', 'Minha agenda', pendentes], ['/contas', 'Contas'], ['/pessoas', 'Pessoas', aguardando], ['/configuracoes', 'Configurações']]
    : eu.papel === 'head' ? [['/equipe', 'Minha equipe'], ['/agenda', 'Minha agenda', pendentes], ['/contas', 'Distribuir contas'], ['/pessoas', 'Pessoas da equipe', aguardando]]
    : [['/agenda', 'Minha agenda', pendentes], ['/minhas-contas', 'Minhas contas']];

  return (
    <div className="shell">
      <nav className="side" aria-label="Menu">
        <div className="brand">
          <span className="logo" role="img" aria-label="Agência Estrategista" />
          <small>Gestor Estrategista · {NOME_PAPEL[eu.papel]}</small>
        </div>
        {menu.map(([href, texto, n]) => <ItemMenu key={href} href={href} texto={texto} numero={n} />)}
        <TemaToggle inicial={tema} />
        <Notificacoes chavePublica={(await chavesVapid()).publica} />
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
