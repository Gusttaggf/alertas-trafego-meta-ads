import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/lib/env.ts';

test('env: limpa espaços e acusa caractere colado junto com a chave', () => {
  process.env.TESTE_CHAVE = '  eyJabc.def  \n';
  assert.equal(env('TESTE_CHAVE'), 'eyJabc.def');
  process.env.TESTE_CHAVE = 'service_role key → eyJabc';
  assert.throws(() => env('TESTE_CHAVE'), /posição 18/);
  delete process.env.TESTE_CHAVE;
  assert.throws(() => env('TESTE_CHAVE'), /não configurada/);
});
