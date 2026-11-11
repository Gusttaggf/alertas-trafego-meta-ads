/**
 * Lê uma variável de ambiente obrigatória, com mensagem clara se faltar
 * ou se vier com caracteres que não pertencem a uma chave (texto copiado junto, setas, acentos).
 */
export function env(nome: string): string {
  const v = process.env[nome]?.trim();
  if (!v) throw new Error(`Variável de ambiente ${nome} não configurada (veja app/.env.example).`);
  const invalido = [...v].findIndex((c) => c.charCodeAt(0) > 126 || c.charCodeAt(0) < 32);
  if (invalido >= 0) {
    throw new Error(`A variável ${nome} tem um caractere inválido na posição ${invalido + 1} ("${v[invalido]}"). Copie a chave de novo pelo botão de copiar, cole na Vercel e faça Redeploy.`);
  }
  return v;
}
