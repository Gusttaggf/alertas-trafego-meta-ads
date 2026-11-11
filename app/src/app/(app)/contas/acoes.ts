'use server';

import { revalidatePath } from 'next/cache';
import { exigirPapel } from '@/lib/sessao';
import { conexaoMetaDaAgencia, listarContas, listarPessoas } from '@/lib/dados';
import { atribuirConta } from '@/lib/permissoes';
import { listarContasMeta, ErroMeta } from '@/lib/meta';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { voltar } from '@/lib/voltar';

/** Formulário: conta, e head_id e/ou gestor_id ('' = ninguém). */
export async function salvarConta(form: FormData) {
  const eu = await exigirPapel('administrador', 'head');
  const [contas, pessoas] = await Promise.all([listarContas(), listarPessoas()]);
  const conta = contas.find((c) => c.id === form.get('conta'));
  if (!conta) voltar('/contas', 'erro', 'Conta não encontrada.');
  const novo: { head_id?: string | null; gestor_id?: string | null } = {};
  if (form.has('head_id')) novo.head_id = String(form.get('head_id')) || null;
  if (form.has('gestor_id')) novo.gestor_id = String(form.get('gestor_id')) || null;

  const r = atribuirConta(eu, conta, novo, pessoas);
  if (!r.ok) voltar('/contas', 'erro', r.erro);
  const { error } = await supabaseAdmin().from('contas')
    .update({ ...r.valor, atualizado_em: new Date().toISOString() }).eq('id', conta.id);
  if (error) voltar('/contas', 'erro', 'Não consegui salvar: ' + error.message);
  revalidatePath('/', 'layout');
  const gestor = pessoas.find((p) => p.id === r.valor.gestor_id);
  const head = pessoas.find((p) => p.id === r.valor.head_id);
  voltar('/contas', 'ok', gestor ? `${conta.nome} agora com ${gestor.nome}.` : head ? `${conta.nome} com a equipe de ${head.nome}, sem gestor.` : `${conta.nome} sem head.`);
}

/** Traz as contas de anúncio que a conexão do Meta enxerga. Não mexe em quem é responsável. */
export async function importarContasMeta() {
  await exigirPapel('administrador');
  const conexao = await conexaoMetaDaAgencia();
  if (!conexao) voltar('/contas', 'erro', 'Conecte o Meta primeiro.');
  let lista;
  try {
    lista = await listarContasMeta(conexao.token);
  } catch (e) {
    const err = e as ErroMeta;
    voltar('/contas', 'erro', err.codigo === 190 ? 'O acesso ao Meta expirou. Clique em "Reconectar Meta".' : 'Erro do Meta: ' + err.message);
  }
  const antes = new Set((await listarContas()).filter((c) => c.plataforma === 'meta').map((c) => c.id_externo));
  const linhas = lista.map((c) => ({ plataforma: 'meta', id_externo: String(c.account_id), nome: c.name, ativa: true, atualizado_em: new Date().toISOString() }));
  if (linhas.length) {
    const { error } = await supabaseAdmin().from('contas').upsert(linhas, { onConflict: 'plataforma,id_externo' });
    if (error) voltar('/contas', 'erro', 'Não consegui salvar as contas: ' + error.message);
  }
  const novas = linhas.filter((l) => !antes.has(l.id_externo)).length;
  revalidatePath('/', 'layout');
  voltar('/contas', 'ok', `${lista.length} contas encontradas no Meta, ${novas} nova${novas === 1 ? '' : 's'}.`);
}
