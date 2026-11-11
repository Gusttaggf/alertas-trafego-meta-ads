import 'server-only';
import { avisosDasContas, type Aviso } from '@/lib/dados';
import { diaSP, inicioDaSemana, somarDias } from '@/lib/tempo';

export function diaValido(dia: string | undefined, hoje: string) {
  return dia && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : hoje;
}

/** Avisos da semana do dia escolhido e quantos ficaram pendentes em dias anteriores (até 7 dias). */
export async function carregarAgenda(contaIds: string[], dia: string) {
  const hoje = diaSP();
  const ini = inicioDaSemana(dia);
  const [semana, recentes] = await Promise.all([
    avisosDasContas(contaIds, ini, somarDias(ini, 6)),
    avisosDasContas(contaIds, somarDias(hoje, -7), hoje),
  ]);
  const atrasados = recentes.filter((a) => !a.resolvido_em && a.dia < dia).length;
  return { avisos: semana, atrasados, hoje };
}

/** Pendências por gestor (hoje e últimos 7 dias), para os cartões do head e do administrador. */
export type Pendencias = { total: number; atrasados: number; porTipo: Record<Aviso['tipo'], number> };
export async function pendenciasPorGestor(contas: { id: string; gestor_id: string | null }[]): Promise<Map<string, Pendencias>> {
  const hoje = diaSP();
  const comGestor = contas.filter((c) => c.gestor_id);
  const avisos = (await avisosDasContas(comGestor.map((c) => c.id), somarDias(hoje, -7), hoje)).filter((a) => !a.resolvido_em);
  const gestorDa = new Map(comGestor.map((c) => [c.id, c.gestor_id!]));
  const mapa = new Map<string, Pendencias>();
  for (const a of avisos) {
    const g = gestorDa.get(a.conta_id)!;
    const p = mapa.get(g) || { total: 0, atrasados: 0, porTipo: { saldo: 0, custo: 0, orcamento: 0, ruim: 0 } };
    p.total++; p.porTipo[a.tipo]++; if (a.dia < hoje) p.atrasados++;
    mapa.set(g, p);
  }
  return mapa;
}
