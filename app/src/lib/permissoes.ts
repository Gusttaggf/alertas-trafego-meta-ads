// Regras de quem pode fazer o quê. Funções puras (sem banco), testadas em tests/permissoes.test.ts.
// O servidor chama estas funções antes de gravar qualquer mudança.

export type Papel = 'administrador' | 'head' | 'gestor' | null;

export type Pessoa = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  head_id: string | null;
};

export type Conta = {
  id: string;
  plataforma: 'meta' | 'google';
  id_externo: string;
  nome: string;
  head_id: string | null;
  gestor_id: string | null;
  ultima_verificacao?: string | null;
  ultimo_erro?: string | null;
};

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };
const erro = (mensagem: string): { ok: false; erro: string } => ({ ok: false, erro: mensagem });

export const NOME_PAPEL: Record<Exclude<Papel, null>, string> = {
  administrador: 'Administrador',
  head: 'Head',
  gestor: 'Gestor',
};

// ---------------- Papéis ----------------

/** O que precisa ser gravado quando o papel ou a equipe de alguém muda. */
export type MudancaDePapel = {
  pessoa: { papel: Papel; head_id: string | null };
  /** Era head e deixou de ser: os gestores e as contas dele ficam sem head (e as contas sem gestor). */
  liberarEquipe: boolean;
  /** Era gestor e deixou de ser, ou saiu da equipe: as contas dele ficam sem gestor. */
  liberarContasDoGestor: boolean;
  /** Gestor mudou de equipe: as contas dele vão junto para o novo head. */
  moverContasParaHead: string | null;
};

export function mudarPapel(
  ator: Pessoa,
  alvo: Pessoa,
  novo: { papel: Papel; head_id: string | null },
  pessoas: Pessoa[],
): Resultado<MudancaDePapel> {
  if (ator.papel === 'administrador') {
    if (alvo.papel === 'administrador') return erro('O papel de um administrador não pode ser mudado por aqui.');
    if (novo.papel === 'administrador') return erro('Para criar outro administrador, fale com o responsável técnico.');
    let headId = novo.papel === 'gestor' ? novo.head_id : null;
    if (headId) {
      const head = pessoas.find((p) => p.id === headId);
      if (!head || head.papel !== 'head') return erro('Escolha um head válido para a equipe.');
      if (headId === alvo.id) return erro('Uma pessoa não pode ser head dela mesma.');
    }
    return { ok: true, valor: efeitos(alvo, novo.papel, headId) };
  }

  if (ator.papel === 'head') {
    // Colocar quem está aguardando como gestor da própria equipe.
    if (alvo.papel === null && novo.papel === 'gestor' && novo.head_id === ator.id) {
      return { ok: true, valor: efeitos(alvo, 'gestor', ator.id) };
    }
    // Tirar um gestor da própria equipe.
    if (alvo.papel === 'gestor' && alvo.head_id === ator.id && novo.papel === 'gestor' && novo.head_id === null) {
      return { ok: true, valor: efeitos(alvo, 'gestor', null) };
    }
    return erro('Como head, você só pode colocar pessoas como gestores da sua equipe ou tirá-las da equipe.');
  }

  return erro('Você não tem permissão para mudar papéis.');
}

function efeitos(alvo: Pessoa, papel: Papel, headId: string | null): MudancaDePapel {
  const eraHead = alvo.papel === 'head';
  const eraGestor = alvo.papel === 'gestor';
  const continuaGestor = papel === 'gestor';
  return {
    pessoa: { papel, head_id: headId },
    liberarEquipe: eraHead && papel !== 'head',
    liberarContasDoGestor: eraGestor && (!continuaGestor || (headId === null && alvo.head_id !== null)),
    moverContasParaHead: eraGestor && continuaGestor && headId !== null && headId !== alvo.head_id ? headId : null,
  };
}

// ---------------- Contas ----------------

export function atribuirConta(
  ator: Pessoa,
  conta: Conta,
  novo: { head_id?: string | null; gestor_id?: string | null },
  pessoas: Pessoa[],
): Resultado<{ head_id: string | null; gestor_id: string | null }> {
  const pessoa = (id: string | null | undefined) => (id ? pessoas.find((p) => p.id === id) : undefined);

  if (ator.papel === 'administrador') {
    const headId = novo.head_id !== undefined ? novo.head_id : conta.head_id;
    if (headId && pessoa(headId)?.papel !== 'head') return erro('Escolha um head válido.');
    let gestorId = novo.gestor_id !== undefined ? novo.gestor_id : conta.gestor_id;
    if (gestorId) {
      const g = pessoa(gestorId);
      if (g?.papel !== 'gestor') return erro('Escolha um gestor válido.');
      if (g.head_id !== headId) {
        // Mudou o head sem escolher gestor: o gestor antigo sai da conta.
        if (novo.gestor_id === undefined) gestorId = null;
        else return erro('Esse gestor não é da equipe do head escolhido.');
      }
    }
    return { ok: true, valor: { head_id: headId, gestor_id: gestorId } };
  }

  if (ator.papel === 'head') {
    if (conta.head_id !== ator.id) return erro('Essa conta não está com a sua equipe.');
    if (novo.head_id !== undefined && novo.head_id !== conta.head_id) return erro('Só o administrador muda o head de uma conta.');
    const gestorId = novo.gestor_id !== undefined ? novo.gestor_id : conta.gestor_id;
    if (gestorId) {
      const g = pessoa(gestorId);
      if (g?.papel !== 'gestor' || g.head_id !== ator.id) return erro('Esse gestor não é da sua equipe.');
    }
    return { ok: true, valor: { head_id: conta.head_id, gestor_id: gestorId } };
  }

  return erro('Você não tem permissão para distribuir contas.');
}

// ---------------- O que cada um vê ----------------

export function contasVisiveis(ator: Pessoa, contas: Conta[]): Conta[] {
  if (ator.papel === 'administrador') return contas;
  if (ator.papel === 'head') return contas.filter((c) => c.head_id === ator.id);
  if (ator.papel === 'gestor') return contas.filter((c) => c.gestor_id === ator.id);
  return [];
}

export function pessoasVisiveis(ator: Pessoa, pessoas: Pessoa[]): Pessoa[] {
  if (ator.papel === 'administrador') return pessoas;
  if (ator.papel === 'head') return pessoas.filter((p) => p.papel === null || (p.papel === 'gestor' && p.head_id === ator.id));
  return [];
}

// ---------------- Avisos ----------------

/** Quem recebe os avisos de uma conta: o gestor responsável e quem se inscreveu nela. */
export function recebeAvisos(p: Pessoa, conta: Conta, inscrito: boolean): boolean {
  if (!p.papel) return false;
  return conta.gestor_id === p.id || inscrito;
}

/** Administrador e head escolhem de quais contas receber avisos (o head, só das contas da equipe). */
export function podeInscrever(p: Pessoa, conta: Conta): boolean {
  return p.papel === 'administrador' || (p.papel === 'head' && conta.head_id === p.id);
}

/** Quem pode marcar um aviso como resolvido: quem recebe, o head da conta e o administrador. */
export function podeResolver(p: Pessoa, conta: Conta, inscrito: boolean): boolean {
  return p.papel === 'administrador' || (p.papel === 'head' && conta.head_id === p.id) || recebeAvisos(p, conta, inscrito);
}

/** Para onde cada papel vai ao abrir o app. */
export function paginaInicial(papel: Papel): string {
  if (papel === 'administrador') return '/visao-geral';
  if (papel === 'head') return '/equipe';
  if (papel === 'gestor') return '/agenda';
  return '/aguardando';
}

/** Primeiro administrador: e-mails listados em ADMIN_EMAILS viram administrador ao entrar. */
export function ehEmailDeAdministrador(email: string, lista: string | undefined): boolean {
  if (!lista) return false;
  return lista.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}
