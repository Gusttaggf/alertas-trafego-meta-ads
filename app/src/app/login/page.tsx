import BotaoGoogle from './BotaoGoogle';

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <div className="centro">
      <div className="cartao-login">
        <span className="logo" role="img" aria-label="Agência Estrategista" />
        <div>
          <h1>Alertas de Tráfego</h1>
          <p className="muted">Entre com o e-mail do Google que você usa na agência.</p>
        </div>
        <BotaoGoogle />
        {erro && <p className="aviso erro">Não foi possível entrar: {erro}</p>}
      </div>
    </div>
  );
}
