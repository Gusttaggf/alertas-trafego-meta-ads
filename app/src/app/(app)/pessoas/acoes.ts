'use server';

import { revalidatePath } from 'next/cache';
import { exigirPapel } from '@/lib/sessao';
import { listarPessoas } from '@/lib/dados';
import { mudarPapel, type Papel } from '@/lib/permissoes';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { voltar } from '@/lib/voltar';

/** Formulário: alvo, papel ('' = sem acesso), head_id ('' = sem equipe). */
export async function salvarPessoa(form: FormData) {
  const eu = await exigirPapel('administrador', 'head');
  const pessoas = await listarPessoas();
  const alvo = pessoas.find((p) => p.id === form.get('alvo'));
  if (!alvo) voltar('/pessoas', 'erro', 'Pessoa não encontrada.');

  const papelForm = String(form.get('papel') ?? alvo.papel ?? '');
  const papel = (papelForm || null) as Papel;
  const headForm = form.has('head_id') ? String(form.get('head_id')) : alvo.head_id;
  const r = mudarPapel(eu, alvo, { papel, head_id: papel === 'gestor' ? headForm || null : null }, pessoas);
  if (!r.ok) voltar('/pessoas', 'erro', r.erro);

  const db = supabaseAdmin();
  const m = r.valor;
  // Ordem importa: primeiro desfaz o que dependia do papel antigo, depois grava o novo.
  if (m.liberarEquipe) {
    await db.from('pessoas').update({ head_id: null }).eq('head_id', alvo.id);
    await db.from('contas').update({ head_id: null, gestor_id: null, atualizado_em: new Date().toISOString() }).eq('head_id', alvo.id);
  }
  if (m.liberarContasDoGestor) {
    await db.from('contas').update({ gestor_id: null, atualizado_em: new Date().toISOString() }).eq('gestor_id', alvo.id);
  }
  if (m.moverContasParaHead) {
    await db.from('contas').update({ head_id: m.moverContasParaHead, atualizado_em: new Date().toISOString() }).eq('gestor_id', alvo.id);
  }
  const { error } = await db.from('pessoas').update(m.pessoa).eq('id', alvo.id);
  if (error) voltar('/pessoas', 'erro', 'Não consegui salvar: ' + error.message);

  revalidatePath('/', 'layout');
  const head = pessoas.find((p) => p.id === m.pessoa.head_id);
  const texto = !m.pessoa.papel ? `${alvo.nome} ficou sem acesso.`
    : m.pessoa.papel === 'head' ? `${alvo.nome} agora é head.`
    : !m.pessoa.head_id ? `${alvo.nome} saiu da equipe. As contas dele ficaram sem gestor.`
    : head?.id === eu.id ? `${alvo.nome} agora é gestor da sua equipe.`
    : `${alvo.nome} agora é gestor da equipe de ${head?.nome}.`;
  voltar('/pessoas', 'ok', texto);
}
