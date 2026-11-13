-- Cadence Crews notifications. Run once after schema.sql (safe to run again).
-- Before running, replace the two placeholders below:
--   PUSH_FUNCTION_URL  your function's address, e.g. https://<project>.supabase.co/functions/v1/crews-push
--   PUSH_SECRET_VALUE  the same secret you saved as PUSH_SECRET on the function

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------- where to send each device's notifications ----------
create table if not exists public.crew_push_subs (
  endpoint text primary key,
  user_id uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.crew_push_subs enable row level security;
drop policy if exists "own push subs" on public.crew_push_subs;
create policy "own push subs" on public.crew_push_subs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- private settings the app can't read ----------
create schema if not exists crews_private;
revoke all on schema crews_private from public, anon, authenticated;
create table if not exists crews_private.config (key text primary key, value text not null);
insert into crews_private.config (key, value) values
  ('push_url', 'PUSH_FUNCTION_URL'),
  ('push_secret', 'PUSH_SECRET_VALUE')
on conflict (key) do update set value = excluded.value;

create or replace function public.crews_push_send(payload jsonb) returns void
language plpgsql security definer set search_path = public, crews_private as $$
declare u text; s text;
begin
  select value into u from crews_private.config where key = 'push_url';
  select value into s from crews_private.config where key = 'push_secret';
  if u is null or u like 'PUSH_%' then return; end if;
  perform net.http_post(url := u, body := payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s));
end $$;
revoke all on function public.crews_push_send(jsonb) from public, anon, authenticated;

-- nudges, check-ins, posts, cheers and new members each hand an event to the push function
create or replace function public.crews_push_on_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform crews_push_send(jsonb_build_object('table', tg_table_name, 'record', to_jsonb(new)));
  return new;
exception when others then
  return new;   -- a notification problem never blocks the action itself
end $$;

do $$
declare t text;
begin
  foreach t in array array['crew_nudges', 'crew_checkins', 'crew_posts', 'crew_cheers', 'crew_members'] loop
    execute format('drop trigger if exists crews_push on public.%I', t);
    execute format('create trigger crews_push after insert on public.%I for each row execute function public.crews_push_on_insert()', t);
  end loop;
end $$;

-- once a minute: daily reminders for people who set a time and haven't checked in
select cron.unschedule('crews-reminders') where exists (select 1 from cron.job where jobname = 'crews-reminders');
select cron.schedule('crews-reminders', '* * * * *', $$select public.crews_push_send('{"table":"tick"}'::jsonb)$$);
