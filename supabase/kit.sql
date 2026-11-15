-- Crewsade waitlist -> Kit. Run once after waitlist.sql (safe to run again).
-- Every new waitlist sign-up is added to Kit with a tag, their first name and
-- their crew's code and name. A Kit automation on that tag sends the welcome email.
--
-- Before running, replace the two placeholders below:
--   KIT_API_KEY_VALUE  Kit → Settings → Developer: the v3 "API Key" (not the API Secret)
--   KIT_TAG_ID_VALUE   the number at the end of your "waitlist" tag's address in Kit
--                      (Subscribers → click the tag → the URL ends in /tags/1234567)
-- Until both are filled in, nothing is sent and sign-ups work as before.
--
-- In Kit, also create two custom fields first, named exactly crew_code and crew_name,
-- or Kit drops those values.

create extension if not exists pg_net;

create schema if not exists crews_private;
revoke all on schema crews_private from public, anon, authenticated;
create table if not exists crews_private.config (key text primary key, value text not null);
insert into crews_private.config (key, value) values
  ('kit_api_key', 'KIT_API_KEY_VALUE'),
  ('kit_tag_id', 'KIT_TAG_ID_VALUE')
on conflict (key) do update set value = excluded.value;

create or replace function public.crew_waitlist_to_kit() returns trigger
language plpgsql security definer set search_path = public, crews_private as $$
declare k text; t text; c record;
begin
  select value into k from crews_private.config where key = 'kit_api_key';
  select value into t from crews_private.config where key = 'kit_tag_id';
  if k is null or t is null or k like 'KIT_%' or t like 'KIT_%' then return new; end if;
  select code, name into c from crew_waitlist_crews where id = new.crew_id;
  perform net.http_post(
    url := 'https://api.convertkit.com/v3/tags/' || t || '/subscribe',
    body := jsonb_strip_nulls(jsonb_build_object(
      'api_key', k,
      'email', new.email,
      'first_name', nullif(split_part(trim(new.name), ' ', 1), ''),
      'fields', jsonb_strip_nulls(jsonb_build_object(
        'crew_code', c.code,
        'crew_name', nullif(trim(c.name), '')
      ))
    )),
    headers := jsonb_build_object('Content-Type', 'application/json'));
  return new;
exception when others then
  return new;   -- an email problem never blocks the sign-up itself
end $$;
revoke all on function public.crew_waitlist_to_kit() from public, anon, authenticated;

drop trigger if exists crew_waitlist_kit on public.crew_waitlist;
create trigger crew_waitlist_kit after insert on public.crew_waitlist
  for each row execute function public.crew_waitlist_to_kit();

-- Check recent calls to Kit (status 200 = added):
--   select id, status_code, content::text from net._http_response order by id desc limit 5;
-- Turn it off:  drop trigger if exists crew_waitlist_kit on public.crew_waitlist;
