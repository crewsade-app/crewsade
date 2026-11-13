// Cadence Crews push function. The database calls it when someone nudges,
// checks in, posts, cheers or joins, and once a minute for daily reminders.
// Secrets it needs: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET (same value
// as in notifications.sql) and APP_URL (where the app is hosted).
// Deploy with "Verify JWT" turned off; the secret header guards it instead.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP_URL = Deno.env.get('APP_URL') || 'https://example.com/';
webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

type Note = { title: string; body: string; tag?: string; crew?: string };

async function sendTo(userId: string, note: Note) {
  const { data: subs } = await sb.from('crew_push_subs').select('*').eq('user_id', userId);
  const url = note.crew ? `${APP_URL}?c=${note.crew}` : APP_URL;
  for (const s of subs || []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: note.title, body: note.body, tag: note.tag, url }), { TTL: 3600 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await sb.from('crew_push_subs').delete().eq('endpoint', s.endpoint);
    }
  }
}

async function firstName(id: string) {
  const { data } = await sb.from('crew_profiles').select('name').eq('id', id).maybeSingle();
  return ((data?.name || 'Someone') as string).split(/\s+/)[0];
}
async function blocked(a: string, b: string) {
  const { data } = await sb.from('crew_blocks').select('blocker')
    .or(`and(blocker.eq.${a},blocked.eq.${b}),and(blocker.eq.${b},blocked.eq.${a})`).limit(1);
  return !!(data && data.length);
}

// the date and time somewhere, e.g. { hm: '08:30', day: '2026-11-10' }
function localNow(tz: string): { hm: string; day: string } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
  } catch { return localNow('UTC'); }
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return { hm: `${get('hour')}:${get('minute')}`, day: `${get('year')}-${get('month')}-${get('day')}` };
}
const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const addDays = (day: string, n: number) => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

async function crewState(crewId: string) {
  const { data: crew } = await sb.from('crews').select('*').eq('id', crewId).maybeSingle();
  if (!crew) return null;
  const today = localNow(crew.tz).day;
  const { data: members } = await sb.from('crew_members').select('user_id').eq('crew_id', crewId);
  const { data: ins } = await sb.from('crew_checkins').select('user_id').eq('crew_id', crewId).eq('day', today);
  const done = new Set((ins || []).map(r => r.user_id));
  const ids = (members || []).map(m => m.user_id);
  return { crew, today, ids, done, waiting: ids.filter(id => !done.has(id)) };
}

async function onEvent(table: string, r: Record<string, any>) {
  if (table === 'crew_nudges') {
    const st = await crewState(r.crew_id); if (!st) return;
    const who = await firstName(r.sender);
    for (const id of st.waiting) {
      if (id === r.sender || await blocked(id, r.sender)) continue;
      await sendTo(id, { title: `${who} nudged the crew`, body: `${st.crew.name}: your link is still open today.`, tag: 'nudge-' + r.crew_id, crew: r.crew_id });
    }
    return;
  }
  if (table === 'crew_checkins') {
    const st = await crewState(r.crew_id); if (!st || st.ids.length < 2) return;
    if (!st.waiting.length) {
      for (const id of st.ids) await sendTo(id, { title: "Everyone's in", body: `${st.crew.name}: the chain grew today.`, tag: 'full-' + r.crew_id, crew: r.crew_id });
    } else if (st.waiting.length === 1) {
      await sendTo(st.waiting[0], { title: "You're the last link", body: `${st.crew.name}: check in to grow the chain.`, tag: 'last-' + r.crew_id, crew: r.crew_id });
    }
    return;
  }
  if (table === 'crew_posts') {
    const { data: crew } = await sb.from('crews').select('name').eq('id', r.crew_id).maybeSingle();
    const { data: members } = await sb.from('crew_members').select('user_id').eq('crew_id', r.crew_id);
    const who = await firstName(r.user_id);
    for (const m of members || []) {
      if (m.user_id === r.user_id || await blocked(m.user_id, r.user_id)) continue;
      await sendTo(m.user_id, { title: `${who} posted in ${crew?.name || 'your crew'}`,
        body: r.body ? String(r.body).slice(0, 120) : 'Shared a photo.', tag: 'post-' + r.id, crew: r.crew_id });
    }
    return;
  }
  if (table === 'crew_cheers') {
    const { data: p } = await sb.from('crew_posts').select('user_id,crew_id').eq('id', r.post_id).maybeSingle();
    if (!p || p.user_id === r.user_id || await blocked(p.user_id, r.user_id)) return;
    return sendTo(p.user_id, { title: `${await firstName(r.user_id)} cheered your check-in`, body: 'Keep the chain going.', tag: 'cheer-' + r.post_id, crew: p.crew_id });
  }
  if (table === 'crew_members') {
    const { data: crew } = await sb.from('crews').select('name').eq('id', r.crew_id).maybeSingle();
    const { data: members } = await sb.from('crew_members').select('user_id').eq('crew_id', r.crew_id);
    const who = await firstName(r.user_id);
    for (const m of members || []) {
      if (m.user_id === r.user_id) continue;
      await sendTo(m.user_id, { title: `${who} joined ${crew?.name || 'your crew'}`, body: 'Your crew just got stronger.', tag: 'join-' + r.crew_id, crew: r.crew_id });
    }
  }
}

async function sendReminders() {
  const { data: people } = await sb.from('crew_profiles').select('id,remind_at,tz,last_reminded').not('remind_at', 'is', null);
  for (const p of people || []) {
    const now = localNow(p.tz || 'UTC');
    const late = mins(now.hm) - mins(p.remind_at);
    if (late < 0 || late >= 10 || p.last_reminded === now.day) continue;
    await sb.from('crew_profiles').update({ last_reminded: now.day }).eq('id', p.id);
    const { data: mine } = await sb.from('crew_members').select('crew_id, crews(name,tz,start_date,len)').eq('user_id', p.id);
    const open: string[] = []; let one = '';
    for (const m of mine || []) {
      const c = (m as any).crews; if (!c) continue;
      const today = localNow(c.tz).day;
      if (today < c.start_date || today > addDays(c.start_date, c.len - 1)) continue;
      const { data: done } = await sb.from('crew_checkins').select('day').eq('crew_id', m.crew_id).eq('user_id', p.id).eq('day', today).limit(1);
      if (!done || !done.length) { open.push(c.name); one = m.crew_id; }
    }
    if (!open.length) continue;
    await sendTo(p.id, { title: 'Your crew is waiting', body: open.length === 1 ? `${open[0]}: check in today.` : `${open.length} crews need your link today.`,
      tag: 'remind', crew: open.length === 1 ? one : undefined });
  }
}

Deno.serve(async req => {
  if (req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SECRET')) return new Response('no', { status: 401 });
  try {
    const { table, record } = await req.json();
    if (table === 'tick') await sendReminders();
    else await onEvent(table, record || {});
    return new Response('ok');
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
