-- Etapa 5: notificações no celular (Web Push do app instalado).
-- Mesmo modelo: RLS ligado e sem políticas; só o servidor (service_role) lê e grava.

-- Cada aparelho em que a pessoa ativou as notificações.
create table if not exists public.push_inscricoes (
  id            uuid primary key default gen_random_uuid(),
  pessoa_id     uuid not null references public.pessoas (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  aparelho      text,
  criado_em     timestamptz not null default now(),
  ultimo_envio  timestamptz
);
create index if not exists push_inscricoes_pessoa_id_idx on public.push_inscricoes (pessoa_id);

-- Quando o aviso já foi notificado (para não notificar de novo).
alter table public.avisos add column if not exists notificado_em timestamptz;
create index if not exists avisos_a_notificar_idx on public.avisos (visivel_em) where notificado_em is null and resolvido_em is null;

-- Chaves VAPID das notificações: o app cria sozinho na primeira vez.
alter table public.configuracoes
  add column if not exists vapid_publica text,
  add column if not exists vapid_privada text;

alter table public.push_inscricoes enable row level security;
revoke all on public.push_inscricoes from anon, authenticated;
grant select, insert, update, delete on public.push_inscricoes to service_role;
