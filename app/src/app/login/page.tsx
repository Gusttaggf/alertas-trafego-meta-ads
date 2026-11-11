import BotaoFacebook from './BotaoFacebook';

const MENSAGENS: Record<string, string> = {
  sem_token: 'O Facebook não devolveu a permissão de anúncios. Entre de novo e aceite o acesso às contas de anúncio.',
  falhou: 'Não foi possível concluir o login. Tente de novo.',
};

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string; detalhe?: string }> }) {
  const { erro, detalhe } = await searchParams;
  return (
    <main>
      <div className="cartao" style={{ maxWidth: 440, margin: '10vh auto 0' }}>
        <h1>Alertas de Tráfego</h1>
        <p className="suave">Entre com o Facebook que tem acesso às contas de anúncio da equipe.</p>
        <BotaoFacebook />
        {erro && <p className="erro">{MENSAGENS[erro] || MENSAGENS.falhou}{detalhe ? ` (${detalhe})` : ''}</p>}
      </div>
    </main>
  );
}
