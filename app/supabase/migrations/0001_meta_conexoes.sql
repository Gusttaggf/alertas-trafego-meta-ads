-- Conexão de cada usuário com o Meta (token de ~60 dias obtido no login com o Facebook).
-- RLS ligado e sem políticas: nem o navegador nem a chave anon leem o token.
-- Só o servidor do app (chave service_role) acessa esta tabela.
create table if not exists public.meta_conexoes (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  fb_user_id    text not null,
  fb_nome       text,
  token         text not null,
  expira_em     timestamptz,
  atualizado_em timestamptz not null default now()
);

alter table public.meta_conexoes enable row level security;
revoke all on public.meta_conexoes from anon, authenticated;
