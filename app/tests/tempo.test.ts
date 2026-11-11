import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horarioAtual, proximoHorario, somarDias, inicioDaSemana, diaSP, minutosSP } from '../src/lib/tempo.ts';

const H = ['07:00', '12:00', '16:00'];
const sp = (iso: string) => new Date(`${iso}-03:00`);

test('fuso de São Paulo', () => {
  assert.equal(diaSP(new Date('2026-11-12T02:30:00Z')), '2026-11-11');
  assert.equal(minutosSP(sp('2026-11-11T13:40:00')), 13 * 60 + 40);
});

test('o que é encontrado entre horários aparece no próximo', () => {
  assert.deepEqual(proximoHorario(H, sp('2026-11-11T05:00:00')).horario, '07:00');
  assert.deepEqual(proximoHorario(H, sp('2026-11-11T07:05:00')).horario, '07:00'); // verificação das 07h
  assert.deepEqual(proximoHorario(H, sp('2026-11-11T08:00:00')).horario, '12:00');
  assert.deepEqual(proximoHorario(H, sp('2026-11-11T13:00:00')).horario, '16:00');
  const noite = proximoHorario(H, sp('2026-11-11T21:00:00'));
  assert.deepEqual([noite.dia, noite.horario], ['2026-11-12', '07:00']);
  assert.equal(proximoHorario(H, sp('2026-11-11T08:00:00')).visivelEm.toISOString(), '2026-11-11T15:00:00.000Z');
});

test('verificar agora: aparece hoje, no horário mais recente', () => {
  assert.deepEqual([horarioAtual(H, sp('2026-11-11T20:40:00')).dia, horarioAtual(H, sp('2026-11-11T20:40:00')).horario], ['2026-11-11', '16:00']);
  assert.equal(horarioAtual(H, sp('2026-11-11T09:00:00')).horario, '07:00');
  assert.equal(horarioAtual(H, sp('2026-11-11T05:00:00')).horario, '07:00');
});

test('dias e semana', () => {
  assert.equal(somarDias('2026-11-30', 1), '2026-12-01');
  assert.equal(somarDias('2026-11-11', -14), '2026-10-28');
  assert.equal(inicioDaSemana('2026-11-11'), '2026-11-09'); // quarta -> segunda
  assert.equal(inicioDaSemana('2026-11-15'), '2026-11-09'); // domingo -> segunda anterior
});
