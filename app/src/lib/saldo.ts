// Regras de saldo e status portadas de src/AlertasTrafego.gs (lerSaldo_, valorDoTexto_, STATUS_CONTA).
// Funções puras, sem dependências: testadas em tests/saldo.test.ts.

export type ContaMeta = {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  currency?: string;
  is_prepay_account?: boolean;
  spend_cap?: string;
  amount_spent?: string;
  funding_source_details?: { display_string?: string; type?: number | string };
};

export const STATUS_CONTA: Record<number, string> = {
  1: 'Ativa', 2: 'Desativada', 3: 'Pagamento pendente', 7: 'Em análise de risco',
  8: 'Pagamento pendente de liquidação', 9: 'Em período de carência', 100: 'Encerramento pendente',
  101: 'Encerrada', 201: 'Ativa (qualquer)', 202: 'Encerrada (qualquer)',
};

export type Saldo = { valor: number; tipo: 'Saldo pré-pago' | 'Limite de gastos restante' } | null;

/** Lê um valor como "Saldo disponível (R$1.234,56 BRL)". */
export function valorDoTexto(txt: string): number | null {
  txt = String(txt);
  const aposRS = txt.indexOf('R$') >= 0 ? txt.slice(txt.indexOf('R$') + 2) : txt;
  const m = aposRS.match(/-?\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

/** Saldo pré-pago ou limite de gastos restante. null = cartão sem limite ("Pagamento recorrente"). */
export function lerSaldo(conta: ContaMeta): Saldo {
  const fsd = conta.funding_source_details || {};
  const texto = String(fsd.display_string || '');
  const pareceSaldo = /saldo|balance|dispon/i.test(texto) || Number(fsd.type) === 20;
  if ((conta.is_prepay_account || pareceSaldo) && texto) {
    const v = valorDoTexto(texto);
    if (v !== null) return { valor: v, tipo: 'Saldo pré-pago' };
  }
  const limite = Number(conta.spend_cap || 0);
  if (limite > 0) {
    return { valor: (limite - Number(conta.amount_spent || 0)) / 100, tipo: 'Limite de gastos restante' };
  }
  return null;
}

export function brl(v: number): string {
  const partes = Math.abs(v).toFixed(2).split('.');
  partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-' : '') + 'R$ ' + partes[0] + ',' + partes[1];
}

export function textoSaldo(conta: ContaMeta): string {
  const s = lerSaldo(conta);
  return s ? brl(s.valor) : 'Pagamento recorrente';
}

export function textoStatus(conta: ContaMeta): string {
  return STATUS_CONTA[conta.account_status] || `Status ${conta.account_status}`;
}
