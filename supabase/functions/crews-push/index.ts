// Cadence Crews push function. The database calls it when someone nudges,
// checks in, posts, cheers or joins, and once a minute for daily reminders.
// Secrets it needs: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SECRET (same value
// as in notifications.sql) and APP_URL (where the app is hosted).
// Deploy with "Verify JWT" turned off; the secret header guards it instead.
//
// Kinds of notification (each person can switch any of them off in the app):
//   checkins   someone in your crew checked in
//   full       everyone's in, the chain grew
//   milestones chain milestones, a full week, personal streaks, finishing a challenge
//   nudges     nudges, "you're the last link", daily reminders
//   posts      new posts and cheers
//   members    someone joined your crew
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP_URL = Deno.env.get('APP_URL') || 'https://example.com/';
webpush.setVapidDetails(APP_URL, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

type Kind = 'checkins' | 'full' | 'milestones' | 'nudges' | 'posts' | 'members';
type Note = { title: string; body: string; tag?: string; crew?: string };

async function sendTo(userId: string, kind: Kind, note: Note) {
  const { data: prof } = await sb.from('crew_profiles').select('notif_prefs').eq('id', userId).maybeSingle();
  if (prof?.notif_prefs && prof.notif_prefs[kind] === false) return;
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

// ---------- dates ----------
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
const idx = (day: string) => Math.round(Date.parse(day + 'T00:00:00Z') / 864e5);

// ---------- the chain (same rules as the app) ----------
type Member = { user_id: string; join: number };
function chainOf(crew: any, members: Member[], done: Set<string>, t: number) {
  const start = idx(crew.start_date), last = start + crew.len - 1;
  const has = (d: number, u: string) => done.has(d + ':' + u);
  const on = (d: number) => members.filter(m => m.join <= d);
  const full = (d: number) => { const ms = on(d); return ms.length > 0 && ms.every(m => has(d, m.user_id)); };
  let chain = 0, saves = members.length;
  if (crew.mode === 'daily') {
    for (let d = start; d < t && d <= last; d++) {
      const miss = on(d).filter(m => !has(d, m.user_id)).length;
      if (!miss) chain++; else if (miss <= saves) { saves -= miss; chain++; } else chain = 0;
    }
  } else {
    for (let w = start; w <= Math.min(t, last); w += 7) {
      const we = Math.min(w + 6, last);
      if (we < t) {
        const ok = on(we).every(m => { const from = Math.max(w, m.join), need = Math.max(1, we - from + 1 - 2);
          let k = 0; for (let d = from; d <= we; d++) if (has(d, m.user_id)) k++; return k >= need; });
        chain = ok ? chain + (we - w + 1) : 0;
      } else chain += t - w;
    }
  }
  if (t <= last && full(t)) chain++;
  return { chain, last, start };
}
function personalStreak(u: string, done: Set<string>, t: number, start: number) {
  let n = 0; for (let d = t; d >= start && done.has(d + ':' + u); d--) n++; return n;
}
const CHAIN_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 60, 75, 90, 100, 150, 200, 250, 300, 365]);
const STREAK_MILESTONES = new Set([3, 7, 14, 21, 30, 50, 100, 200, 365]);

async function crewState(crewId: string) {
  const { data: crew } = await sb.from('crews').select('*').eq('id', crewId).maybeSingle();
  if (!crew) return null;
  const today = localNow(crew.tz).day, t = idx(today);
  const { data: mem } = await sb.from('crew_members').select('user_id,joined_day').eq('crew_id', crewId);
  const { data: ins } = await sb.from('crew_checkins').select('user_id,day').eq('crew_id', crewId);
  const members: Member[] = (mem || []).map(m => ({ user_id: m.user_id, join: idx(m.joined_day) }));
  const done = new Set((ins || []).map(r => idx(r.day) + ':' + r.user_id));
  const inToday = members.filter(m => done.has(t + ':' + m.user_id)).map(m => m.user_id);
  const waiting = members.filter(m => !done.has(t + ':' + m.user_id)).map(m => m.user_id);
  return { crew, t, members, done, inToday, waiting, ids: members.map(m => m.user_id) };
}

async function onCheckin(r: Record<string, any>) {
  const st = await crewState(r.crew_id); if (!st) return;
  const { crew, t, done, ids, inToday, waiting } = st;
  const name = crew.name as string, crewId = r.crew_id as string;
  const who = await firstName(r.user_id);
  const { chain, last, start } = chainOf(crew, st.members, done, t);

  // personal streak, just for the person who checked in
  const streak = personalStreak(r.user_id, done, t, start);
  if (STREAK_MILESTONES.has(streak))
    await sendTo(r.user_id, 'milestones', { title: `${streak}-day streak`, body: `${name}: ${streak} days in a row. Keep it going.`, tag: 'streak-' + crewId, crew: crewId });

  if (ids.length < 2) return;
  if (!waiting.length) {
    // everyone's in: one message for everybody, upgraded when it's a milestone or the finish
    let note: Note;
    if (t === last) note = { title: `You finished ${name}`, body: `${crew.len} days together, ${chain}-day chain at the end. Run it back?`, tag: 'done-' + crewId, crew: crewId };
    else if (CHAIN_MILESTONES.has(chain) || (chain >= 7 && chain % 7 === 0))
      note = { title: chain % 7 === 0 ? `${chain / 7 === 1 ? 'A full week' : chain / 7 + ' full weeks'} together` : `${chain}-day chain`,
        body: `${name}: everyone showed up ${chain} days straight.`, tag: 'mile-' + crewId, crew: crewId };
    else note = { title: "Everyone's in", body: `${name}: the chain grew to ${chain}.`, tag: 'full-' + crewId, crew: crewId };
    const kind: Kind = note.tag!.startsWith('full') ? 'full' : 'milestones';
    for (const id of ids) await sendTo(id, kind, note);
    return;
  }
  // someone checked in: tell the rest of the crew
  for (const id of ids) {
    if (id === r.user_id || await blocked(id, r.user_id)) continue;
    const mineDone = inToday.includes(id);
    await sendTo(id, 'checkins', { title: `${who} checked in`,
      body: `${name}: ${inToday.length}/${ids.length} in${mineDone ? '' : '. Your turn.'}`, tag: 'in-' + crewId, crew: crewId });
  }
  if (waiting.length === 1)
    await sendTo(waiting[0], 'nudges', { title: "You're the last link", body: `${name}: check in to grow the chain.`, tag: 'last-' + crewId, crew: crewId });
}

async function onEvent(table: string, r: Record<string, any>) {
  if (table === 'crew_checkins') return onCheckin(r);
  if (table === 'crew_nudges') {
    const st = await crewState(r.crew_id); if (!st) return;
    const who = await firstName(r.sender);
    for (const id of st.waiting) {
      if (id === r.sender || await blocked(id, r.sender)) continue;
      await sendTo(id, 'nudges', { title: `${who} nudged the crew`, body: `${st.crew.name}: your link is still open today.`, tag: 'nudge-' + r.crew_id, crew: r.crew_id });
    }
    return;
  }
  if (table === 'crew_posts') {
    const { data: crew } = await sb.from('crews').select('name').eq('id', r.crew_id).maybeSingle();
    const { data: members } = await sb.from('crew_members').select('user_id').eq('crew_id', r.crew_id);
    const who = await firstName(r.user_id);
    for (const m of members || []) {
      if (m.user_id === r.user_id || await blocked(m.user_id, r.user_id)) continue;
      await sendTo(m.user_id, 'posts', { title: `${who} posted in ${crew?.name || 'your crew'}`,
        body: r.body ? String(r.body).slice(0, 120) : 'Shared a photo.', tag: 'post-' + r.id, crew: r.crew_id });
    }
    return;
  }
  if (table === 'crew_cheers') {
    const { data: p } = await sb.from('crew_posts').select('user_id,crew_id').eq('id', r.post_id).maybeSingle();
    if (!p || p.user_id === r.user_id || await blocked(p.user_id, r.user_id)) return;
    return sendTo(p.user_id, 'posts', { title: `${await firstName(r.user_id)} cheered your check-in`, body: 'Keep the chain going.', tag: 'cheer-' + r.post_id, crew: p.crew_id });
  }
  if (table === 'crew_members') {
    const { data: crew } = await sb.from('crews').select('name').eq('id', r.crew_id).maybeSingle();
    const { data: members } = await sb.from('crew_members').select('user_id').eq('crew_id', r.crew_id);
    const who = await firstName(r.user_id);
    for (const m of members || []) {
      if (m.user_id === r.user_id) continue;
      await sendTo(m.user_id, 'members', { title: `${who} joined ${crew?.name || 'your crew'}`, body: 'Your crew just got stronger.', tag: 'join-' + r.crew_id, crew: r.crew_id });
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
      const today = localNow(c.tz).day, t = idx(today), start = idx(c.start_date);
      if (t < start || t > start + c.len - 1) continue;
      const { data: done } = await sb.from('crew_checkins').select('day').eq('crew_id', m.crew_id).eq('user_id', p.id).eq('day', today).limit(1);
      if (!done || !done.length) { open.push(c.name); one = m.crew_id; }
    }
    if (!open.length) continue;
    await sendTo(p.id, 'nudges', { title: 'Your crew is waiting', body: open.length === 1 ? `${open[0]}: check in today.` : `${open.length} crews need your link today.`,
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
