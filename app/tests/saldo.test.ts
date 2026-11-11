import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valorDoTexto, lerSaldo, brl, textoSaldo, textoStatus } from '../src/lib/saldo.ts';

test('valorDoTexto lê formato brasileiro e americano', () => {
  assert.equal(valorDoTexto('Saldo disponível (R$1.234,56 BRL)'), 1234.56);
  assert.equal(valorDoTexto('Available balance (R$1,234.56 BRL)'), 1234.56);
  assert.equal(valorDoTexto('Visa *1234'), 1234);
  assert.equal(valorDoTexto('sem número'), null);
});

test('lerSaldo: pré-pago pelo texto, mesmo sem is_prepay_account', () => {
  const s = lerSaldo({ id: 'act_1', account_id: '1', name: 'X', account_status: 1,
    funding_source_details: { display_string: 'Saldo disponível (R$45,30 BRL)', type: 20 } });
  assert.deepEqual(s, { valor: 45.3, tipo: 'Saldo pré-pago' });
});

test('lerSaldo: limite de gastos em centavos', () => {
  const s = lerSaldo({ id: 'act_2', account_id: '2', name: 'Y', account_status: 1,
    spend_cap: '100000', amount_spent: '25050', funding_source_details: { display_string: 'Visa *1234', type: 1 } });
  assert.deepEqual(s, { valor: 749.5, tipo: 'Limite de gastos restante' });
});

test('cartão sem limite aparece como Pagamento recorrente', () => {
  const c = { id: 'act_3', account_id: '3', name: 'Z', account_status: 3,
    funding_source_details: { display_string: 'Visa *1234', type: 1 } };
  assert.equal(lerSaldo(c), null);
  assert.equal(textoSaldo(c), 'Pagamento recorrente');
  assert.equal(textoStatus(c), 'Pagamento pendente');
});

test('brl', () => {
  assert.equal(brl(1234.5), 'R$ 1.234,50');
  assert.equal(brl(-3), '-R$ 3,00');
});
