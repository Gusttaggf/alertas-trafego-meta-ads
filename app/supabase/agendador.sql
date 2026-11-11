-- Agendador: chama a verificação do app de hora em hora (gratuito, roda dentro do Supabase).
-- NÃO é uma migração: rode no SQL Editor DEPOIS de trocar os dois valores abaixo.
--   1. O endereço do app (ex.: https://gestor-estrategista.vercel.app)
--   2. O CRON_SECRET (o mesmo valor cadastrado na Vercel). Não faça commit deste arquivo preenchido.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Se já existir, apaga para recriar com os valores novos.
select cron.unschedule('gestor-verificar') where exists (select 1 from cron.job where jobname = 'gestor-verificar');

select cron.schedule(
  'gestor-verificar',
  '0 * * * *',  -- todo começo de hora
  $$
  select net.http_post(
    url := 'https://gestor-estrategista.vercel.app/api/verificar',
    headers := jsonb_build_object('Authorization', 'Bearer COLE_AQUI_O_CRON_SECRET'),
    timeout_milliseconds := 60000
  );
  $$
);

-- Para conferir depois:
--   select jobname, schedule, active from cron.job;
--   select status_code, content, created from net._http_response order by created desc limit 5;
