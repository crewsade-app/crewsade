-- Cadence Crews: waitlist, visit counts and the private stats dashboard.
-- Run once in the Crews Supabase project: SQL Editor -> New query -> paste all of this -> Run.
-- Safe to run again; it keeps your data. Run schema.sql first.
--
-- Nobody can read or write these tables directly. The landing page goes through a few small functions
-- (join the waitlist, look up a waitlist crew, count visits), and only people listed in crew_admins
-- can read the numbers. To make yourself an admin, sign up in the app first, then run (with your email):
--   insert into public.crew_admins (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;

-- ---------- tables ----------
-- a crew on the waitlist: whoever signs up first starts it, friends join with its link
create table if not exists public.crew_waitlist_crews (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  name text not null default '' check (char_length(name) <= 32),
  challenge text not null default '' check (char_length(challenge) <= 60),
  created_at timestamptz not null default now()
);

create table if not exists public.crew_waitlist (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references public.crew_waitlist_crews(id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  name text not null default '' check (char_length(name) <= 24),
  leader boolean not null default false,          -- started this crew (false = joined with a friend's link)
  heard text check (char_length(heard) <= 40),    -- "how did you hear about us?"
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  utm_content text check (char_length(utm_content) <= 100),
  referrer text check (char_length(referrer) <= 200),
  created_at timestamptz not null default now()
);
create unique index if not exists crew_waitlist_email on public.crew_waitlist (lower(email));
create index if not exists crew_waitlist_crew on public.crew_waitlist (crew_id);
create index if not exists crew_waitlist_created on public.crew_waitlist (created_at);

-- one row per visit to the landing page (one per browser tab session), so sign-ups can be compared to traffic.
-- No IP addresses or device details are kept.
create table if not exists public.crew_site_visits (
  id bigint generated always as identity primary key,
  page text not null default 'join' check (char_length(page) <= 40),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  referrer text check (char_length(referrer) <= 200),
  invited boolean not null default false,          -- arrived on a friend's crew link
  created_at timestamptz not null default now()
);
create index if not exists crew_site_visits_created on public.crew_site_visits (created_at);

-- who can open the stats page
create table if not exists public.crew_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.crew_waitlist_crews enable row level security;
alter table public.crew_waitlist enable row level security;
alter table public.crew_site_visits enable row level security;
alter table public.crew_admins enable row level security;
-- no policies on purpose: these are only reached through the functions below
revoke all on public.crew_waitlist_crews, public.crew_waitlist, public.crew_site_visits, public.crew_admins from anon, authenticated;

-- ---------- helpers ----------
-- where a visit or sign-up came from: the utm_source tag, else the site that linked here, else "direct"
create or replace function public.crews_source(p_utm text, p_ref text) returns text
language sql immutable set search_path = public as $$
  select case
    when nullif(trim(p_utm), '') is not null then lower(trim(p_utm))
    when p_ref ~* '(tiktok\.com)' then 'tiktok'
    when p_ref ~* '(instagram\.com)' then 'instagram'
    when p_ref ~* '(facebook\.com|fb\.me)' then 'facebook'
    when p_ref ~* '(youtube\.com|youtu\.be)' then 'youtube'
    when p_ref ~* '(t\.co|twitter\.com|x\.com)' then 'x'
    when p_ref ~* '(reddit\.com)' then 'reddit'
    when p_ref ~* '(google\.)' then 'google'
    when nullif(trim(p_ref), '') is not null then 'other site'
    else 'direct' end;
$$;

-- admins' own emails, so their test sign-ups and activity stay out of the numbers
create or replace function public.crews_admin_emails() returns setof text
language sql stable security definer set search_path = public, auth as $$
  select lower(u.email) from public.crew_admins a join auth.users u on u.id = a.user_id where u.email is not null;
$$;

create or replace function public.crews_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from crew_admins where user_id = auth.uid());
$$;

-- ---------- landing page functions (work signed out) ----------
-- join the waitlist. With p_code you join a friend's waitlist crew, without it you start one.
create or replace function public.waitlist_join(p_email text, p_name text, p_code text default null,
  p_crew_name text default null, p_challenge text default null, p_heard text default null, p_src jsonb default '{}')
returns json language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_crew crew_waitlist_crews; v_count int; v_leader boolean := false;
  s jsonb := coalesce(p_src, '{}');
begin
  if v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or char_length(v_email) > 254 then
    raise exception 'Check your email address.'; end if;
  -- a simple brake on scripted sign-ups
  if (select count(*) from crew_waitlist where created_at > now() - interval '1 minute') >= 60 then
    raise exception 'Lots of people are signing up right now. Try again in a minute.'; end if;
  if exists (select 1 from crew_waitlist where lower(email) = v_email) then
    return json_build_object('status', 'already');
  end if;

  if nullif(trim(p_code), '') is not null then
    select * into v_crew from crew_waitlist_crews where code = lower(trim(p_code));
    if v_crew.id is not null then
      select count(*) into v_count from crew_waitlist where crew_id = v_crew.id;
      if v_count >= 8 then v_crew := null; end if;    -- full: start a new crew instead
    end if;
  end if;
  if v_crew.id is null then
    insert into crew_waitlist_crews (name, challenge)
    values (left(trim(coalesce(p_crew_name, '')), 32), left(trim(coalesce(p_challenge, '')), 60))
    returning * into v_crew;
    v_leader := true;
  end if;

  insert into crew_waitlist (crew_id, email, name, leader, heard, utm_source, utm_medium, utm_campaign, utm_content, referrer)
  values (v_crew.id, v_email, left(trim(coalesce(p_name, '')), 24), v_leader, left(nullif(trim(p_heard), ''), 40),
    left(nullif(trim(s->>'utm_source'), ''), 100), left(nullif(trim(s->>'utm_medium'), ''), 100),
    left(nullif(trim(s->>'utm_campaign'), ''), 100), left(nullif(trim(s->>'utm_content'), ''), 100),
    left(nullif(trim(s->>'referrer'), ''), 200));

  select count(*) into v_count from crew_waitlist where crew_id = v_crew.id;
  return json_build_object('status', 'ok', 'code', v_crew.code, 'crew_name', v_crew.name, 'challenge', v_crew.challenge,
    'count', v_count, 'leader', v_leader);
end $$;

-- what someone sees on a friend's waitlist link: the crew name, challenge and first names
create or replace function public.waitlist_crew(p_code text) returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('name', c.name, 'challenge', c.challenge,
    'count', (select count(*) from crew_waitlist w where w.crew_id = c.id),
    'members', (select coalesce(json_agg(nullif(split_part(w.name, ' ', 1), '') order by w.created_at), '[]'::json)
                from crew_waitlist w where w.crew_id = c.id))
  from crew_waitlist_crews c where c.code = lower(trim(p_code));
$$;

-- the public counter on the landing page
create or replace function public.waitlist_total() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'people', (select count(*) from crew_waitlist w where lower(w.email) not in (select public.crews_admin_emails())),
    'crews', (select count(distinct crew_id) from crew_waitlist w where lower(w.email) not in (select public.crews_admin_emails())),
    'full_crews', (select count(*) from (select crew_id from crew_waitlist w where lower(w.email) not in (select public.crews_admin_emails())
                   group by crew_id having count(*) >= 3) f));
$$;

-- count a visit to the landing page
create or replace function public.site_visit(p_page text default 'join', p_src jsonb default '{}', p_invited boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare s jsonb := coalesce(p_src, '{}');
begin
  if (select count(*) from crew_site_visits where created_at > now() - interval '1 minute') >= 600 then return; end if;
  insert into crew_site_visits (page, utm_source, utm_medium, utm_campaign, referrer, invited)
  values (left(coalesce(nullif(trim(p_page), ''), 'join'), 40), left(nullif(trim(s->>'utm_source'), ''), 100),
    left(nullif(trim(s->>'utm_medium'), ''), 100), left(nullif(trim(s->>'utm_campaign'), ''), 100),
    left(nullif(trim(s->>'referrer'), ''), 200), coalesce(p_invited, false));
end $$;

-- ---------- admin functions (stats page) ----------
-- everything the stats page shows, counted by day in p_tz (your time zone)
create or replace function public.crews_admin_stats(p_days int default 30, p_tz text default 'UTC') returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz text := coalesce(nullif(p_tz, ''), 'UTC');
  v_days int := least(greatest(coalesce(p_days, 30), 7), 365);
  v_today date; v_from date; r json;
begin
  if not public.crews_is_admin() then raise exception 'Not allowed.'; end if;
  begin v_today := (now() at time zone v_tz)::date; exception when others then v_tz := 'UTC'; v_today := (now() at time zone 'UTC')::date; end;
  v_from := v_today - (v_days - 1);

  with
  days as (select generate_series(v_from, v_today, interval '1 day')::date as day),
  -- your own data is left out: admins' waitlist sign-ups, accounts, check-ins and the crews they started
  adm as (select user_id from crew_admins),
  wl as (select w.*, (w.created_at at time zone v_tz)::date as day, public.crews_source(w.utm_source, w.referrer) as src
         from crew_waitlist w where lower(w.email) not in (select public.crews_admin_emails())),
  wcrew as (select c.id, c.created_at, (c.created_at at time zone v_tz)::date as day, count(w.id) as size,
              max(case when w.leader then w.src end) as src
            from crew_waitlist_crews c join wl w on w.crew_id = c.id group by c.id),
  -- visits on a friend's crew link are counted apart; the crew they join already carries its source
  vis as (select v.*, (v.created_at at time zone v_tz)::date as day,
            case when v.invited then 'friend link' else public.crews_source(v.utm_source, v.referrer) end as src
          from crew_site_visits v),
  prof as (select p.id, p.created_at, (p.created_at at time zone v_tz)::date as day from crew_profiles p
           where p.id not in (select user_id from adm)),
  cr as (select c.*, (c.created_at at time zone v_tz)::date as cday, (now() at time zone c.tz)::date as local_today,
           c.start_date + c.len - 1 as last_day,
           (select count(*) from crew_members m where m.crew_id = c.id) as members
         from crews c where c.owner is null or c.owner not in (select user_id from adm)),
  ci as (select k.*, (k.created_at at time zone v_tz)::date as cday from crew_checkins k
         where k.user_id not in (select user_id from adm))
  select json_build_object(
    'generated_at', now(), 'tz', v_tz, 'from', v_from, 'to', v_today,

    'waitlist', json_build_object(
      'people', (select count(*) from wl),
      'crews', (select count(*) from wcrew),
      'full_crews', (select count(*) from wcrew where size >= 3),
      'invited', (select count(*) from wl where not leader),
      'avg_size', (select round(avg(size)::numeric, 2) from wcrew),
      'people_today', (select count(*) from wl where day = v_today),
      'people_7d', (select count(*) from wl where day > v_today - 7),
      'visits', (select count(*) from vis),
      'visits_7d', (select count(*) from vis where day > v_today - 7),
      'sizes', (select coalesce(json_agg(json_build_object('size', sz, 'crews', n) order by sz), '[]'::json)
                from (select least(size, 6) as sz, count(*) as n from wcrew group by 1) q)),

    'waitlist_daily', (select json_agg(json_build_object('day', d.day,
        'people', (select count(*) from wl where wl.day = d.day),
        'invited', (select count(*) from wl where wl.day = d.day and not wl.leader),
        'crews', (select count(*) from wcrew where wcrew.day = d.day),
        'visits', (select count(*) from vis where vis.day = d.day)) order by d.day) from days d),

    -- each crew counts toward the source its starter came from, friends included
    'sources', (select coalesce(json_agg(q order by q.people desc, q.visits desc), '[]'::json) from (
        select s.src as source,
          (select count(*) from vis where vis.src = s.src) as visits,
          (select count(*) from wcrew where wcrew.src = s.src) as crews_started,
          (select coalesce(sum(size), 0) from wcrew where wcrew.src = s.src) as people,
          (select count(*) from wcrew where wcrew.src = s.src and wcrew.size >= 3) as full_crews,
          (select count(*) from wcrew where wcrew.src = s.src and wcrew.day > v_today - 7) as crews_7d
        from (select src from vis union select src from wcrew) s) q),

    'campaigns', (select coalesce(json_agg(q order by q.people desc), '[]'::json) from (
        select src as source, coalesce(utm_campaign, '') as campaign, coalesce(utm_content, '') as content, count(*) as people
        from wl where utm_campaign is not null or utm_content is not null group by 1, 2, 3 order by 4 desc limit 25) q),

    'heard', (select coalesce(json_agg(q order by q.people desc), '[]'::json) from (
        select coalesce(heard, 'Not answered') as answer, count(*) as people from wl group by 1) q),

    'app', json_build_object(
      'users', (select count(*) from prof),
      'users_7d', (select count(*) from prof where day > v_today - 7),
      'crews', (select count(*) from cr),
      'crews_7d', (select count(*) from cr where cday > v_today - 7),
      'crews_with_friends', (select count(*) from cr where members >= 2),
      'active_crews_7d', (select count(distinct crew_id) from ci where cday > v_today - 7),
      'active_users_7d', (select count(distinct user_id) from ci where cday > v_today - 7),
      'checkins_7d', (select count(*) from ci where cday > v_today - 7),
      'checkins', (select count(*) from ci),
      -- crews old enough to judge (made over a day ago) that got a friend in within 24 hours
      'friend_24h_base', (select count(*) from cr where created_at < now() - interval '1 day'),
      'friend_24h', (select count(*) from cr where created_at < now() - interval '1 day' and exists (
          select 1 from crew_members m where m.crew_id = cr.id and m.user_id is distinct from cr.owner
            and m.joined_at <= cr.created_at + interval '1 day')),
      'running', (select count(*) from cr where local_today between start_date and last_day),
      'finished', (select count(*) from cr where local_today > last_day),
      -- finished, with at least one check-in on the last day
      'finished_strong', (select count(*) from cr where local_today > last_day
          and exists (select 1 from crew_checkins k where k.crew_id = cr.id and k.day = cr.last_day)),
      -- finished, then started again: a later crew with the same name and at least two of the same people
      'finished_again', (select count(*) from cr where local_today > last_day and exists (
          select 1 from crews c2 where c2.name = cr.name and c2.created_at > cr.created_at and (
            select count(*) from crew_members a join crew_members b on a.user_id = b.user_id
            where a.crew_id = cr.id and b.crew_id = c2.id) >= 2))),

    'app_daily', (select json_agg(json_build_object('day', d.day,
        'signups', (select count(*) from prof where prof.day = d.day),
        'crews', (select count(*) from cr where cr.cday = d.day),
        'checkins', (select count(*) from ci where ci.cday = d.day),
        'active_users', (select count(distinct user_id) from ci where ci.cday = d.day)) order by d.day) from days d),

    -- of people who signed up at least N days ago, how many checked in N days after signing up
    'retention', (select json_agg(json_build_object('day', n,
        'base', (select count(*) from prof where prof.day <= v_today - n),
        'kept', (select count(*) from prof where prof.day <= v_today - n and exists (
            select 1 from ci where ci.user_id = prof.id and ci.cday = prof.day + n)))
        order by n) from unnest(array[1, 7, 30]) n)
  ) into r;
  return r;
end $$;

-- every waitlist sign-up, for exporting to email the list
create or replace function public.crews_admin_waitlist() returns table (
  email text, name text, crew_code text, crew_name text, challenge text, crew_size bigint, leader boolean,
  source text, utm_campaign text, utm_content text, heard text, signed_up timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.crews_is_admin() then raise exception 'Not allowed.'; end if;
  return query
    select w.email, w.name, c.code, c.name, c.challenge, (select count(*) from crew_waitlist x where x.crew_id = c.id),
      w.leader, public.crews_source(w.utm_source, w.referrer), w.utm_campaign, w.utm_content, w.heard, w.created_at
    from crew_waitlist w join crew_waitlist_crews c on c.id = w.crew_id
    where lower(w.email) not in (select public.crews_admin_emails())
    order by c.created_at, w.created_at;
end $$;

-- ---------- who can call what ----------
revoke all on function public.waitlist_join(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.waitlist_crew(text) from public, anon, authenticated;
revoke all on function public.waitlist_total() from public, anon, authenticated;
revoke all on function public.site_visit(text, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.crews_is_admin() from public, anon, authenticated;
revoke all on function public.crews_admin_emails() from public, anon, authenticated;
revoke all on function public.crews_admin_stats(int, text) from public, anon, authenticated;
revoke all on function public.crews_admin_waitlist() from public, anon, authenticated;
grant execute on function public.waitlist_join(text, text, text, text, text, text, jsonb), public.waitlist_crew(text),
  public.waitlist_total(), public.site_visit(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.crews_is_admin(), public.crews_admin_stats(int, text), public.crews_admin_waitlist() to authenticated;
