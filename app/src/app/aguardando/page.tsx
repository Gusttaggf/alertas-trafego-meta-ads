import { redirect } from 'next/navigation';
import { pessoaAtual } from '@/lib/sessao';

export const dynamic = 'force-dynamic';

export default async function Aguardando() {
  const eu = await pessoaAtual();
  if (eu.papel) redirect('/');
  return (
    <div className="centro">
      <div className="cartao-login">
        <span className="logo" role="img" aria-label="Agência Estrategista" />
        <h1>Aguardando acesso</h1>
        <p className="muted">
          Olá, {eu.nome}. Você entrou com <b>{eu.email}</b>. Peça ao seu head ou ao administrador para liberar seu acesso.
          Depois disso, é só abrir o app de novo.
        </p>
        <form action="/auth/sair" method="post"><button className="btn" type="submit">Sair</button></form>
      </div>
    </div>
  );
}
