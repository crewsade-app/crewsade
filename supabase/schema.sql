-- Cadence Crews database.
-- Run once in your Supabase project: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again; it only creates or updates what it needs.
-- Every table has row-level security: people only ever see crews they are in.
-- Table names all start with crew_ (or are "crews"), so this never touches the original Cadence tables.

create extension if not exists pgcrypto;

-- ---------- profiles ----------
create table if not exists public.crew_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 24),
  remind_at text check (remind_at is null or remind_at ~ '^[0-2][0-9]:[0-5][0-9]$'),
  tz text not null default 'UTC',
  last_reminded date,
  created_at timestamptz not null default now()
);

-- a profile row is created automatically when someone signs up
create or replace function public.crews_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.crew_profiles (id, name)
  values (new.id, coalesce(left(new.raw_user_meta_data->>'name', 24), ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists crews_on_auth_user_created on auth.users;
create trigger crews_on_auth_user_created after insert on auth.users
  for each row execute function public.crews_handle_new_user();

-- ---------- crews ----------
create table if not exists public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 32),
  rule text not null default '' check (char_length(rule) <= 40),
  len int not null check (len in (7, 14, 21, 30)),
  mode text not null default 'daily' check (mode in ('daily', 'weekly')),
  proof boolean not null default false,
  tz text not null default 'UTC',                 -- the crew's day starts at midnight here
  start_date date not null,
  code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  owner uuid references public.crew_profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.crew_members (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.crew_profiles(id) on delete cascade,
  color text not null default '#C9C4FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  joined_day date not null,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index if not exists crew_members_user on public.crew_members (user_id);

create table if not exists public.crew_checkins (
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  day date not null,
  created_at timestamptz not null default now(),
  primary key (crew_id, user_id, day)
);

create table if not exists public.crew_posts (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crews(id) on delete cascade,
  user_id uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  day date not null,
  body text not null default '' check (char_length(body) <= 200),
  photo text,                                       -- path in the crew-photos bucket
  created_at timestamptz not null default now(),
  check (body <> '' or photo is not null)
);
create index if not exists crew_posts_crew on public.crew_posts (crew_id, created_at desc);

create table if not exists public.crew_cheers (
  post_id uuid not null references public.crew_posts(id) on delete cascade,
  user_id uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.crew_nudges (
  crew_id uuid not null references public.crews(id) on delete cascade,
  sender uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  day date not null,
  created_at timestamptz not null default now(),
  primary key (crew_id, sender, day)
);

create table if not exists public.crew_blocks (
  blocker uuid not null references public.crew_profiles(id) on delete cascade default auth.uid(),
  blocked uuid not null references public.crew_profiles(id) on delete cascade,
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

create table if not exists public.crew_reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references public.crew_profiles(id) on delete set null default auth.uid(),
  reported_user uuid references public.crew_profiles(id) on delete set null,
  post_id uuid references public.crew_posts(id) on delete set null,
  reason text not null default '' check (char_length(reason) <= 200),
  post_body text,                                   -- a copy, so the report survives if the post is deleted
  post_photo text,
  created_at timestamptz not null default now()
);

-- ---------- helpers ----------
create or replace function public.crew_today(p_crew uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone c.tz)::date from crews c where c.id = p_crew;
$$;

create or replace function public.is_crew_member(p_crew uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from crew_members m where m.crew_id = p_crew and m.user_id = auth.uid());
$$;

-- same check for storage paths like "<crew id>/<file>.jpg"; a bad path is simply "no"
create or replace function public.is_crew_member_text(p_crew text) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  return public.is_crew_member(p_crew::uuid);
exception when others then
  return false;
end $$;

create or replace function public.shares_crew(p_other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_other = auth.uid() or exists (
    select 1 from crew_members a join crew_members b on a.crew_id = b.crew_id
    where a.user_id = auth.uid() and b.user_id = p_other);
$$;

create or replace function public.crew_is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from crew_blocks k where (k.blocker = a and k.blocked = b) or (k.blocker = b and k.blocked = a));
$$;

-- a crew is open for check-ins from its start day until its last day
create or replace function public.crew_open_today(p_crew uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from crews c where c.id = p_crew
    and (now() at time zone c.tz)::date between c.start_date and c.start_date + c.len - 1);
$$;

-- ---------- row-level security ----------
alter table public.crew_profiles enable row level security;
alter table public.crews enable row level security;
alter table public.crew_members enable row level security;
alter table public.crew_checkins enable row level security;
alter table public.crew_posts enable row level security;
alter table public.crew_cheers enable row level security;
alter table public.crew_nudges enable row level security;
alter table public.crew_blocks enable row level security;
alter table public.crew_reports enable row level security;

drop policy if exists "see crewmates" on public.crew_profiles;
create policy "see crewmates" on public.crew_profiles for select to authenticated using (public.shares_crew(id));
drop policy if exists "create own profile" on public.crew_profiles;
create policy "create own profile" on public.crew_profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "edit own profile" on public.crew_profiles;
create policy "edit own profile" on public.crew_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "see my crews" on public.crews;
create policy "see my crews" on public.crews for select to authenticated using (public.is_crew_member(id));
drop policy if exists "owner deletes crew" on public.crews;
create policy "owner deletes crew" on public.crews for delete to authenticated using (owner = auth.uid());

drop policy if exists "see crew members" on public.crew_members;
create policy "see crew members" on public.crew_members for select to authenticated using (public.is_crew_member(crew_id));
drop policy if exists "leave a crew" on public.crew_members;
create policy "leave a crew" on public.crew_members for delete to authenticated using (user_id = auth.uid());
drop policy if exists "change my color" on public.crew_members;
create policy "change my color" on public.crew_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "see crew checkins" on public.crew_checkins;
create policy "see crew checkins" on public.crew_checkins for select to authenticated using (public.is_crew_member(crew_id));
drop policy if exists "check in today" on public.crew_checkins;
create policy "check in today" on public.crew_checkins for insert to authenticated with check (
  user_id = auth.uid() and public.is_crew_member(crew_id)
  and day = public.crew_today(crew_id) and public.crew_open_today(crew_id));

drop policy if exists "see crew posts" on public.crew_posts;
create policy "see crew posts" on public.crew_posts for select to authenticated
  using (public.is_crew_member(crew_id) and not public.crew_is_blocked(auth.uid(), user_id));
drop policy if exists "post today" on public.crew_posts;
create policy "post today" on public.crew_posts for insert to authenticated with check (
  user_id = auth.uid() and public.is_crew_member(crew_id) and day = public.crew_today(crew_id)
  and (photo is null or photo like crew_id::text || '/%'));
drop policy if exists "delete own post" on public.crew_posts;
create policy "delete own post" on public.crew_posts for delete to authenticated using (user_id = auth.uid());

drop policy if exists "see cheers" on public.crew_cheers;
create policy "see cheers" on public.crew_cheers for select to authenticated
  using (exists (select 1 from crew_posts p where p.id = post_id and public.is_crew_member(p.crew_id)));
drop policy if exists "cheer" on public.crew_cheers;
create policy "cheer" on public.crew_cheers for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from crew_posts p where p.id = post_id and public.is_crew_member(p.crew_id)));
drop policy if exists "uncheer" on public.crew_cheers;
create policy "uncheer" on public.crew_cheers for delete to authenticated using (user_id = auth.uid());

drop policy if exists "see nudges" on public.crew_nudges;
create policy "see nudges" on public.crew_nudges for select to authenticated using (public.is_crew_member(crew_id));
drop policy if exists "nudge once a day" on public.crew_nudges;
create policy "nudge once a day" on public.crew_nudges for insert to authenticated with check (
  sender = auth.uid() and public.is_crew_member(crew_id) and day = public.crew_today(crew_id));

drop policy if exists "own blocks" on public.crew_blocks;
create policy "own blocks" on public.crew_blocks for all to authenticated
  using (blocker = auth.uid()) with check (blocker = auth.uid());

-- reports can be filed but not read back from the app; read them in the Supabase table editor
drop policy if exists "file a report" on public.crew_reports;
create policy "file a report" on public.crew_reports for insert to authenticated with check (reporter = auth.uid());

-- ---------- actions ----------
-- start a crew; you are its first member
create or replace function public.create_crew(p_name text, p_rule text, p_len int, p_mode text, p_proof boolean, p_tz text, p_color text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_tz text := coalesce(nullif(p_tz, ''), 'UTC'); v_day date;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  begin v_day := (now() at time zone v_tz)::date; exception when others then v_tz := 'UTC'; v_day := (now() at time zone 'UTC')::date; end;
  insert into crews (name, rule, len, mode, proof, tz, start_date, owner)
  values (left(trim(p_name), 32), left(trim(coalesce(p_rule, '')), 40), p_len, p_mode, coalesce(p_proof, false), v_tz, v_day, auth.uid())
  returning id into v_id;
  insert into crew_members (crew_id, user_id, color, joined_day) values (v_id, auth.uid(), coalesce(p_color, '#C9C4FF'), v_day);
  return v_id;
end $$;

-- what someone sees on an invite link before joining (works signed out too)
create or replace function public.crew_preview(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'name', c.name, 'rule', c.rule, 'len', c.len, 'mode', c.mode, 'proof', c.proof,
    'day', ((now() at time zone c.tz)::date - c.start_date) + 1,
    'finished', (now() at time zone c.tz)::date > c.start_date + c.len - 1,
    'count', (select count(*) from crew_members m where m.crew_id = c.id),
    'members', (select coalesce(json_agg(json_build_object('name', split_part(p.name, ' ', 1), 'color', m.color) order by m.joined_at), '[]'::json)
                from crew_members m join crew_profiles p on p.id = m.user_id where m.crew_id = c.id))
  from crews c where c.code = lower(trim(p_code));
$$;

create or replace function public.join_crew(p_code text, p_color text) returns uuid
language plpgsql security definer set search_path = public as $$
declare c crews; v_count int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into c from crews where code = lower(trim(p_code));
  if c.id is null then raise exception 'That invite link does not work anymore.'; end if;
  if exists (select 1 from crew_members where crew_id = c.id and user_id = auth.uid()) then return c.id; end if;
  if (now() at time zone c.tz)::date > c.start_date + c.len - 1 then raise exception 'This challenge already finished.'; end if;
  select count(*) into v_count from crew_members where crew_id = c.id;
  if v_count >= 8 then raise exception 'This crew is full (8 people).'; end if;
  insert into crew_members (crew_id, user_id, color, joined_day)
  values (c.id, auth.uid(), coalesce(p_color, '#C9C4FF'), greatest(c.start_date, (now() at time zone c.tz)::date));
  return c.id;
end $$;

-- start the same challenge again with the same people
create or replace function public.rerun_crew(p_old uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare c crews; v_id uuid; v_day date;
begin
  if not public.is_crew_member(p_old) then raise exception 'not in that crew'; end if;
  select * into c from crews where id = p_old;
  v_day := (now() at time zone c.tz)::date;
  insert into crews (name, rule, len, mode, proof, tz, start_date, owner)
  values (c.name, c.rule, c.len, c.mode, c.proof, c.tz, v_day, auth.uid()) returning id into v_id;
  insert into crew_members (crew_id, user_id, color, joined_day)
    select v_id, m.user_id, m.color, v_day from crew_members m where m.crew_id = p_old;
  return v_id;
end $$;

-- delete your account and everything you posted (photos are removed by the app first)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.create_crew(text, text, int, text, boolean, text, text) from public, anon;
revoke all on function public.join_crew(text, text) from public, anon;
revoke all on function public.rerun_crew(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.create_crew(text, text, int, text, boolean, text, text), public.join_crew(text, text),
  public.rerun_crew(uuid), public.delete_my_account() to authenticated;
grant execute on function public.crew_preview(text) to anon, authenticated;

-- ---------- photos ----------
insert into storage.buckets (id, name, public) values ('crew-photos', 'crew-photos', false)
on conflict (id) do nothing;

drop policy if exists "crew photos: members read" on storage.objects;
create policy "crew photos: members read" on storage.objects for select to authenticated
  using (bucket_id = 'crew-photos' and public.is_crew_member_text((storage.foldername(name))[1]));
drop policy if exists "crew photos: members upload" on storage.objects;
create policy "crew photos: members upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'crew-photos' and public.is_crew_member_text((storage.foldername(name))[1]));
drop policy if exists "crew photos: delete own" on storage.objects;
create policy "crew photos: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'crew-photos' and owner = auth.uid());

-- ---------- live updates ----------
-- lets each phone see check-ins, posts and cheers the moment they happen
do $$
declare t text;
begin
  foreach t in array array['crew_checkins', 'crew_posts', 'crew_cheers', 'crew_members', 'crew_nudges'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null;   -- already added
    end;
  end loop;
end $$;
