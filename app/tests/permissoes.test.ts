import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mudarPapel, atribuirConta, recebeAvisos, podeInscrever, podeResolver, contasVisiveis, pessoasVisiveis, paginaInicial, ehEmailDeAdministrador,
  type Pessoa, type Conta,
} from '../src/lib/permissoes.ts';

const p = (id: string, papel: Pessoa['papel'], head_id: string | null = null): Pessoa =>
  ({ id, nome: id, email: `${id}@x.com`, papel, head_id });
const adm = p('adm', 'administrador');
const h1 = p('h1', 'head');
const h2 = p('h2', 'head');
const g1 = p('g1', 'gestor', 'h1');
const g2 = p('g2', 'gestor', 'h2');
const novo = p('novo', null);
const todos = [adm, h1, h2, g1, g2, novo];
const conta = (head_id: string | null, gestor_id: string | null): Conta =>
  ({ id: 'c', plataforma: 'meta', id_externo: '1', nome: 'C', head_id, gestor_id });

test('administrador transforma quem aguarda em head e em gestor de uma equipe', () => {
  const r1 = mudarPapel(adm, novo, { papel: 'head', head_id: null }, todos);
  assert.ok(r1.ok); assert.deepEqual(r1.ok && r1.valor.pessoa, { papel: 'head', head_id: null });
  const r2 = mudarPapel(adm, novo, { papel: 'gestor', head_id: 'h1' }, todos);
  assert.ok(r2.ok && r2.valor.pessoa.head_id === 'h1');
});

test('administrador não mexe em administrador nem cria administrador', () => {
  assert.equal(mudarPapel(adm, adm, { papel: 'head', head_id: null }, todos).ok, false);
  assert.equal(mudarPapel(adm, novo, { papel: 'administrador', head_id: null }, todos).ok, false);
});

test('gestor só pode ir para a equipe de um head de verdade', () => {
  assert.equal(mudarPapel(adm, novo, { papel: 'gestor', head_id: 'g1' }, todos).ok, false);
});

test('head deixando de ser head libera a equipe e as contas', () => {
  const r = mudarPapel(adm, h1, { papel: 'gestor', head_id: 'h2' }, todos);
  assert.ok(r.ok && r.valor.liberarEquipe);
});

test('gestor mudando de equipe leva as contas; deixando de ser gestor, libera', () => {
  const muda = mudarPapel(adm, g1, { papel: 'gestor', head_id: 'h2' }, todos);
  assert.ok(muda.ok && muda.valor.moverContasParaHead === 'h2' && !muda.valor.liberarContasDoGestor);
  const sai = mudarPapel(adm, g1, { papel: null, head_id: null }, todos);
  assert.ok(sai.ok && sai.valor.liberarContasDoGestor && sai.valor.pessoa.head_id === null);
  const semEquipe = mudarPapel(adm, g1, { papel: 'gestor', head_id: null }, todos);
  assert.ok(semEquipe.ok && semEquipe.valor.liberarContasDoGestor);
});

test('head coloca quem aguarda na própria equipe e tira gestores dela', () => {
  assert.ok(mudarPapel(h1, novo, { papel: 'gestor', head_id: 'h1' }, todos).ok);
  const tira = mudarPapel(h1, g1, { papel: 'gestor', head_id: null }, todos);
  assert.ok(tira.ok && tira.valor.liberarContasDoGestor);
});

test('head não cria head, não mexe em outra equipe nem coloca gente na equipe dos outros', () => {
  assert.equal(mudarPapel(h1, novo, { papel: 'head', head_id: null }, todos).ok, false);
  assert.equal(mudarPapel(h1, g2, { papel: 'gestor', head_id: null }, todos).ok, false);
  assert.equal(mudarPapel(h1, novo, { papel: 'gestor', head_id: 'h2' }, todos).ok, false);
});

test('gestor e quem aguarda não mudam papéis', () => {
  assert.equal(mudarPapel(g1, novo, { papel: 'gestor', head_id: 'h1' }, todos).ok, false);
  assert.equal(mudarPapel(novo, novo, { papel: 'head', head_id: null }, todos).ok, false);
});

test('administrador passa conta para head e gestor; trocar o head tira o gestor antigo', () => {
  const r = atribuirConta(adm, conta(null, null), { head_id: 'h1', gestor_id: 'g1' }, todos);
  assert.deepEqual(r.ok && r.valor, { head_id: 'h1', gestor_id: 'g1' });
  const troca = atribuirConta(adm, conta('h1', 'g1'), { head_id: 'h2' }, todos);
  assert.deepEqual(troca.ok && troca.valor, { head_id: 'h2', gestor_id: null });
  assert.equal(atribuirConta(adm, conta('h1', null), { gestor_id: 'g2' }, todos).ok, false);
});

test('head escolhe gestor só da própria equipe e só nas contas dele', () => {
  assert.ok(atribuirConta(h1, conta('h1', null), { gestor_id: 'g1' }, todos).ok);
  assert.equal(atribuirConta(h1, conta('h1', null), { gestor_id: 'g2' }, todos).ok, false);
  assert.equal(atribuirConta(h1, conta('h2', null), { gestor_id: 'g1' }, todos).ok, false);
  assert.equal(atribuirConta(h1, conta('h1', null), { head_id: 'h2' }, todos).ok, false);
  assert.equal(atribuirConta(g1, conta('h1', null), { gestor_id: 'g1' }, todos).ok, false);
});

test('cada papel vê só o que é dele', () => {
  const cs = [conta('h1', 'g1'), { ...conta('h2', 'g2'), id: 'd' }];
  assert.equal(contasVisiveis(adm, cs).length, 2);
  assert.equal(contasVisiveis(h1, cs).length, 1);
  assert.equal(contasVisiveis(g2, cs)[0].id, 'd');
  assert.equal(contasVisiveis(novo, cs).length, 0);
  assert.deepEqual(pessoasVisiveis(h1, todos).map((x) => x.id), ['g1', 'novo']);
  assert.equal(pessoasVisiveis(g1, todos).length, 0);
});

test('página inicial e e-mails de administrador', () => {
  assert.equal(paginaInicial(null), '/aguardando');
  assert.equal(paginaInicial('gestor'), '/agenda');
  assert.ok(ehEmailDeAdministrador(' Gustavo@Agencia.com ', 'outro@x.com, gustavo@agencia.com'));
  assert.equal(ehEmailDeAdministrador('a@b.com', undefined), false);
});

test('avisos: gestor recebe as dele; administrador e head recebem o que escolherem', () => {
  const c = conta('h1', 'g1');
  assert.ok(recebeAvisos(g1, c, false));
  assert.equal(recebeAvisos(adm, c, false), false);
  assert.ok(recebeAvisos(adm, c, true));
  assert.ok(podeInscrever(adm, conta('h2', null)));
  assert.ok(podeInscrever(h1, c));
  assert.equal(podeInscrever(h1, conta('h2', null)), false);
  assert.equal(podeInscrever(g1, c), false);
  assert.ok(podeResolver(h1, c, false));
  assert.ok(podeResolver(adm, c, false));
  assert.equal(podeResolver(g2, c, false), false);
  assert.equal(podeResolver(h2, c, false), false);
});
