-- Etapa 2: pessoas (papéis e equipes), contas de anúncio e configurações.
-- Modelo de acesso: o navegador nunca lê estas tabelas direto. Todo acesso passa
-- pelo servidor do app (chave service_role), que confere as permissões em
-- src/lib/permissoes.ts. Por isso RLS fica ligado e sem políticas para anon/authenticated.

-- Pessoas: uma linha por usuário que já entrou no app.
-- papel nulo = aguardando acesso. head_id só existe para gestores.
create table if not exists public.pessoas (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  email      text not null,
  papel      text check (papel in ('administrador', 'head', 'gestor')),
  head_id    uuid references public.pessoas (id) on delete set null,
  criado_em  timestamptz not null default now(),
  constraint pessoas_head_so_gestor check (head_id is null or papel = 'gestor'),
  constraint pessoas_head_nao_e_si check (head_id is null or head_id <> id)
);
create index if not exists pessoas_head_id_idx on public.pessoas (head_id);
create index if not exists pessoas_papel_idx on public.pessoas (papel);

-- Contas de anúncio do Meta e do Google Ads.
create table if not exists public.contas (
  id            uuid primary key default gen_random_uuid(),
  plataforma    text not null check (plataforma in ('meta', 'google')),
  id_externo    text not null,
  nome          text not null,
  head_id       uuid references public.pessoas (id) on delete set null,
  gestor_id     uuid references public.pessoas (id) on delete set null,
  ativa         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint contas_unica unique (plataforma, id_externo)
);
create index if not exists contas_head_id_idx on public.contas (head_id);
create index if not exists contas_gestor_id_idx on public.contas (gestor_id);

-- Configurações gerais: uma linha só (id = 1).
create table if not exists public.configuracoes (
  id                      smallint primary key default 1 check (id = 1),
  horarios                time[] not null default array['07:00', '12:00', '16:00']::time[],
  dias_min_saldo          numeric(6,2) not null default 2,
  pct_custo_alto          numeric(6,2) not null default 40,
  tolerancia_orc_meta     numeric(6,2) not null default 0,
  tolerancia_orc_google   numeric(6,2) not null default 100,
  gasto_min_custo         numeric(12,2) not null default 20,
  pct_ruim_2_semanas      numeric(6,2) not null default 40,
  gasto_min_ruim          numeric(12,2) not null default 150,
  atualizado_em           timestamptz not null default now()
);
insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

-- A conexão do Meta passa a ser da agência (feita pelo administrador).
-- A tabela meta_conexoes da etapa 1 continua valendo: guarda quem conectou e o token.

alter table public.pessoas enable row level security;
alter table public.contas enable row level security;
alter table public.configuracoes enable row level security;
revoke all on public.pessoas, public.contas, public.configuracoes from anon, authenticated;
grant select, insert, update, delete on public.pessoas, public.contas, public.configuracoes, public.meta_conexoes to service_role;
