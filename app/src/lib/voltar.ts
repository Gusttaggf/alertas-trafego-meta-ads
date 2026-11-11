import 'server-only';
import { redirect } from 'next/navigation';

/** Volta para a página com uma mensagem de sucesso ou erro no endereço. */
export function voltar(caminho: string, tipo: 'ok' | 'erro', mensagem: string): never {
  redirect(`${caminho}?${tipo}=${encodeURIComponent(mensagem)}`);
}
