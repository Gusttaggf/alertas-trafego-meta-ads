import { test } from 'node:test';
import assert from 'node:assert/strict';
import { montarNotificacao } from '../src/lib/avisos.ts';

test('notificação: título com quantidade e horário, até 3 linhas', () => {
  const n = montarNotificacao([
    { conta: 'Clínica Sorriso', tipo: 'saldo', horario: '12:00' },
    { conta: 'Bella Moda', tipo: 'custo', horario: '12:00' },
    { conta: 'Pet Shop', tipo: 'orcamento', horario: '12:00' },
    { conta: 'Advocacia', tipo: 'ruim', horario: '12:00' },
  ]);
  assert.equal(n.titulo, '4 avisos às 12:00');
  assert.equal(n.corpo, 'Clínica Sorriso: saldo acabando\nBella Moda: custo alto\nPet Shop: gasto acima do diário\n+ 1 outro');
  assert.equal(n.url, '/agenda');
  assert.equal(montarNotificacao([{ conta: 'X', tipo: 'saldo', horario: '07:00' }]).titulo, '1 aviso às 07:00');
});
