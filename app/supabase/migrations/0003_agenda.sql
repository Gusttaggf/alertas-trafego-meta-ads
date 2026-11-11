-- Etapa 3: agenda de avisos.
-- Mesmo modelo de acesso das outras tabelas: RLS ligado e sem políticas; só o servidor (service_role) lê e grava.

-- Contas que o administrador ou o head escolheram acompanhar (recebem os avisos delas).
create table if not exists public.inscricoes (
  pessoa_id  uuid not null references public.pessoas (id) on delete cascade,
  conta_id   uuid not null references public.contas (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (pessoa_id, conta_id)
);
create index if not exists inscricoes_conta_id_idx on public.inscricoes (conta_id);

-- Avisos. Um por problema por dia (conta + dia + chave). O que é encontrado entre os horários
-- só aparece no próximo horário (visivel_em). Resolvido não volta no mesmo dia.
create table if not exists public.avisos (
  id             uuid primary key default gen_random_uuid(),
  conta_id       uuid not null references public.contas (id) on delete cascade,
  tipo           text not null check (tipo in ('saldo', 'custo', 'orcamento', 'ruim')),
  chave          text not null,
  dia            date not null,
  horario        time not null,
  visivel_em     timestamptz not null,
  titulo         text not null,
  detalhe        text not null,
  dados          jsonb not null default '{}'::jsonb,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  resolvido_em   timestamptz,
  resolvido_por  uuid references public.pessoas (id) on delete set null,
  constraint avisos_um_por_dia unique (conta_id, dia, chave)
);
create index if not exists avisos_dia_idx on public.avisos (dia);
create index if not exists avisos_pendentes_idx on public.avisos (conta_id, dia) where resolvido_em is null;
create index if not exists avisos_resolvido_por_idx on public.avisos (resolvido_por);

-- Situação de cada conta na última verificação (para o painel e para saber quando rodar o "ruim há 2 semanas").
alter table public.contas
  add column if not exists ultima_verificacao  timestamptz,
  add column if not exists ultimo_erro         text,
  add column if not exists saldo               numeric(14,2),
  add column if not exists gasto_hoje          numeric(14,2),
  add column if not exists gasto_medio_7d      numeric(14,2),
  add column if not exists ruim_verificado_em  date;

-- Erro da conexão do Meta (ex.: token expirado), para avisar o administrador.
alter table public.meta_conexoes
  add column if not exists ultimo_erro text,
  add column if not exists erro_em     timestamptz;

alter table public.inscricoes enable row level security;
alter table public.avisos enable row level security;
revoke all on public.inscricoes, public.avisos from anon, authenticated;
grant select, insert, update, delete on public.inscricoes, public.avisos to service_role;
