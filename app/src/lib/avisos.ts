import type { TipoAviso } from '@/lib/dados';

export const TIPOS: Record<TipoAviso, string> = {
  saldo: 'Saldo acabando',
  custo: 'Custo alto',
  orcamento: 'Gasto acima do diário',
  ruim: 'Ruim há 2 semanas',
};
export const ORDEM_TIPOS = Object.keys(TIPOS) as TipoAviso[];
