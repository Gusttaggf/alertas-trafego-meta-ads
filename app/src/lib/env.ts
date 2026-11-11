/** Lê uma variável de ambiente obrigatória, com mensagem clara se faltar. */
export function env(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`Variável de ambiente ${nome} não configurada (veja app/.env.example).`);
  return v;
}
