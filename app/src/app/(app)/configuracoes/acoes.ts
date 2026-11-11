'use server';

import { revalidatePath } from 'next/cache';
import { exigirPapel } from '@/lib/sessao';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { voltar } from '@/lib/voltar';

const NUMEROS = ['dias_min_saldo', 'pct_custo_alto', 'tolerancia_orc_meta', 'tolerancia_orc_google', 'gasto_min_custo', 'pct_ruim_2_semanas', 'gasto_min_ruim'] as const;

export async function salvarConfiguracoes(form: FormData) {
  await exigirPapel('administrador');
  const horarios = [form.get('h1'), form.get('h2'), form.get('h3')].map(String).filter((h) => /^\d{2}:\d{2}$/.test(h)).sort();
  if (horarios.length !== 3 || new Set(horarios).size !== 3) voltar('/configuracoes', 'erro', 'Informe três horários diferentes.');
  const valores: Record<string, number | string[] | string> = { horarios, atualizado_em: new Date().toISOString() };
  for (const k of NUMEROS) {
    const n = Number(String(form.get(k)).replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) voltar('/configuracoes', 'erro', 'Use apenas números positivos.');
    valores[k] = n;
  }
  const { error } = await supabaseAdmin().from('configuracoes').update(valores).eq('id', 1);
  if (error) voltar('/configuracoes', 'erro', 'Não consegui salvar: ' + error.message);
  revalidatePath('/configuracoes');
  voltar('/configuracoes', 'ok', 'Configurações salvas.');
}
