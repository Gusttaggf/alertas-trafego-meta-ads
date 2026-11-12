import type { TipoAviso } from '@/lib/dados';

export const TIPOS: Record<TipoAviso, string> = {
  saldo: 'Saldo acabando',
  custo: 'Custo alto',
  orcamento: 'Gasto acima do diário',
  ruim: 'Ruim há 2 semanas',
};
export const ORDEM_TIPOS = Object.keys(TIPOS) as TipoAviso[];

export type Notificacao = { titulo: string; corpo: string; url?: string; tag?: string };

/** Texto da notificação com os avisos de uma pessoa: um resumo curto, até 3 linhas. */
export function montarNotificacao(itens: { conta: string; tipo: TipoAviso; horario: string }[]): Notificacao {
  const horario = itens.map((i) => i.horario).sort().at(-1) || '';
  const linhas = itens.slice(0, 3).map((i) => `${i.conta}: ${TIPOS[i.tipo].toLowerCase()}`);
  if (itens.length > 3) linhas.push(`+ ${itens.length - 3} outro${itens.length - 3 === 1 ? '' : 's'}`);
  return {
    titulo: `${itens.length} aviso${itens.length === 1 ? '' : 's'}${horario ? ` às ${horario}` : ''}`,
    corpo: linhas.join('\n'),
    url: '/agenda',
    tag: `avisos-${horario}`,
  };
}

