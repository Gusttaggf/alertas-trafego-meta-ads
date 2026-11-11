/** Mostra a mensagem que uma ação deixou no endereço (?ok=... ou ?erro=...). */
export default function Aviso({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <div className="aviso erro" role="alert">{erro}</div>;
  if (ok) return <div className="aviso sucesso" role="status">{ok}</div>;
  return null;
}
