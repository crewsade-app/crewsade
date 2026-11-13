/* Cadence Crews: group habit challenges where the whole crew grows one chain.
   Data lives in Supabase when config.js is filled in; otherwise the app runs in demo mode on this device. */
(function(){
'use strict';

const CFG = window.CREWS_CONFIG || {};
const DEMO = !CFG.supabaseUrl || !CFG.supabaseKey;
const BASE = location.origin + location.pathname.replace(/index\.html$/, '');
const app = document.getElementById('app');

/* ---------- small helpers ---------- */
const I = {
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  bars:'<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  rings:'<rect x="1.5" y="8" width="13" height="8" rx="4" transform="rotate(-40 8 12)"/><rect x="9.5" y="8" width="13" height="8" rx="4" transform="rotate(-40 16 12)"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  cam:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  zap:'<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
  redo:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  dots:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  flagr:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  down:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  palette:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="16" cy="10" r="1.3"/><path d="M12 21a3 3 0 0 1 0-6h2"/>'
};
const ic = (n, s) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"${s?` style="${s}"`:''}>${I[n]}</svg>`;
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase() || '?';
const first = n => (n||'Someone').trim().split(/\s+/)[0];
const COLORS = ['#FFB38A','#9FD3C7','#C9C4FF','#FFD66B','#F7A8C4','#B7DDF5','#C8E6A0','#FFC9A8'];
const MAX = 8;
const TEMPLATES = [
  {name:'No-Phone Mornings', rule:'No phone until 9', len:30},
  {name:'Read 20 Pages', rule:'20 pages a day', len:21},
  {name:'10k Steps', rule:'10,000 steps', len:14},
  {name:'6 AM Club', rule:'Up by 6', len:7},
  {name:'Gym', rule:'Work out', len:30},
  {name:'', rule:'', len:14, custom:true}
];
/* each crew picks one of these; it colors that crew's chain, buttons and recap. hi = on dark, lo = on light */
const CREW_COLORS = [
  {name:'Magenta', hi:'#FF4FA3', lo:'#B0105C'},
  {name:'Violet', hi:'#9B87FF', lo:'#5B3FD6'},
  {name:'Teal', hi:'#2CD4D9', lo:'#0B7A80'},
  {name:'Lime', hi:'#A3E635', lo:'#4D7C0F'},
  {name:'Blue', hi:'#5AA9FF', lo:'#1D5FBF'},
  {name:'Amber', hi:'#FFC53D', lo:'#A15C00'}
];
const crewColor = c => CREW_COLORS.find(x => x.hi.toLowerCase() === String((c && c.color) || '').toLowerCase()) || CREW_COLORS[0];
const ccVars = c => { const k = crewColor(c); return `--c-hi:${k.hi};--c-lo:${k.lo};`; };
const LENGTHS = [7, 14, 21, 30, 60, 90];
const isMilestone = n => [3, 50, 75, 100, 150, 200, 250, 300, 365].includes(n) || (n >= 7 && n % 7 === 0);
const milestoneTitle = n => n % 7 === 0 && n >= 7 ? (n === 7 ? 'A full week together' : `${n / 7} full weeks together`) : `${n}-day chain`;
const NOTIF_KINDS = [['checkins','When someone checks in'], ['full',"When everyone's in"], ['milestones','Milestones, full weeks and streaks'],
  ['nudges','Nudges and reminders'], ['posts','Posts and cheers'], ['members','Someone joins your crew']];
const ls = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k, v); return true; } catch(e){ return false; } },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

/* ---------- days ----------
   Each crew's day starts at midnight in the crew's time zone (set when it was created).
   Days are whole numbers (days since 1970) so the chain math stays simple. */
const DAY = 864e5;
const MY_TZ = (()=>{ try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch(e){ return 'UTC'; } })();
const idxOf = s => Math.round(Date.parse(s + 'T00:00:00Z') / DAY);
const dateOf = i => new Date(i * DAY).toISOString().slice(0, 10);
function tzIdx(tz){
  try {
    const p = new Intl.DateTimeFormat('en-US', {timeZone: tz || 'UTC', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date());
    const g = t => p.find(x => x.type === t).value;
    return idxOf(`${g('year')}-${g('month')}-${g('day')}`);
  } catch(e){ return idxOf(new Date().toISOString().slice(0, 10)); }
}

/* ---------- state ---------- */
const S = {me:null, crews:[], habits:[], blocked:new Set(), names:{}, loaded:false};
const U = {screen:'loading', crew:null, sheet:null, draft:null, compose:{photo:null, blob:null, note:''}, toast:null, busy:false,
  auth:'up', authErr:'', authMsg:'', invite:null, preview:null, confirm:null, recapOnly:null, hkind:'build', celebrate:null};
const demo = {offset:0};
const today = c => tzIdx(c.tz) + (DEMO ? demo.offset : 0);
const hToday = () => tzIdx(MY_TZ) + (DEMO ? demo.offset : 0);

/* ---------- private habits ----------
   build: tick it off each day; the streak counts days in a row.
   break: nothing to tick; it counts days clean since you started or last slipped. */
function habitStreak(h){ const t = hToday(); let d = h.marks.has(t) ? t : t - 1, n = 0; while (h.marks.has(d)){ n++; d--; } return n; }
function habitStats(h){
  const t = hToday(), start = h.startDay, total = t - start + 1, win = Math.min(30, total);
  const inWin = d => d > t - win && d <= t;
  if (h.kind === 'build'){
    let best = 0, run = 0, done = 0, recent = 0;
    for (let d = start; d <= t; d++){ if (h.marks.has(d)){ run++; done++; best = Math.max(best, run); if (inWin(d)) recent++; } else if (d < t) run = 0; }
    return {current:habitStreak(h), best, done, rate:Math.round(recent / win * 100), win, total};
  }
  let best = 0, run = 0, slips = 0, recentSlips = 0;
  for (let d = start; d <= t; d++){ if (h.marks.has(d)){ slips++; run = 0; if (inWin(d)) recentSlips++; } else { run++; best = Math.max(best, run); } }
  return {current:daysClean(h), best, slips, rate:Math.round((win - recentSlips) / win * 100), win, total};
}
function habitCells(h, n){
  const t = hToday(); let out = '';
  for (let d = t - n + 1; d <= t; d++){
    const pre = d < h.startDay, m = h.marks.has(d);
    const bg = pre ? 'transparent' : h.kind === 'build' ? (m ? 'var(--ink)' : 'var(--line)') : (m ? '#E5484D' : 'var(--ink)');
    out += `<span title="${dateOf(d)}" style="aspect-ratio:1;border-radius:5px;background:${bg};${pre?'border:1.5px dashed var(--line)':''}${d===t?';outline:2px solid var(--chain);outline-offset:1px':''}"></span>`;
  }
  return out;
}
function daysClean(h){ const t = hToday(); if (h.marks.has(t)) return 0; let last = h.startDay - 1; h.marks.forEach(d => { if (d <= t && d > last) last = d; }); return t - last; }

/* ---------- chain logic ---------- */
const crewById = id => S.crews.find(c => c.id === id);
const me = c => c.members.find(m => m.you);
const isDone = (c, d, id) => !!(c.log[d] && c.log[d][id]);
const membersOn = (c, d) => c.members.filter(m => m.joinDay <= d);
const fullDay = (c, d) => { const ms = membersOn(c, d); return ms.length > 0 && ms.every(m => isDone(c, d, m.id)); };
const dayNum = c => Math.min(today(c), lastDay(c)) - c.startDay + 1;
const lastDay = c => c.startDay + c.len - 1;
const finished = c => today(c) > lastDay(c);
const doneToday = c => c.members.filter(m => isDone(c, today(c), m.id)).length;
const pending = () => S.crews.filter(c => !finished(c) && me(c) && !isDone(c, today(c), me(c).id));

function chainInfo(c){
  const t = today(c), st = {}; let chain = 0, best = 0, saves = c.members.length;
  if (c.mode === 'daily'){
    for (let d = c.startDay; d < t && d <= lastDay(c); d++){
      const miss = membersOn(c, d).filter(m => !isDone(c, d, m.id)).length;
      if (!miss){ chain++; st[d] = 'full'; }
      else if (miss <= saves){ saves -= miss; chain++; st[d] = 'saved'; }
      else { chain = 0; st[d] = 'paused'; }
      best = Math.max(best, chain);
    }
  } else {
    for (let w = c.startDay; w <= Math.min(t, lastDay(c)); w += 7){
      const we = Math.min(w + 6, lastDay(c));
      if (we < t){
        const ok = membersOn(c, we).every(m => {
          const from = Math.max(w, m.joinDay), need = Math.max(1, (we - from + 1) - 2);
          let k = 0; for (let d = from; d <= we; d++) if (isDone(c, d, m.id)) k++;
          return k >= need;
        });
        for (let d = w; d <= we; d++){ if (ok){ chain++; st[d] = fullDay(c, d) ? 'full' : 'saved'; } else st[d] = 'paused'; }
        if (!ok) chain = 0;
        best = Math.max(best, chain);
      } else {
        for (let d = w; d < t; d++){ chain++; st[d] = fullDay(c, d) ? 'full' : 'saved'; }
        best = Math.max(best, chain);
      }
    }
  }
  let todayFull = false;
  if (!finished(c) && fullDay(c, t)){ chain++; todayFull = true; st[t] = 'full'; best = Math.max(best, chain); }
  return {chain, best, saves, st, todayFull};
}
function weekNeed(c, mid){
  const t = today(c), w = c.startDay + Math.floor((t - c.startDay) / 7) * 7, we = Math.min(w + 6, lastDay(c));
  let k = 0; for (let d = w; d <= Math.min(t, we); d++) if (isDone(c, d, mid)) k++;
  return {done:k, need:Math.max(1, (we - w + 1) - 2)};
}
function pstreak(c, mid){ const t = today(c); let n = 0, d = t; if (isDone(c, d, mid)) n++; d--; while (d >= c.startDay && isDone(c, d, mid)){ n++; d--; } return n; }
function firstToday(c){ const l = c.log[today(c)]; if (!l) return null; let b = null, v = Infinity; Object.keys(l).forEach(k => { if (l[k] < v){ v = l[k]; b = k; } }); return b; }
function ruleLabel(c, info){ return c.mode === 'daily' ? `${info.saves} save${info.saves===1?'':'s'} left` : '5 of 7 days'; }
function whenLabel(c, d){ const n = today(c) - d; return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n + ' days ago'; }
function chainStates(c, info){
  const out = [], t = today(c), end = Math.min(t, lastDay(c));
  for (let d = c.startDay; d <= end; d++) out.push(info.st[d] || (d === t && !finished(c) ? 't' : 'paused'));
  return out;
}

/* ---------- drawing the chain ---------- */
let SEEN = {};
/* Each link animates only when it is new or its state changed since this screen last drew it.
   First view of a screen: links cascade in one by one. Later: only the new day's link animates. */
function chainSVG(states, o){
  o = Object.assign({w:314, W:30, H:18, step:22, sw:4.5, gap:12, on:'var(--chain)', off:'var(--chain-off)', wait:'var(--wait)', label:'', key:null, sway:true}, o||{});
  const n = states.length; if (!n) return '';
  let per = Math.max(1, Math.floor((o.w - o.W - o.sw)/o.step) + 1); if (per>2 && per%2===0) per--;
  const rows = Math.ceil(n/per), rowH = o.H + o.gap, pad = o.sw/2 + 6;
  const vw = (Math.min(n,per)-1)*o.step + o.W + o.sw + 12, vh = rows*rowH - o.gap + o.sw + 12;
  const prev = o.key ? SEEN[o.key] : null, cascade = !prev;
  let back='', front='', fx='', order=0;
  states.forEach((s,i)=>{
    const r = Math.floor(i/per), k = i%per;
    const x = k*o.step + pad, y = r*rowH + pad, cx = x+o.W/2, cy = y+o.H/2;
    const changed = cascade || prev[i] !== s;
    let col = o.on, op = 1, extra = '', tr = '';
    if (s==='saved') op = .45;
    else if (s==='paused'){ col = o.off; tr = ` transform="rotate(${k%2?14:-14} ${cx} ${cy}) translate(0 ${k%2?3:-3})"`; }
    else if (s==='t'){ col = o.wait; extra = ` stroke-dasharray="${o.sw} ${o.sw*.9}" style="--p:-${(o.sw*1.9*4).toFixed(1)}px"`; }
    let anim = '', delay = 0;
    if (changed){ anim = {full:'a-forge', saved:'a-fade', paused:'a-snap', t:'a-fade'}[s]; delay = cascade ? i*55 : 150 + (order++)*140; }
    const swayOn = o.sway && (s==='full'||s==='saved');
    const shape = k%2===0
      ? `<rect x="${x}" y="${y}" width="${o.W}" height="${o.H}" rx="${o.H/2}" fill="none" stroke="${col}" stroke-width="${o.sw}" opacity="${op}"${extra}${tr}/>`
      : (()=>{ const bh = o.sw*1.5; return s==='t'
          ? `<rect x="${x}" y="${cy-bh/2}" width="${o.W}" height="${bh}" rx="${bh/2}" fill="none" stroke="${col}" stroke-width="${Math.max(1.5,o.sw/2.5)}"${tr}/>`
          : `<rect x="${x}" y="${cy-bh/2}" width="${o.W}" height="${bh}" rx="${bh/2}" fill="${col}" opacity="${op}"${tr}/>`; })();
    const g = `<g class="lk ${anim} ${s==='t'?'ghost':''}" style="animation-delay:${delay}ms"><g class="${swayOn?'sw':''}" style="animation-delay:-${(i*0.18).toFixed(2)}s">${shape}</g></g>`;
    if (k%2===0) back += g; else front += g;
    if (changed && !cascade && s==='full'){
      const d = delay + 250;
      fx += `<rect class="ring" x="${x}" y="${y}" width="${o.W}" height="${o.H}" rx="${o.H/2}" fill="none" stroke="${o.on}" stroke-width="${o.sw/1.5}" style="animation-delay:${d}ms"/>`;
      for (let j=0;j<8;j++){ const a = j/8*Math.PI*2, dist = o.W*.9; fx += `<circle class="spk" cx="${cx}" cy="${cy}" r="${Math.max(1.2,o.sw/2.2)}" fill="${o.on}" style="--dx:${(Math.cos(a)*dist).toFixed(1)}px;--dy:${(Math.sin(a)*dist*.7).toFixed(1)}px;animation-delay:${d}ms"/>`; }
    }
  });
  if (o.key) SEEN[o.key] = states.slice();
  return `<svg class="chainv" viewBox="0 0 ${vw} ${vh}" style="max-width:${vw}px" role="img" aria-label="${esc(o.label||'Chain progress')}">${back}${front}${fx}</svg>`;
}

/* ---------- photos ---------- */
function readImage(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, 1080 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      const dataUrl = cv.toDataURL('image/jpeg', .8);
      cv.toBlob(blob => blob ? res({dataUrl, blob}) : rej(new Error('photo')), 'image/jpeg', .8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('photo')); };
    img.src = url;
  });
}

/* =====================================================================
   BACKENDS
   Both expose the same calls. Supabase is the real one; demo keeps a copy on this device.
   ===================================================================== */
function demoBackend(){
  const KEY = 'crews.demo.v1';
  let D = null;
  const blank = () => ({me:{id:'me', name:'', prefs:{}}, crews:[], habits:[], offset:0, blocked:[]});
  function loadD(){ try { D = JSON.parse(ls.get(KEY)) || blank(); } catch(e){ D = blank(); } demo.offset = D.offset || 0; }
  function saveD(){ D.offset = demo.offset; if (!ls.set(KEY, JSON.stringify(D))) throw new Error('This device is out of space. Try a smaller photo.'); }
  const find = id => D.crews.find(c => c.id === id);
  return {
    async start(){ loadD(); return D.me.name ? {user:{id:'me'}} : null; },
    async signUp(name){ D.me.name = name.trim().slice(0, 24); saveD(); return 'in'; },
    async signIn(){ return 'in'; }, async resetPassword(){}, async updatePassword(){},
    async signOut(){},
    async load(){
      loadD();
      S.me = {id:'me', name:D.me.name, remind_at:D.me.remind_at || null, prefs:D.me.prefs || {}};
      S.habits = (D.habits || []).map(h => ({...h, marks:new Set(h.marks)}));
      S.blocked = new Set(D.blocked);
      S.crews = JSON.parse(JSON.stringify(D.crews)).map(c => { c.members.forEach(m => { m.you = m.id === 'me'; if (m.you) m.name = D.me.name; }); return c; });
    },
    async createCrew(d){
      const t = tzIdx(MY_TZ) + demo.offset, id = uid();
      D.crews.unshift({id, name:d.name, rule:d.rule, len:d.len, mode:d.mode, proof:d.proof, color:d.color || null, tz:MY_TZ, code:id.slice(0, 8), owner:'me', startDay:t,
        members:[{id:'me', name:D.me.name, color:COLORS[0], joinDay:t}], log:{}, feed:[], nudges:{}});
      saveD(); return id;
    },
    async preview(){ return null; },
    async join(){ throw new Error('Invite links work once the app is connected to Supabase.'); },
    async checkIn(c, mid){ const x = find(c.id), d = today(c); x.log[d] = x.log[d] || {}; x.log[d][mid || 'me'] = Date.now(); saveD(); },
    async uncheck(c, mid){ const x = find(c.id), d = today(c); if (x.log[d]) delete x.log[d][mid]; saveD(); },
    async post(c, k){ const x = find(c.id); x.feed.unshift({id:uid(), who:'me', day:today(c), text:k.note, photo:k.photo, cheers:[]}); saveD(); },
    async deletePost(c, p){ const x = find(c.id); x.feed = x.feed.filter(f => f.id !== p.id); saveD(); },
    async cheer(c, p, on){ const f = find(c.id).feed.find(x => x.id === p.id); f.cheers = on ? f.cheers.concat('me') : f.cheers.filter(x => x !== 'me'); saveD(); },
    async nudge(c){ const x = find(c.id); x.nudges[today(c)] = ['me']; saveD(); },
    async leave(c){ D.crews = D.crews.filter(x => x.id !== c.id); saveD(); },
    async deleteCrew(c){ D.crews = D.crews.filter(x => x.id !== c.id); saveD(); },
    async rerun(c){
      const o = find(c.id), t = tzIdx(o.tz) + demo.offset, id = uid();
      D.crews.unshift({...JSON.parse(JSON.stringify(o)), id, code:id.slice(0, 8), startDay:t, log:{}, feed:[], nudges:{},
        members:o.members.map(m => ({...m, joinDay:t}))});
      saveD(); return id;
    },
    async setName(n){ D.me.name = n; saveD(); },
    async setPrefs(p){ D.me.prefs = p; saveD(); },
    async setColor(c, color){ find(c.id).color = color; saveD(); },
    async addHabit(name, kind){ D.habits = D.habits || []; D.habits.push({id:uid(), name, kind, startDay:hToday(), marks:[]}); saveD(); },
    async markHabit(h, on){ const x = D.habits.find(y => y.id === h.id), t = hToday(); x.marks = x.marks.filter(d => d !== t); if (on) x.marks.push(t); saveD(); },
    async deleteHabit(h){ D.habits = D.habits.filter(y => y.id !== h.id); saveD(); },
    async setReminder(hm){ D.me.remind_at = hm; saveD(); },
    async report(){}, async block(id){ D.blocked.push(id); saveD(); }, async unblock(id){ D.blocked = D.blocked.filter(x => x !== id); saveD(); },
    async deleteAccount(){ ls.del(KEY); loadD(); },
    async pushOn(){ throw new Error('Notifications work once the app is connected to Supabase.'); }, async pushOff(){},
    live(){},
    /* demo only */
    async addFriend(c, name){ const x = find(c.id); if (x.members.length >= MAX) throw new Error('Crews max out at 8.');
      x.members.push({id:'f' + uid().slice(0, 8), name:name.slice(0, 24), color:COLORS[x.members.length % COLORS.length], joinDay:today(c)}); saveD(); },
    async skipDay(){ demo.offset++; saveD(); },
    async erase(){ ls.del(KEY); loadD(); }
  };
}

function supabaseBackend(){
  let sb = null, session = null, channel = null;
  const urls = {};          // photo path -> {url, at}
  const myId = () => session && session.user.id;
  const fail = r => { if (r.error) throw r.error; return r.data; };
  async function all(build){        // reads past the server's 1000-row page size
    let from = 0, out = [];
    for (;;){ const r = await build().range(from, from + 999); const rows = fail(r) || []; out = out.concat(rows); if (rows.length < 1000) return out; from += 1000; }
  }
  return {
    async start(){
      if (!window.supabase || !window.supabase.createClient) throw new Error('offline');
      sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {auth:{persistSession:true, storageKey:'crews.auth', autoRefreshToken:true, detectSessionInUrl:true}});
      const {data} = await sb.auth.getSession(); session = data.session;
      sb.auth.onAuthStateChange((ev, s) => {
        session = s;
        if (ev === 'PASSWORD_RECOVERY'){ U.screen = 'newpw'; render(); }
      });
      return session;
    },
    async signUp(name, email, pw){
      const r = await sb.auth.signUp({email, password:pw, options:{data:{name:name.trim().slice(0, 24)}, emailRedirectTo:BASE}});
      fail(r); session = r.data.session; return session ? 'in' : 'confirm';
    },
    async signIn(email, pw){ const r = await sb.auth.signInWithPassword({email, password:pw}); fail(r); session = r.data.session; return 'in'; },
    async resetPassword(email){ fail(await sb.auth.resetPasswordForEmail(email, {redirectTo:BASE})); },
    async updatePassword(pw){ fail(await sb.auth.updateUser({password:pw})); },
    async signOut(){ try { if (channel) sb.removeChannel(channel); channel = null; await sb.auth.signOut(); } catch(e){} session = null; },
    async load(){
      const id = myId();
      let prof = fail(await sb.from('crew_profiles').select('*').eq('id', id).maybeSingle());
      if (!prof){
        const name = ((session.user.user_metadata || {}).name || '').slice(0, 24);
        fail(await sb.from('crew_profiles').insert({id, name, tz:MY_TZ}));
        prof = {id, name, tz:MY_TZ, remind_at:null};
      } else if (prof.tz !== MY_TZ){ sb.from('crew_profiles').update({tz:MY_TZ}).eq('id', id).then(()=>{}); }
      const [crews, mem, blk, habits] = await Promise.all([
        all(() => sb.from('crews').select('*').order('created_at', {ascending:false})),
        all(() => sb.from('crew_members').select('crew_id,user_id,color,joined_day,joined_at,crew_profiles(name)').order('joined_at')),
        all(() => sb.from('crew_blocks').select('blocked')),
        all(() => sb.from('crew_habits').select('*').eq('user_id', id).order('created_at'))
      ]);
      const ids = crews.map(c => c.id);
      let ins = [], posts = [], nudges = [], cheers = [];
      if (ids.length){
        [ins, posts, nudges] = await Promise.all([
          all(() => sb.from('crew_checkins').select('crew_id,user_id,day,created_at').in('crew_id', ids)),
          fail(await sb.from('crew_posts').select('*').in('crew_id', ids).order('created_at', {ascending:false}).limit(300)),
          all(() => sb.from('crew_nudges').select('crew_id,sender,day').in('crew_id', ids))
        ]);
        const pids = posts.map(p => p.id);
        if (pids.length) cheers = await all(() => sb.from('crew_cheers').select('post_id,user_id').in('post_id', pids));
        const need = posts.filter(p => p.photo && (!urls[p.photo] || Date.now() - urls[p.photo].at > 45 * 60e3)).map(p => p.photo);
        if (need.length){
          const r = await sb.storage.from('crew-photos').createSignedUrls(need, 3600);
          (r.data || []).forEach(x => { if (x.signedUrl) urls[x.path] = {url:x.signedUrl, at:Date.now()}; });
        }
      }
      const byId = {};
      S.me = {id, name:prof.name, remind_at:prof.remind_at, prefs:prof.notif_prefs || {}};
      S.habits = habits.map(h => ({id:h.id, name:h.name, kind:h.kind, startDay:idxOf(h.start_day), marks:new Set((h.marks || []).map(idxOf))}));
      S.blocked = new Set(blk.map(b => b.blocked));
      S.crews = crews.map(c => (byId[c.id] = {id:c.id, name:c.name, rule:c.rule, len:c.len, mode:c.mode, proof:c.proof, color:c.color, tz:c.tz, code:c.code, owner:c.owner,
        startDay:idxOf(c.start_date), members:[], log:{}, feed:[], nudges:{}}));
      mem.forEach(m => { const c = byId[m.crew_id]; if (!c) return;
        const name = m.user_id === id ? prof.name : ((m.crew_profiles && m.crew_profiles.name) || 'Someone');
        S.names[m.user_id] = name;
        c.members.push({id:m.user_id, name, color:m.color, you:m.user_id === id, joinDay:idxOf(m.joined_day)}); });
      ins.forEach(r => { const c = byId[r.crew_id]; if (!c) return; const d = idxOf(r.day); (c.log[d] = c.log[d] || {})[r.user_id] = Date.parse(r.created_at); });
      const pmap = {};
      posts.forEach(p => { const c = byId[p.crew_id]; if (!c || S.blocked.has(p.user_id)) return;
        const f = {id:p.id, who:p.user_id, day:idxOf(p.day), text:p.body, path:p.photo, photo:p.photo && urls[p.photo] ? urls[p.photo].url : null, cheers:[]};
        pmap[p.id] = f; c.feed.push(f); });
      cheers.forEach(x => { if (pmap[x.post_id]) pmap[x.post_id].cheers.push(x.user_id); });
      nudges.forEach(n => { const c = byId[n.crew_id]; if (!c) return; const d = idxOf(n.day); (c.nudges[d] = c.nudges[d] || []).push(n.sender); });
    },
    async createCrew(d){
      return fail(await sb.rpc('create_crew', {p_name:d.name, p_rule:d.rule, p_len:d.len, p_mode:d.mode, p_proof:d.proof, p_tz:MY_TZ, p_color:COLORS[Math.floor(Math.random() * COLORS.length)], p_cover:d.color || null}));
    },
    async preview(code){ const r = await sb.rpc('crew_preview', {p_code:code}); return r.error ? null : r.data; },
    async join(code, taken){
      const free = COLORS.filter(x => !(taken || []).includes(x));
      return fail(await sb.rpc('join_crew', {p_code:code, p_color:(free.length ? free : COLORS)[Math.floor(Math.random() * (free.length || COLORS.length))]}));
    },
    async checkIn(c){
      const r = await sb.from('crew_checkins').insert({crew_id:c.id, user_id:myId(), day:dateOf(today(c))});
      if (r.error && r.error.code !== '23505') throw r.error;
    },
    async post(c, k){
      let path = null;
      if (k.blob){
        path = `${c.id}/${uid()}.jpg`;
        fail(await sb.storage.from('crew-photos').upload(path, k.blob, {contentType:'image/jpeg', upsert:false}));
        urls[path] = {url:k.photo, at:Date.now()};
      }
      const r = await sb.from('crew_posts').insert({crew_id:c.id, user_id:myId(), day:dateOf(today(c)), body:k.note || '', photo:path});
      if (r.error){ if (path) sb.storage.from('crew-photos').remove([path]); throw r.error; }
    },
    async deletePost(c, p){ fail(await sb.from('crew_posts').delete().eq('id', p.id)); if (p.path) await sb.storage.from('crew-photos').remove([p.path]); },
    async cheer(c, p, on){
      if (on){ const r = await sb.from('crew_cheers').insert({post_id:p.id, user_id:myId()}); if (r.error && r.error.code !== '23505') throw r.error; }
      else fail(await sb.from('crew_cheers').delete().eq('post_id', p.id).eq('user_id', myId()));
    },
    async nudge(c){ const r = await sb.from('crew_nudges').insert({crew_id:c.id, sender:myId(), day:dateOf(today(c))}); if (r.error && r.error.code !== '23505') throw r.error; },
    async leave(c){ fail(await sb.from('crew_members').delete().eq('crew_id', c.id).eq('user_id', myId())); },
    async deleteCrew(c){
      const paths = c.feed.filter(f => f.path).map(f => f.path);
      fail(await sb.from('crews').delete().eq('id', c.id));
      if (paths.length) sb.storage.from('crew-photos').remove(paths).then(()=>{}, ()=>{});
    },
    async rerun(c){ return fail(await sb.rpc('rerun_crew', {p_old:c.id})); },
    async setName(n){ fail(await sb.from('crew_profiles').update({name:n}).eq('id', myId())); },
    async setPrefs(p){ fail(await sb.from('crew_profiles').update({notif_prefs:p}).eq('id', myId())); },
    async setColor(c, color){ fail(await sb.rpc('set_crew_color', {p_crew:c.id, p_color:color})); },
    async addHabit(name, kind){ fail(await sb.from('crew_habits').insert({user_id:myId(), name, kind, start_day:dateOf(tzIdx(MY_TZ))})); },
    async markHabit(h, on){ const t = tzIdx(MY_TZ), m = [...h.marks].filter(d => d !== t); if (on) m.push(t);
      fail(await sb.from('crew_habits').update({marks:m.map(dateOf)}).eq('id', h.id)); },
    async deleteHabit(h){ fail(await sb.from('crew_habits').delete().eq('id', h.id)); },
    async setReminder(hm){ fail(await sb.from('crew_profiles').update({remind_at:hm, tz:MY_TZ}).eq('id', myId())); },
    async report(c, p, reason){
      fail(await sb.from('crew_reports').insert({reporter:myId(), reported_user:p.who, post_id:p.id, reason, post_body:p.text || null, post_photo:p.path || null}));
    },
    async block(id){ const r = await sb.from('crew_blocks').insert({blocker:myId(), blocked:id}); if (r.error && r.error.code !== '23505') throw r.error; },
    async unblock(id){ fail(await sb.from('crew_blocks').delete().eq('blocker', myId()).eq('blocked', id)); },
    async deleteAccount(){
      const mine = await all(() => sb.from('crew_posts').select('photo').eq('user_id', myId()).not('photo', 'is', null));
      const paths = mine.map(p => p.photo);
      for (let i = 0; i < paths.length; i += 100) await sb.storage.from('crew-photos').remove(paths.slice(i, i + 100));
      try { const sub = await pushSub(); if (sub) await sub.unsubscribe(); } catch(e){}
      fail(await sb.rpc('delete_my_account'));
      await this.signOut();
    },
    async pushOn(){
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64urlBytes(CFG.vapidPublicKey)});
      const j = sub.toJSON();
      fail(await sb.from('crew_push_subs').upsert({endpoint:j.endpoint, user_id:myId(), p256dh:j.keys.p256dh, auth:j.keys.auth}));
    },
    async pushOff(){
      const sub = await pushSub(); if (!sub) return;
      await sb.from('crew_push_subs').delete().eq('endpoint', sub.endpoint);
      await sub.unsubscribe();
    },
    live(onChange){
      if (channel) return;
      channel = sb.channel('crews-live');
      ['crew_checkins', 'crew_posts', 'crew_cheers', 'crew_members', 'crew_nudges'].forEach(t =>
        channel.on('postgres_changes', {event:'*', schema:'public', table:t}, onChange));
      channel.subscribe();
    }
  };
}
function b64urlBytes(s){ const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function pushSub(){ if (!('serviceWorker' in navigator)) return null; const reg = await navigator.serviceWorker.getRegistration(); return reg && reg.pushManager ? reg.pushManager.getSubscription() : null; }

const api = DEMO ? demoBackend() : supabaseBackend();

/* ---------- device features ---------- */
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushCapable = () => !DEMO && !!CFG.vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const pushNeedsInstall = () => !DEMO && !!CFG.vapidPublicKey && isIOS && !standalone();
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (U.screen === 'you') render(); });
const pushIsOn = () => ls.get('crews.push') === 'on' && 'Notification' in window && Notification.permission === 'granted';

/* ---------- loading and refreshing ---------- */
let reloadTimer = null, loading = null;
async function refresh(){
  if (loading) return loading;
  loading = (async () => { await api.load(); S.loaded = true; })().finally(() => { loading = null; });
  return loading;
}
function softRefresh(){ clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { const before = snapshot(); refresh().then(() => { announce(before); safeRender(); }, () => {}); }, 350); }
// pop-ups when crewmates check in on their phones
function snapshot(){ const m = {}; S.crews.forEach(c => { const t = today(c); m[c.id] = {ins:new Set(Object.keys(c.log[t] || {})), full:fullDay(c, t)}; }); return m; }
function announce(before){
  const msgs = [];
  S.crews.forEach(c => {
    const b = before[c.id], m0 = me(c); if (!b || !m0 || finished(c)) return;
    const t = today(c), fresh = Object.keys(c.log[t] || {}).filter(id => !b.ins.has(id) && id !== m0.id);
    if (!fresh.length) return;
    if (!b.full && fullDay(c, t)){ U.burst = c.id; if (!celebrateFor(c)) msgs.push(`${c.name}: everyone's in. Chain ${chainInfo(c).chain}!`); }
    else fresh.forEach(id => { const m = c.members.find(x => x.id === id); msgs.push(`${first(m && m.name)} checked in · ${c.name} ${doneToday(c)}/${c.members.length}`); });
  });
  if (msgs.length) toast(msgs.slice(0, 2).join('  ·  '));
}
// a big pop-up for chain milestones, full weeks, finishing, and your own streaks. Returns true if it showed one.
function celebrateFor(c, mine){
  const t = today(c), info = chainInfo(c);
  if (fullDay(c, t)){
    if (t === lastDay(c)){ U.celebrate = {crew:c.id, big:String(c.len), title:'Challenge complete', sub:`${c.name}: ${c.len} days together. Run it back?`, links:9}; return true; }
    if (isMilestone(info.chain)){ U.celebrate = {crew:c.id, big:String(info.chain), title:milestoneTitle(info.chain), sub:`${c.name}: everyone showed up ${info.chain} days straight.`, links:info.chain}; return true; }
  }
  if (mine){ const k = pstreak(c, me(c).id); if ([3, 7, 14, 21, 30, 50, 100, 200, 365].includes(k)){ U.celebrate = {crew:c.id, big:String(k), title:`${k}-day streak`, sub:`${c.name}: ${k} days in a row.`, links:k}; return true; } }
  return false;
}
// background updates wait while someone is typing, so their text isn't wiped
let renderLater = false;
function safeRender(){ const el = document.activeElement; if (el && app.contains(el) && /INPUT|TEXTAREA/.test(el.tagName)){ renderLater = true; return; } render(); }
app.addEventListener('focusout', () => { if (renderLater){ renderLater = false; setTimeout(safeRender, 50); } });

let toastTimer;
function toast(msg){ U.toast = msg; clearTimeout(toastTimer); toastTimer = setTimeout(() => { U.toast = null; safeRender(); }, 2800); }
function errText(e){
  const m = (e && (e.message || e.error_description)) || '';
  if (/offline|fetch|network/i.test(m)) return "Can't reach the server. Check your connection.";
  if (/row-level security|42501/i.test(m) || (e && e.code === '42501')) return "That didn't save. Refresh and try again.";
  if (/Invalid login credentials/i.test(m)) return 'Wrong email or password.';
  if (/already registered/i.test(m)) return 'That email already has an account. Sign in instead.';
  if (/Password should be/i.test(m)) return 'Use at least 6 characters for your password.';
  if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  return m || 'Something went wrong. Try again.';
}
async function act(fn, ok){
  if (U.busy) return; U.busy = true; render();
  try { const r = await fn(); await refresh(); const m = ok && (typeof ok === 'function' ? ok(r) : ok); if (m) toast(m); return r; }
  catch(e){ toast(errText(e)); try { await refresh(); } catch(_){} }
  finally { U.busy = false; render(); }
}

/* =====================================================================
   VIEWS
   ===================================================================== */
function av(m, cls, done, waiting){
  const bg = m.you ? 'var(--chain)' : m.color;
  return `<span class="av ${cls||''} ${waiting?'wait':''}" style="background:${bg};${m.you?'color:var(--chain-fg)':''}">${esc(initials(m.name))}${done?`<span class="ok">${ic('check')}</span>`:''}</span>`;
}
const demoBar = () => DEMO ? `<div class="demo">${ic('info','width:16px;height:16px')}<span>Demo mode. Everything stays on this device.</span></div>` : '';

function vLoading(){ return `<div class="screen nonav center"><span style="color:var(--chain)">${ic('rings','width:56px;height:56px;stroke-width:2.6')}</span><div class="spin"></div></div>`; }

function invitePreviewCard(){
  const p = U.preview; if (!p) return '';
  return `<div class="card" style="gap:10px">
    <div class="lab">You're invited</div>
    <div class="h" style="font-size:24px;font-weight:800;letter-spacing:-.02em">${esc(p.name)}</div>
    <div class="sub">${esc(p.rule)}${p.rule?' · ':''}${p.finished?'Finished':`Day ${Math.max(1, p.day)} of ${p.len}`}</div>
    <div class="row" style="flex-wrap:wrap;gap:6px">${(p.members||[]).map(m=>av({name:m.name, color:m.color}, 'sm')).join('')}<span class="sub">${p.count} in the crew</span></div>
  </div>`;
}

function vWelcome(){
  const a = U.auth;
  const title = a === 'up' ? 'Create your account' : a === 'in' ? 'Sign in' : 'Reset your password';
  return `<div class="screen nonav" style="justify-content:center;gap:22px">
    <div class="row" style="gap:10px;color:var(--chain)">${ic('rings','width:40px;height:40px;stroke-width:2.6')}<span class="h" style="font-size:22px;font-weight:800;color:var(--ink)">cadence crews</span></div>
    ${U.preview ? invitePreviewCard() : `<h1 class="title" style="font-size:42px">Better with your crew.</h1>`}
    ${demoBar()}
    <form data-f="auth" class="card" style="gap:10px" novalidate>
      <div class="h" style="font-size:19px;font-weight:700">${title}</div>
      ${a === 'up' || DEMO ? `<label class="lab" for="au-name">Your name</label><input id="au-name" type="text" maxlength="24" autocomplete="given-name" placeholder="First name">` : ''}
      ${DEMO ? '' : `<label class="lab" for="au-email">Email</label><input id="au-email" type="email" autocomplete="email" placeholder="you@example.com">`}
      ${DEMO || a === 'reset' ? '' : `<label class="lab" for="au-pw">Password</label><input id="au-pw" type="password" minlength="6" autocomplete="${a==='up'?'new-password':'current-password'}" placeholder="${a==='up'?'At least 6 characters':'Password'}">`}
      ${U.authErr ? `<div class="err" role="alert">${esc(U.authErr)}</div>` : ''}
      ${U.authMsg ? `<div class="sub" role="status" style="font-weight:600">${esc(U.authMsg)}</div>` : ''}
      <button class="btn chainbtn" type="submit" ${U.busy?'disabled':''}>${DEMO ? 'Try the demo' : a === 'up' ? (U.preview ? 'Create account and join' : 'Create account') : a === 'in' ? (U.preview ? 'Sign in and join' : 'Sign in') : 'Send reset link'}</button>
      ${DEMO ? '' : `<div class="row" style="justify-content:space-between;flex-wrap:wrap">
        ${a === 'up' ? `<button type="button" class="linkbtn" data-a="authmode" data-v="in">I have an account</button>` : `<button type="button" class="linkbtn" data-a="authmode" data-v="up">Create an account</button>`}
        ${a === 'in' ? `<button type="button" class="linkbtn" data-a="authmode" data-v="reset">Forgot password?</button>` : ''}
      </div>`}
    </form>
    <a href="privacy.html" class="sub" style="text-align:center">Privacy</a>
  </div>`;
}

function vNewPw(){
  return `<div class="screen nonav" style="justify-content:center">
    <h2 class="title" style="font-size:32px">New password</h2>
    <form data-f="newpw" class="card" style="gap:10px">
      <label class="lab" for="np">New password</label><input id="np" type="password" minlength="6" autocomplete="new-password" placeholder="At least 6 characters">
      ${U.authErr ? `<div class="err" role="alert">${esc(U.authErr)}</div>` : ''}
      <button class="btn chainbtn" type="submit" ${U.busy?'disabled':''}>Save password</button>
    </form>
  </div>`;
}

function vName(){
  return `<div class="screen nonav" style="justify-content:center">
    <h2 class="title" style="font-size:32px">What should your crew call you?</h2>
    <form data-f="name" class="card" style="gap:10px">
      <label class="lab" for="nm">Your name</label><input id="nm" type="text" maxlength="24" autocomplete="given-name" placeholder="First name">
      <button class="btn chainbtn" type="submit">Continue</button>
    </form>
  </div>`;
}

function vJoin(){
  const p = U.preview;
  return `<div class="screen nonav" style="justify-content:center">
    ${p ? invitePreviewCard() : `<div class="card"><div class="h" style="font-size:20px;font-weight:700">This invite link doesn't work anymore.</div></div>`}
    ${p && !p.finished && p.count < MAX ? `<button class="btn chainbtn" data-a="join" ${U.busy?'disabled':''}>Join the crew</button>` : p ? `<div class="sub">${p.finished?'This challenge already finished.':'This crew is full.'}</div>` : ''}
    <button class="btn ghost" data-a="nojoin">Not now</button>
  </div>`;
}

function crewCard(c){
  const info = chainInfo(c), fin = finished(c), m0 = me(c), done = isDone(c, today(c), m0.id);
  let foot;
  if (fin) foot = `<div class="row" style="gap:8px"><button class="btn sm ghost" data-a="recap" data-v="${c.id}">${ic('bars','width:16px;height:16px')}Recap</button><button class="btn sm" data-a="again" data-v="${c.id}">${ic('redo','width:16px;height:16px')}Run it back</button></div>`;
  else if (!done) foot = `<button class="btn chainbtn" data-a="checkin" data-v="${c.id}">${c.proof?ic('cam','width:18px;height:18px'):''}Check in</button>`;
  else foot = `<div class="row" style="font-weight:700;font-size:15px">${ic('check','width:18px;height:18px;color:var(--chain-text)')}${doneToday(c)}/${c.members.length} in</div>`;
  return `<div class="card crewc" style="${ccVars(c)}border-top:5px solid var(--chain)">
    <button data-a="crew" data-v="${c.id}" style="display:flex;flex-direction:column;gap:12px;text-align:left;width:100%">
      <span class="row" style="justify-content:space-between;align-items:flex-start;width:100%">
        <span class="grow"><span class="h" style="display:block;font-size:21px;font-weight:700;letter-spacing:-.01em">${esc(c.name)}</span><span class="sub">${fin?'Finished':`Day ${dayNum(c)} of ${c.len}`}</span></span>
        <span class="pill">${ic('rings')}${info.chain}</span>
      </span>
      ${chainSVG(chainStates(c, info), {w:318, W:22, H:13, step:16, sw:3.6, gap:9, key:'home'+c.id, label:info.chain+' day chain'})}
      <span class="row" style="flex-wrap:wrap">${c.members.map(m=>av(m,'',isDone(c,today(c),m.id),!fin && !isDone(c,today(c),m.id))).join('')}</span>
    </button>
    ${foot}
  </div>`;
}

function vHome(){
  const t = new Date(); t.setDate(t.getDate() + (DEMO ? demo.offset : 0));
  const active = S.crews.filter(c => !finished(c)), done = S.crews.filter(finished);
  return `<div class="screen">
    <div class="row" style="justify-content:space-between;align-items:flex-end">
      <div><div class="lab">${esc(t.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'}))}</div><h2 class="title" style="margin-top:2px">Today</h2></div>
      <span style="color:var(--chain)">${ic('rings','width:30px;height:30px;stroke-width:2.6')}</span>
    </div>
    ${demoBar()}
    ${active.map(crewCard).join('')}
    ${!S.crews.length ? `<div class="empty"><span style="color:var(--chain)">${ic('rings','width:84px;height:84px;stroke-width:2.2')}</span><div class="h" style="font-size:24px;font-weight:800">No crews yet</div><div class="sub">Start a challenge, then send the link to 2 to 4 friends.</div><button class="btn" data-a="tab" data-v="new" style="max-width:240px">Start a challenge</button></div>` : ''}
    ${habitsCard()}
    ${done.length ? `<div class="lab" style="margin-top:6px">Finished</div>${done.map(crewCard).join('')}` : ''}
  </div>`;
}

function habitsCard(){
  const t = hToday();
  const del = h => `<button class="menu-b" data-a="delhabit" data-v="${h.id}" aria-label="Delete ${esc(h.name)}" style="margin-left:0;${U.confirm==='h'+h.id?'color:#B42318;width:auto;padding:0 8px;font-size:13px;font-weight:700':''}">${U.confirm==='h'+h.id?'Delete?':ic('x','width:16px;height:16px')}</button>`;
  const rows = S.habits.map(h => h.kind === 'build'
    ? `<div class="hb"><button class="hbox ${h.marks.has(t)?'on':''}" data-a="habit" data-v="${h.id}" aria-pressed="${h.marks.has(t)}" aria-label="Done today: ${esc(h.name)}">${h.marks.has(t)?ic('check'):''}</button>
        <button class="grow" data-a="hstats" data-v="${h.id}" style="text-align:left"><div style="font-weight:600;font-size:15px">${esc(h.name)}</div><div class="sub">${habitStreak(h)} day streak · ${habitStats(h).rate}%</div></button>${del(h)}</div>`
    : `<div class="hb"><button class="hbox ${h.marks.has(t)?'':'on'}" data-a="slip" data-v="${h.id}" aria-pressed="${!h.marks.has(t)}" aria-label="${h.marks.has(t)?'Undo slip':'Slipped today'}: ${esc(h.name)}" style="${h.marks.has(t)?'':'background:var(--chip);border-color:var(--chip);color:var(--ink)'}">${h.marks.has(t)?ic('x'):ic('shield')}</button>
        <button class="grow" data-a="hstats" data-v="${h.id}" style="text-align:left"><div style="font-weight:600;font-size:15px">${esc(h.name)}</div><div class="sub">${h.marks.has(t)?'Slipped today. Tap the box to undo.':`${daysClean(h)} day${daysClean(h)===1?'':'s'} clean · best ${habitStats(h).best}`}</div></button>${del(h)}</div>`).join('');
  return `<div style="display:flex;flex-direction:column;gap:8px">
    <div class="row" style="gap:6px;color:var(--muted)">${ic('lock','width:14px;height:14px')}<div class="lab grow">Just for you</div><button class="linkbtn row" style="gap:4px" data-a="addhabit">${ic('plus','width:16px;height:16px')}Add</button></div>
    ${S.habits.length ? `<div class="card" style="gap:0;padding:14px 16px">${rows}</div>` : `<button class="card" data-a="addhabit" style="flex-direction:row;align-items:center;color:var(--muted);font-weight:600;font-size:15px;border:2px dashed var(--line);background:transparent">${ic('plus')}Add a private habit</button>`}
  </div>`;
}

function vNew(){
  const d = U.draft;
  return `<div class="screen">
    <h2 class="title">Challenges</h2>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      ${TEMPLATES.map((t,i)=>`<button class="tpl ${d&&d.tpl===i?'on':''}" data-a="tpl" data-v="${i}" ${t.custom?'style="background:transparent;border:2px dashed var(--wait)"':''}><b>${t.custom?'Your own':t.name}</b><span class="sub" style="font-weight:600">${t.custom?'Any habit':t.len+' days'}</span></button>`).join('')}
    </div>
    ${d ? `<div class="card" id="setup">
      <label for="cn" class="lab">Name</label><input id="cn" type="text" maxlength="32" value="${esc(d.name)}" placeholder="Crew challenge" autocomplete="off">
      <label for="cr" class="lab">Rule</label><input id="cr" type="text" maxlength="40" value="${esc(d.rule)}" placeholder="2 to 4 words" autocomplete="off">
      <div class="lab">Days</div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">${LENGTHS.map(n=>`<button class="len ${!d.customLen&&d.len===n?'on':''}" data-a="len" data-v="${n}">${n}</button>`).join('')}<button class="len ${d.customLen?'on':''}" data-a="len" data-v="custom" style="grid-column:span 2">Custom</button></div>
      ${d.customLen ? `<div class="row"><label for="cl" class="sub" style="font-weight:600">Number of days</label><input id="cl" type="number" inputmode="numeric" min="3" max="365" value="${d.len}" class="custom-len" style="font:inherit;font-size:15px;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px"><span class="sub">3 to 365</span></div>` : ''}
      <div class="lab">Crew color</div>
      <div class="swatches">${CREW_COLORS.map(k=>`<button class="sw-b ${(d.color||CREW_COLORS[0].hi)===k.hi?'on':''}" data-a="dcolor" data-v="${k.hi}" style="background:${k.hi}" aria-label="${k.name}" aria-pressed="${(d.color||CREW_COLORS[0].hi)===k.hi}"></button>`).join('')}</div>
      <div class="lab">Chain rule</div>
      <div class="row" style="gap:8px"><button class="sel ${d.mode==='daily'?'on':''}" data-a="mode" data-v="daily">Daily + saves</button><button class="sel ${d.mode==='weekly'?'on':''}" data-a="mode" data-v="weekly">5 of 7 days</button></div>
      <div class="sub">${d.mode==='daily'?'Everyone checks in daily. The crew shares one save per person for missed days.':'Each person needs 5 of 7 days a week.'}</div>
      <div class="row" style="justify-content:space-between;font-size:15px;font-weight:600"><span>Photo required</span><button class="toggle" role="switch" aria-checked="${d.proof}" aria-label="Photo required" data-a="proof"></button></div>
      <button class="btn chainbtn crewc" style="${ccVars(d)}" data-a="create" ${d.name.trim()&&!U.busy?'':'disabled'}>Create crew</button>
    </div>` : ''}
  </div>`;
}

const inviteUrl = c => `${BASE}?j=${c.code}`;

function vCrew(){
  const c = crewById(U.crew); if (!c){ U.screen = 'home'; return vHome(); }
  const info = chainInfo(c), fin = finished(c), m0 = me(c), t = today(c), meDone = isDone(c, t, m0.id);
  const firstIn = firstToday(c);
  const waiting = c.members.filter(m => !m.you && !isDone(c, t, m.id));
  const nudged = (c.nudges[t] || []).includes(m0.id);
  const postedToday = c.feed.some(f => f.who === m0.id && f.day === t);
  const span = Math.min(dayNum(c), 14), from = Math.min(t, lastDay(c)) - span + 1;
  const grid = c.members.map(m => { let cells = ''; for (let d = from; d <= Math.min(t, lastDay(c)); d++){ const ok = isDone(c, d, m.id); cells += `<span class="cell ${ok?'':(d===t?'t':'x')}" ${d<m.joinDay?'style="opacity:.25"':''}></span>`; }
    return `<div class="row" style="gap:3px"><span style="width:56px;font-size:13px;font-weight:600;flex:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.you?'You':esc(first(m.name))}</span>${cells}</div>`; }).join('');
  const status = fin ? 'Finished' : info.todayFull ? "Everyone's in" : `${doneToday(c)}/${c.members.length} in today`;
  const weekly = c.mode === 'weekly' && !fin ? (w => ` · you ${w.done}/${w.need} this week`)(weekNeed(c, m0.id)) : '';
  const canInvite = !fin && c.members.length < MAX;
  const owner = c.owner === m0.id;
  return `<div class="screen crewc" style="${ccVars(c)}">
    <div class="row" style="gap:12px">
      <button class="back" data-a="tab" data-v="home" aria-label="Back">${ic('back')}</button>
      <div class="grow"><div class="h" style="font-size:22px;font-weight:800;letter-spacing:-.02em">${esc(c.name)}</div><div class="sub">${esc(c.rule)}${c.proof?' · photo required':''}</div></div>
    </div>
    <div style="background:var(--hero);color:var(--hero-fg);border-radius:26px;padding:18px;display:flex;flex-direction:column;gap:14px">
      <div class="row" style="align-items:baseline">
        <div class="h ${U.burst===c.id?'burst':''}" style="font-size:64px;line-height:.85;font-weight:800;letter-spacing:-.05em;color:var(--chain-hi)">${info.chain}</div>
        <div style="font-size:15px;font-weight:600">day chain</div>
        <div style="margin-left:auto;font-size:13px;color:var(--hero-muted)">Best ${info.best}</div>
      </div>
      ${chainSVG(chainStates(c, info), {w:314, on:'var(--chain-hi)', off:'#5E6070', wait:'var(--hero-muted)', key:'crew'+c.id, label:info.chain+' day chain, day '+dayNum(c)+' of '+c.len})}
      <div class="legend" style="color:var(--hero-muted)"><span><svg width="16" height="10" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="7" rx="3.5" fill="none" stroke="var(--chain-hi)" stroke-width="3"/></svg>Linked</span><span><svg width="16" height="10" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="7" rx="3.5" fill="none" stroke="var(--chain-hi)" stroke-width="3" opacity=".45"/></svg>Saved</span><span><svg width="16" height="10" aria-hidden="true"><rect x="1.5" y="1.5" width="13" height="7" rx="3.5" fill="none" stroke="#5E6070" stroke-width="3" transform="rotate(-14 8 5)"/></svg>Broken</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;font-size:13px;color:var(--hero-muted)">
        <span>${fin?'Done':`Day ${dayNum(c)} of ${c.len}`}</span><span>·</span><span>${status}${weekly}</span>
        <span style="margin-left:auto" class="row">${ic('shield','width:14px;height:14px')}${ruleLabel(c,info)}</span>
      </div>
      <div class="row" style="flex-wrap:wrap;gap:12px">
        ${c.members.map(m=>{ const tappable = DEMO && !m.you && !fin;
          const tag = tappable ? 'button' : 'div';
          return `<${tag} ${tappable?`data-a="friend" data-v="${c.id}" data-m="${m.id}" aria-label="Check in ${esc(m.name)} (test friend)"`:''} style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:600;position:relative;color:var(--hero-fg)">${firstIn===m.id?'<span class="first">1ST</span>':''}${av(m,'lg',isDone(c,t,m.id),!fin && !isDone(c,t,m.id))}<span>${m.you?'You':esc(first(m.name))}</span><span style="color:var(--hero-muted);font-weight:500">${pstreak(c,m.id)}d</span></${tag}>`; }).join('')}
        ${DEMO && canInvite ? `<button data-a="addfriend" aria-label="Add test friend" style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--hero-fg)"><span class="av lg" style="background:var(--hero-chip);color:var(--hero-fg)">${ic('plus')}</span><span>Test friend</span></button>` : ''}
      </div>
      ${U.addFriend?`<form data-f="friend" class="row" style="gap:8px"><label for="fn" class="sr">Friend's name</label><input id="fn" type="text" maxlength="20" placeholder="Test friend's name" autocomplete="off" style="padding:10px 12px"><button class="btn sm" type="submit" style="width:auto;padding:10px 16px;background:var(--chain);color:var(--chain-fg)">Add</button></form>`:''}
      ${!fin && !meDone ? `<button class="btn chainbtn" data-a="checkin" data-v="${c.id}" ${U.busy?'disabled':''}>${c.proof?ic('cam','width:18px;height:18px'):''}Check in</button>` : ''}
      ${!fin && meDone && waiting.length ? `<button class="btn sm" data-a="nudge" data-v="${c.id}" ${nudged||U.busy?'disabled':''} style="background:var(--hero-chip);color:var(--hero-fg)">${ic(nudged?'check':'zap','width:16px;height:16px')}${nudged?'Nudged':'Nudge the crew'}</button>` : ''}
      ${fin ? `<button class="btn chainbtn" data-a="again" data-v="${c.id}">${ic('redo','width:18px;height:18px')}Run it back</button>` : ''}
    </div>
    ${canInvite ? `<div class="card" style="gap:10px">
      <div class="row"><div class="h grow" style="font-size:18px;font-weight:700">${c.members.length===1?'Invite your crew':'Invite more'}</div><span class="sub">${c.members.length}/${MAX}</span></div>
      <div class="row" style="background:var(--chip);border-radius:12px;padding:10px 12px"><div class="grow" style="font-size:14px;font-weight:600;user-select:all;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(inviteUrl(c).replace(/^https?:\/\//,''))}</div></div>
      <button class="btn sm ${c.members.length===1?'chainbtn':'ghost'}" data-a="invite" data-v="${c.id}">${ic('share','width:16px;height:16px')}Share invite link</button>
    </div>` : ''}
    ${notifAsk(meDone && !fin)}
    ${meDone && !postedToday && !fin ? composer(c, false) : ''}
    <div class="card" style="gap:8px"><div class="lab">Who checked in</div>${grid}</div>
    ${c.feed.map(f=>post(c,f)).join('')}
    <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
      <button class="chip" data-a="leave" ${U.confirm==='leave'?'style="background:#FDE2D6;color:#B42318"':''}>${ic('out')}${U.confirm==='leave'?'Tap again to leave':'Leave crew'}</button>
      ${owner?`<button class="chip" data-a="colorsheet" data-v="${c.id}"><span style="width:14px;height:14px;border-radius:50%;background:var(--chain-hi)"></span>Color</button>`:''}
      ${owner?`<button class="chip" data-a="delcrew" ${U.confirm==='del'?'style="background:#FDE2D6;color:#B42318"':''}>${ic('trash')}${U.confirm==='del'?'Delete for everyone?':'Delete crew'}</button>`:''}
    </div>
  </div>`;
}

function notifAsk(show){
  if (!show || ls.get('crews.asked') || pushIsOn()) return '';
  if (pushNeedsInstall()) return `<div class="card" style="flex-direction:row;align-items:center"><span style="color:var(--chain-text)">${ic('bell')}</span><div class="grow" style="font-weight:600;font-size:14px">Want nudges from your crew? Add this app to your Home Screen first: Share, then Add to Home Screen.</div><button class="chip" data-a="notif" data-v="no">OK</button></div>`;
  if (!pushCapable() || Notification.permission === 'denied') return '';
  return `<div class="card" style="flex-direction:row;align-items:center"><span style="color:var(--chain-text)">${ic('bell')}</span><div class="grow" style="font-weight:600;font-size:14px">Get a nudge when your crew is waiting?</div><button class="chip on" data-a="notif" data-v="yes">Turn on</button><button class="chip" data-a="notif" data-v="no">Later</button></div>`;
}

function composer(c, required){
  const k = U.compose;
  return `<div class="card" style="gap:10px">
    <div class="row" style="justify-content:space-between"><div class="h" style="font-size:17px;font-weight:700">${required?'Photo check-in':'Add a photo or note'}</div>${required?'':'<span class="sub">optional</span>'}</div>
    <label class="photo-pick">${k.photo?`<img src="${k.photo}" alt="Your photo">`:`${ic('cam','width:28px;height:28px;stroke-width:1.8')}Photo`}<input type="file" accept="image/*" id="ph"></label>
    <label for="note" class="sr">Note</label>
    <textarea id="note" rows="2" maxlength="200" placeholder="Note">${esc(k.note)}</textarea>
    <button class="btn ${required?'chainbtn':''} sm" data-a="post" data-v="${c.id}" data-req="${required?1:0}" ${(required&&!k.photo)||U.busy?'disabled':''}>${required?'Check in':'Post'}</button>
  </div>`;
}

function post(c, f){
  const m = c.members.find(x => x.id === f.who) || {name:S.names[f.who] || 'Someone', color:'#DDDDDD'};
  const cheered = f.cheers.includes(me(c).id);
  return `<div class="card" style="padding:14px;gap:10px">
    <div class="row">${av(m,'sm')}<div class="grow"><div style="font-weight:600;font-size:14px">${m.you?'You':esc(m.name)}</div><div class="sub" style="font-size:12px">${whenLabel(c, f.day)}</div></div><button class="menu-b" data-a="postmenu" data-v="${c.id}" data-m="${f.id}" aria-label="Post options">${ic('dots')}</button></div>
    ${f.photo?`<img class="pimg" src="${esc(f.photo)}" alt="Check-in photo" loading="lazy">`:f.path?`<div class="sub">Photo loading…</div>`:''}
    ${f.text?`<div style="font-size:15px;line-height:1.4;overflow-wrap:anywhere">${esc(f.text)}</div>`:''}
    <div class="row"><button class="chip ${cheered?'on':''}" data-a="cheer" data-v="${c.id}" data-m="${f.id}" aria-pressed="${cheered}">${ic('heart')}${f.cheers.length||''}</button></div>
  </div>`;
}

function vCompose(){
  const c = crewById(U.crew); if (!c){ U.screen = 'home'; return vHome(); }
  return `<div class="screen nonav crewc" style="${ccVars(c)}">
    <div class="row" style="justify-content:space-between"><h2 class="title" style="font-size:26px">${esc(c.name)}</h2><button class="back" data-a="crew" data-v="${c.id}" aria-label="Close">${ic('x')}</button></div>
    ${composer(c, true)}
  </div>`;
}

function weekStats(c){
  const info = chainInfo(c), end = Math.min(today(c), lastDay(c)), days = Math.min(7, end - c.startDay + 1), from = end - days + 1;
  let hit = 0, slots = 0;
  for (let d = from; d <= end; d++) membersOn(c, d).forEach(m => { slots++; if (isDone(c, d, m.id)) hit++; });
  const firsts = {};
  for (let d = from; d <= end; d++){ const l = c.log[d]; if (!l) continue; let b = null, v = Infinity; Object.keys(l).forEach(k => { if (l[k] < v){ v = l[k]; b = k; } }); if (b) firsts[b] = (firsts[b] || 0) + 1; }
  let early = null, ev = 0; Object.keys(firsts).forEach(k => { if (firsts[k] > ev){ ev = firsts[k]; early = k; } });
  const st = []; for (let d = from; d <= end; d++) st.push(info.st[d] || (d === today(c) && !finished(c) ? 't' : 'paused'));
  return {info, hit, slots, early:early && c.members.find(m => m.id === early), st};
}

function recapCard(c){
  const fin = finished(c), w = weekStats(c), info = w.info, em = w.early;
  return `<div class="crewc" style="${ccVars(c)}flex:none;background:var(--hero);color:var(--hero-fg);border-radius:28px;padding:22px;display:flex;flex-direction:column;gap:16px;position:relative;overflow:hidden">
    <div style="position:absolute;right:-70px;top:-6px;width:250px;transform:rotate(-32deg);opacity:.95">${chainSVG(['full','full','full','full'],{w:400, W:84, H:48, step:62, sw:12, on:'var(--chain-hi)', label:'Chain', key:'deco'+c.id, sway:false})}</div>
    <div class="lab" style="color:var(--hero-muted);position:relative;padding-right:120px">${fin?'Final recap':'This week'} · ${esc(c.name)}</div>
    <div style="position:relative;margin-top:56px"><div class="h" style="font-size:72px;line-height:.85;font-weight:800;letter-spacing:-.05em">${w.hit}<span style="color:var(--hero-muted)">/${w.slots}</span></div><div style="font-size:15px;font-weight:600;margin-top:6px">check-ins</div></div>
    <div style="position:relative">${chainSVG(w.st,{w:306, W:36, H:22, step:27, sw:5.5, on:'var(--chain-hi)', off:'#5E6070', wait:'var(--hero-muted)', label:'This week', key:'recap'+c.id})}</div>
    <div class="row" style="gap:10px">
      <div style="background:var(--hero-chip);border-radius:16px;padding:12px;flex:1"><div class="h" style="font-size:26px;font-weight:800;color:var(--chain-hi)">${info.chain}</div><div style="font-size:12px;color:var(--hero-muted)">Chain</div></div>
      <div style="background:var(--hero-chip);border-radius:16px;padding:12px;flex:1"><div class="h" style="font-size:26px;font-weight:800">${info.best}</div><div style="font-size:12px;color:var(--hero-muted)">Best</div></div>
      <div style="background:var(--hero-chip);border-radius:16px;padding:12px;flex:1;min-width:0"><div class="h" style="font-size:20px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${em?(em.you?'You':esc(first(em.name))):'-'}</div><div style="font-size:12px;color:var(--hero-muted)">First in most</div></div>
    </div>
    <div class="row" style="flex-wrap:wrap;gap:6px">${c.members.map(m=>av(m,'sm')).join('')}</div>
    <div class="row" style="gap:8px">
      <button class="btn chainbtn sm" data-a="share" data-v="${c.id}">${ic('share','width:16px;height:16px')}Share to story</button>
      ${fin?`<button class="btn sm" data-a="again" data-v="${c.id}" style="background:var(--hero-chip);color:var(--hero-fg)">${ic('redo','width:16px;height:16px')}Run it back</button>`:''}
    </div>
  </div>`;
}
function habitsRecap(){
  const t = hToday();
  const rows = S.habits.map(h => {
    let k = 0, n = 0; for (let d = Math.max(h.startDay, t - 6); d <= t; d++){ n++; if (h.marks.has(d)) k++; }
    const label = h.kind === 'build' ? `${k}/${n} days` : `${n - k}/${n} clean`;
    return `<button class="li" data-a="hstats" data-v="${h.id}" style="text-align:left"><span class="grow" style="font-weight:600">${esc(h.name)}</span>
      <span style="display:grid;grid-template-columns:repeat(7,10px);gap:3px">${habitCells(h, 7)}</span><span class="sub" style="width:70px;text-align:right">${label}</span></button>`;
  }).join('');
  return `<div class="card" style="gap:0;flex:none"><div class="row" style="gap:6px;color:var(--muted);margin-bottom:10px">${ic('lock','width:14px;height:14px')}<div class="lab">Just for you · this week</div></div>${rows}</div>`;
}
function vRecap(){
  const list = U.recapOnly ? S.crews.filter(c => c.id === U.recapOnly) : S.crews;
  return `<div class="screen"><h2 class="title">Recaps</h2>
    ${!U.recapOnly && S.habits.length ? habitsRecap() : ''}
    ${list.length ? list.map(recapCard).join('') : S.habits.length ? '' : `<div class="empty"><span style="color:var(--chain)">${ic('rings','width:84px;height:84px;stroke-width:2.2')}</span><div class="h" style="font-size:22px;font-weight:800">Your first recap shows up here</div></div>`}
  </div>`;
}

function vYou(){
  const theme = ls.get('crews.theme') || 'system';
  const blocked = [...S.blocked];
  const on = pushIsOn();
  let notif;
  if (DEMO) notif = `<div class="sub">Notifications work once the app is connected to Supabase.</div>`;
  else if (pushNeedsInstall()) notif = `<div class="sub">To get nudges on iPhone, add this app to your Home Screen (Share, then Add to Home Screen) and open it from there.</div>`;
  else if (!pushCapable()) notif = `<div class="sub">${CFG.vapidPublicKey ? "This browser doesn't support notifications." : 'Notifications are not set up yet.'}</div>`;
  else notif = `<div class="row" style="justify-content:space-between;font-size:15px;font-weight:600"><span>Crew notifications</span><button class="toggle" role="switch" aria-checked="${on}" aria-label="Crew notifications" data-a="pushtoggle"></button></div>
    ${on ? `<div class="row" style="justify-content:space-between;font-size:15px;font-weight:600"><label for="rt">Daily reminder</label><span class="row" style="gap:8px"><input id="rt" type="time" value="${esc(S.me.remind_at || '')}">${S.me.remind_at?`<button class="linkbtn" data-a="noremind">Off</button>`:''}</span></div>
      <div class="sub">Only sent if you haven't checked in yet.</div>
      <div class="lab" style="margin-top:4px">Send me a notification</div>
      ${NOTIF_KINDS.map(([k,label])=>`<div class="row" style="justify-content:space-between;font-size:15px;font-weight:500"><span>${label}</span><button class="toggle" role="switch" aria-checked="${S.me.prefs[k]!==false}" aria-label="${label}" data-a="pref" data-v="${k}"></button></div>`).join('')}` : ''}`;
  return `<div class="screen">
    <div class="row" style="gap:14px">
      <span class="av" style="width:60px;height:60px;font-size:22px;background:var(--chain);color:var(--chain-fg)">${esc(initials(S.me.name))}</span>
      <div class="grow"><label for="yn" class="sr">Your name</label><input id="yn" type="text" value="${esc(S.me.name)}" maxlength="24" style="font-family:var(--display);font-size:26px;font-weight:800;border:0;background:transparent;padding:0"><div class="sub">${S.crews.length} crew${S.crews.length===1?'':'s'}</div></div>
    </div>
    ${demoBar()}
    <div class="lab">Notifications</div>
    <div class="card">${notif}</div>
    ${S.habits.length ? `<div class="lab">Private habits</div><div class="card" style="gap:0;padding:6px 16px">${S.habits.map(h=>`<div class="li"><span class="grow">${esc(h.name)} <span class="hkind">${h.kind==='build'?'Build':'Break'}</span></span><button class="linkbtn" data-a="delhabit" data-v="${h.id}" ${U.confirm==='h'+h.id?'style="color:#B42318"':''}>${U.confirm==='h'+h.id?'Tap to delete':'Delete'}</button></div>`).join('')}</div>` : ''}
    <div class="lab">Appearance</div>
    <div class="seg2" role="group" aria-label="Theme">${['system','light','dark'].map(t=>`<button data-a="theme" data-v="${t}" class="${theme===t?'on':''}">${t[0].toUpperCase()+t.slice(1)}</button>`).join('')}</div>
    ${!standalone() && (installEvt || isIOS) ? `<button class="opt" data-a="install">${ic('down')}Install the app</button>` : ''}
    ${blocked.length ? `<div class="lab">Blocked</div><div class="card" style="gap:0;padding:6px 16px">${blocked.map(id=>`<div class="li"><span class="grow">${esc(S.names[id] || 'Someone')}</span><button class="linkbtn" data-a="unblock" data-v="${id}">Unblock</button></div>`).join('')}</div>` : ''}
    ${DEMO ? `<div class="lab">Demo controls</div>
      <button class="opt" data-a="skipday">${ic('redo')}Skip to next day</button>
      <button class="opt danger" data-a="erase">${ic('trash')}${U.confirm==='erase'?'Tap again to erase everything':'Erase demo data'}</button>` : `
      <button class="opt" data-a="signout">${ic('out')}Sign out</button>
      <button class="opt danger" data-a="delacct">${ic('trash')}${U.confirm==='delacct'?'Tap again: delete account and posts':'Delete account'}</button>`}
    <a href="privacy.html" class="sub" style="text-align:center">Privacy policy</a>
  </div>`;
}

function nav(){
  const on = {home:'home', crew:'home', new:'new', recap:'recap', you:'you'}[U.screen];
  const t = (id, icon, label) => `<button class="tab ${on===id?'on':''}" data-a="tab" data-v="${id}">${ic(icon)}${label}</button>`;
  const p = pending();
  const acc = p.length && U.screen !== 'crew' ? `<button class="acc" data-a="acc"><span class="dot"></span><span class="grow" style="text-align:left">Check in</span><span style="opacity:.7;font-weight:600">${p.length} crew${p.length>1?'s':''} waiting</span></button>` : '';
  return acc + `<nav class="tabs">${t('home','users','Crews')}${t('new','flag','Challenges')}${t('recap','bars','Recaps')}${t('you','user','You')}</nav>`;
}

let lastSheet = null;
function sheet(){
  const s = U.sheet; let body = '';
  if (s.type === 'checkin'){
    body = `<div class="h" style="font-size:22px;font-weight:800">Check in</div>
      ${pending().map(c=>`<div class="card" style="flex-direction:row;align-items:center;padding:12px 14px"><div class="grow"><div style="font-weight:700">${esc(c.name)}</div><div class="sub">${doneToday(c)}/${c.members.length} in</div></div><button class="btn sm" style="width:auto;padding:10px 18px" data-a="checkin" data-v="${c.id}">Check in</button></div>`).join('')}`;
  } else if (s.type === 'post'){
    const c = crewById(s.crew), f = c && c.feed.find(x => x.id === s.post); if (!c || !f){ U.sheet = null; return ''; }
    const mine = f.who === me(c).id, name = first((c.members.find(m => m.id === f.who) || {}).name || S.names[f.who]);
    body = mine ? `<button class="opt danger" data-a="delpost">${ic('trash')}Delete post</button>`
      : `<button class="opt" data-a="reportsheet">${ic('flagr')}Report post</button><button class="opt danger" data-a="block" data-v="${f.who}">${ic('ban')}Block ${esc(name)}</button>
         <div class="sub">Blocking hides their posts from you. You both stay in the crew.</div>`;
  } else if (s.type === 'report'){
    body = `<div class="h" style="font-size:20px;font-weight:800">Why are you reporting this?</div>
      ${['Spam','Nudity or sexual content','Harassment or bullying','Violence or self-harm','Something else'].map(r=>`<button class="opt" data-a="report" data-v="${esc(r)}">${esc(r)}</button>`).join('')}`;
  } else if (s.type === 'color'){
    const c = crewById(s.crew); if (!c){ U.sheet = null; return ''; }
    body = `<div class="h" style="font-size:20px;font-weight:800">Crew color</div><div class="sub">Changes the chain and buttons for everyone in ${esc(c.name)}.</div>
      <div class="swatches" style="justify-content:center;padding:8px 0">${CREW_COLORS.map(k=>`<button class="sw-b ${crewColor(c).hi===k.hi?'on':''}" data-a="setcolor" data-v="${k.hi}" style="background:${k.hi};width:46px;height:46px" aria-label="${k.name}"></button>`).join('')}</div>`;
  } else if (s.type === 'habit'){
    body = `<div class="h" style="font-size:20px;font-weight:800">New private habit</div>
      <form data-f="habit" style="display:flex;flex-direction:column;gap:12px">
        <label for="hn" class="sr">Habit name</label><input id="hn" type="text" maxlength="40" value="${esc(U.hname||'')}" placeholder="${U.hkind==='build'?'e.g. Read 10 pages':'e.g. No sugar'}" autocomplete="off">
        <div class="seg2" role="group" aria-label="Habit type"><button type="button" data-a="hkind" data-v="build" class="${U.hkind==='build'?'on':''}">Build a habit</button><button type="button" data-a="hkind" data-v="break" class="${U.hkind==='break'?'on':''}">Break a habit</button></div>
        <button class="btn chainbtn" type="submit">Add habit</button>
      </form>`;
  } else if (s.type === 'hstats'){
    const h = S.habits.find(x => x.id === s.habit); if (!h){ U.sheet = null; return ''; }
    const st = habitStats(h), b = h.kind === 'build';
    const tile = (v, l, hi) => `<div style="background:var(--card);border-radius:16px;padding:12px;flex:1;min-width:0"><div class="h" style="font-size:28px;font-weight:800;${hi?'color:var(--chain-text)':''}">${v}</div><div class="sub" style="font-size:12px">${l}</div></div>`;
    body = `<div class="row"><div class="grow"><div class="h" style="font-size:22px;font-weight:800">${esc(h.name)}</div><div class="sub">${b?'Building':'Breaking'} · since ${new Date(h.startDay*DAY).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'})}</div></div><span class="hkind">${b?'Build':'Break'}</span></div>
      <div class="row" style="gap:8px">${b ? tile(st.current, 'Current streak', true) + tile(st.best, 'Best streak') + tile(st.rate + '%', `Last ${st.win} days`)
        : tile(st.current, 'Days clean', true) + tile(st.best, 'Best run') + tile(st.slips, st.slips === 1 ? 'Slip' : 'Slips')}</div>
      <div class="row" style="gap:8px">${b ? tile(st.done, 'Days done') + tile(st.total, 'Days tracked') : tile(st.rate + '%', `Clean, last ${st.win} days`) + tile(st.total, 'Days tracked')}</div>
      <div class="lab">Last 4 weeks</div>
      <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">${habitCells(h, 28)}</div>
      <div class="legend" style="color:var(--muted)">${b ? `<span><span style="width:10px;height:10px;border-radius:3px;background:var(--ink)"></span>Done</span><span><span style="width:10px;height:10px;border-radius:3px;background:var(--line)"></span>Missed</span>`
        : `<span><span style="width:10px;height:10px;border-radius:3px;background:var(--ink)"></span>Clean</span><span><span style="width:10px;height:10px;border-radius:3px;background:#E5484D"></span>Slipped</span>`}</div>`;
  } else if (s.type === 'install'){
    body = `<div class="h" style="font-size:20px;font-weight:800">Install on iPhone</div>
      <div style="font-size:15px;line-height:1.5">In Safari, tap the Share button, then <b>Add to Home Screen</b>. Open the app from your Home Screen to get notifications.</div>`;
  }
  const fresh = lastSheet !== s; lastSheet = s;   // only slide up when it first opens, not on every redraw
  return `<div class="sheet-bg" data-a="closesheet"><div class="sheet" data-stop role="dialog" aria-modal="true" ${fresh?'':'style="animation:none"'}>
    <div style="width:40px;height:5px;border-radius:9px;background:var(--line);align-self:center"></div>
    ${body}
    <button class="btn ghost sm" data-a="closesheet">Cancel</button>
  </div></div>`;
}

function celebrateView(){
  const k = U.celebrate; if (!k) return '';
  const c = crewById(k.crew) || {};
  const n = Math.min(Math.max(k.links || 7, 1), 9);
  return `<div class="celebrate crewc" style="${ccVars(c)}" data-a="closecele"><div class="cbox" data-stop role="dialog" aria-modal="true" aria-label="${esc(k.title)}">
    <div class="big">${esc(k.big)}</div>
    <div class="h" style="font-size:24px;font-weight:800;letter-spacing:-.02em">${esc(k.title)}</div>
    <div style="font-size:14px;color:var(--hero-muted)">${esc(k.sub)}</div>
    <div style="width:100%">${chainSVG(Array(n).fill('full'), {w:300, W:30, H:18, step:22, sw:4.5, on:'var(--chain-hi)', label:k.title, key:'cele'+(k.id || (k.id = Date.now()))})}</div>
    <div class="row" style="gap:8px;width:100%">
      ${k.crew ? `<button class="btn sm" style="background:var(--hero-chip);color:var(--hero-fg)" data-a="share" data-v="${k.crew}">${ic('share','width:16px;height:16px')}Share</button>` : ''}
      <button class="btn chainbtn sm" data-a="closecele">Keep going</button>
    </div>
  </div></div>`;
}

const VIEWS = {loading:vLoading, welcome:vWelcome, newpw:vNewPw, name:vName, join:vJoin, home:vHome, new:vNew, crew:vCrew, compose:vCompose, recap:vRecap, you:vYou};
const NAV_SCREENS = ['home', 'new', 'crew', 'recap', 'you'];
let lastKey = null;
function render(){
  const sc0 = app.querySelector('.screen'), key = U.screen + U.crew;
  if (key !== lastKey) SEEN = {};
  const keep = sc0 && lastKey === key ? sc0.scrollTop : 0;
  const hasNav = NAV_SCREENS.includes(U.screen);
  const focusId = document.activeElement && app.contains(document.activeElement) ? document.activeElement.id : null;
  app.innerHTML = VIEWS[U.screen]() + (hasNav ? nav() : '') + (U.sheet ? sheet() : '') + celebrateView() + (U.toast ? `<div class="toast ${U.sheet||U.celebrate?'top':hasNav?'':'nonav'}" role="status">${ic('rings')}<span>${esc(U.toast)}</span></div>` : '');
  const sc = app.querySelector('.screen'); if (sc) sc.scrollTop = keep;
  if (focusId){ const el = document.getElementById(focusId); if (el && el.tagName === 'INPUT') el.focus(); }
  lastKey = key;
  if (U.burst){ const b = U.burst; setTimeout(() => { if (U.burst === b) U.burst = null; }, 800); }
}
function go(s){ U.screen = s; U.addFriend = false; U.confirm = null; U.sheet = null; if (s !== 'recap') U.recapOnly = null; render(); }

/* ---------- check-in (optimistic, so the chain animates right away) ---------- */
function resultMsg(c, wasFull, prevPaused){
  const nowFull = fullDay(c, today(c));
  if (!wasFull && nowFull){ U.burst = c.id; return prevPaused ? 'Back on track. Chain restarted.' : `Everyone's in. Chain ${chainInfo(c).chain}!`; }
  return `You're in · ${doneToday(c)}/${c.members.length}`;
}
async function doCheckIn(c, mid){
  if (!mid && c.proof){ U.crew = c.id; U.compose = {photo:null, blob:null, note:''}; U.sheet = null; go('compose'); return; }
  const who = mid || me(c).id, t = today(c);
  const wasFull = fullDay(c, t), prevPaused = chainInfo(c).st[t - 1] === 'paused';
  (c.log[t] = c.log[t] || {})[who] = Date.now();
  U.sheet = null;
  const msg = resultMsg(c, wasFull, prevPaused);
  if (!celebrateFor(c, !mid)) toast(msg); render();
  try { await api.checkIn(c, who); await refresh(); }
  catch(e){ delete c.log[t][who]; toast(errText(e)); }
  render();
}

/* ---------- share ---------- */
async function shareInvite(c){
  const url = inviteUrl(c), text = `Join my crew "${c.name}" on Cadence Crews. ${c.len} days, together.`;
  try { if (navigator.share){ await navigator.share({title:'Join my crew', text, url}); return; } } catch(e){ if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(url); toast('Invite link copied'); } catch(e){ toast('Copy the link above to share it'); }
}

async function recapImage(c){
  try { await document.fonts.ready; } catch(e){}
  const w = weekStats(c), W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), mag = '#FF4FA3';
  g.fillStyle = '#141418'; g.fillRect(0, 0, W, H);
  const link = (x, y, lw, lh, sw, color, alpha, rot) => { g.save(); g.translate(x + lw/2, y + lh/2); g.rotate(rot || 0); g.globalAlpha = alpha == null ? 1 : alpha;
    g.strokeStyle = color; g.lineWidth = sw; g.beginPath(); g.roundRect(-lw/2, -lh/2, lw, lh, lh/2); g.stroke(); g.restore(); };
  const bar = (x, y, lw, bh, color, alpha) => { g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = color; g.beginPath(); g.roundRect(x, y - bh/2, lw, bh, bh/2); g.fill(); g.restore(); };
  g.save(); g.translate(760, 220); g.rotate(-0.55); for (let i = 0; i < 4; i++){ if (i % 2) bar(i * 150, 60, 200, 40, mag); else link(i * 150, 0, 200, 120, 30, mag); } g.restore();
  g.fillStyle = '#B4B6C2'; g.font = '600 38px Inter, sans-serif'; g.fillText(((finished(c) ? 'FINAL RECAP' : 'THIS WEEK') + ' · ' + c.name).toUpperCase().slice(0, 34), 90, 200);
  g.fillStyle = '#FFFFFF'; g.font = '800 300px "Bricolage Grotesque", Inter, sans-serif';
  const hit = String(w.hit); g.fillText(hit, 80, 900); const hw = g.measureText(hit).width;
  g.fillStyle = '#6A6D7A'; g.fillText('/' + w.slots, 80 + hw, 900);
  g.fillStyle = '#FFFFFF'; g.font = '700 60px Inter, sans-serif'; g.fillText('check-ins', 90, 990);
  const n = w.st.length, lw = 120, lh = 72, step = 92, sw = 18, y0 = 1100;
  w.st.forEach((s, i) => { const x = 90 + i * step, col = s === 'paused' ? '#5E6070' : s === 't' ? '#B4B6C2' : mag, a = s === 'saved' ? .45 : 1;
    if (i % 2 === 0) link(x, y0, lw, lh, sw, col, a, s === 'paused' ? -0.25 : 0); else bar(x, y0 + lh/2, lw, sw * 1.5, col, a); });
  const box = (x, label, val, color) => { g.fillStyle = '#2A2C35'; g.beginPath(); g.roundRect(x, 1300, 280, 200, 40); g.fill();
    let fs = 96; g.font = `800 ${fs}px "Bricolage Grotesque", Inter, sans-serif`;
    while (fs > 40 && g.measureText(val).width > 210){ fs -= 6; g.font = `800 ${fs}px "Bricolage Grotesque", Inter, sans-serif`; }
    g.fillStyle = color; g.fillText(val, x + 40, 1420);
    g.fillStyle = '#B4B6C2'; g.font = '500 36px Inter, sans-serif'; g.fillText(label, x + 40, 1470); };
  box(90, 'Day chain', String(w.info.chain), mag); box(400, 'Best', String(w.info.best), '#FFFFFF');
  box(710, 'First in most', w.early ? (w.early.you ? 'You' : first(w.early.name)).slice(0, 12) : '-', '#FFFFFF');
  c.members.slice(0, 8).forEach((m, i) => { g.fillStyle = m.you ? mag : m.color; g.beginPath(); g.arc(150 + i * 110, 1640, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141418'; g.font = '700 36px Inter, sans-serif'; g.textAlign = 'center'; g.fillText(initials(m.name), 150 + i * 110, 1653); g.textAlign = 'left'; });
  g.fillStyle = '#B4B6C2'; g.font = '600 38px Inter, sans-serif'; g.fillText('cadence crews · ' + inviteUrl(c).replace(/^https?:\/\//, '').slice(0, 44), 90, 1810);
  return new Promise(r => cv.toBlob(r, 'image/png'));
}
async function shareRecap(c){
  const blob = await recapImage(c); if (!blob){ toast("Couldn't make the image."); return; }
  const file = new File([blob], 'crew-recap.png', {type:'image/png'});
  try { if (navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:c.name + ' recap'}); return; } }
  catch(e){ if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'crew-recap.png'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Recap image saved');
}

/* ---------- theme ---------- */
function applyTheme(t){
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  ls.set('crews.theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = dark ? '#0E0F13' : '#F2F2F5';
}

/* ---------- after sign-in ---------- */
async function enter(){
  U.screen = 'loading'; render();
  try { await refresh(); }
  catch(e){ U.screen = 'welcome'; U.authErr = errText(e); render(); return; }
  api.live(softRefresh);
  if (!S.me.name){ U.screen = 'name'; render(); return; }
  if (U.invite){
    const already = S.crews.find(c => c.code === U.invite);
    if (already){ clearInvite(); U.crew = already.id; go('crew'); return; }
    if (!U.preview) U.preview = await api.preview(U.invite);
    const p = U.preview;
    if (U.autoJoin && p && !p.finished && p.count < MAX){
      U.autoJoin = false; U.screen = 'join'; render();
      const id = await act(() => api.join(U.invite, (p.members || []).map(m => m.color)), "You're in the crew");
      if (id){ clearInvite(); U.crew = id; go('crew'); return; }
    }
    U.autoJoin = false; go('join'); return;
  }
  const deep = new URLSearchParams(location.search).get('c');
  if (deep && crewById(deep)){ U.crew = deep; history.replaceState(null, '', location.pathname); go('crew'); return; }
  go('home');
}
function clearInvite(){ U.invite = null; U.preview = null; ls.del('crews.invite'); }

/* =====================================================================
   EVENTS
   ===================================================================== */
app.addEventListener('click', async e => {
  const b = e.target.closest('[data-a]'), stop = e.target.closest('[data-stop]');
  if (stop && (!b || (b !== stop && b.contains(stop)))) return;   // clicks inside a sheet or popup don't close it
  if (!b || b.disabled) return;
  const a = b.dataset.a, v = b.dataset.v;
  if (!['leave','delcrew','erase','delacct','delhabit'].includes(a)) U.confirm = null;
  const c = v ? crewById(v) : null;

  if (a === 'tab') go(v);
  else if (a === 'authmode'){ U.auth = v; U.authErr = ''; U.authMsg = ''; render(); }
  else if (a === 'crew'){ U.crew = v; U.compose = {photo:null, blob:null, note:''}; go('crew'); }
  else if (a === 'acc'){ const p = pending(); if (p.length === 1) doCheckIn(p[0]); else { U.sheet = {type:'checkin'}; render(); } }
  else if (a === 'closesheet'){ U.sheet = null; render(); }
  else if (a === 'checkin') doCheckIn(c);
  else if (a === 'friend'){        // demo: tap a test friend to check them in or out
    const mid = b.dataset.m;
    if (isDone(c, today(c), mid)){ await api.uncheck(c, mid); await refresh(); render(); }
    else doCheckIn(c, mid);
  }
  else if (a === 'addfriend'){ U.addFriend = !U.addFriend; render(); const f = document.getElementById('fn'); if (f) f.focus(); }
  else if (a === 'nudge') act(() => api.nudge(c), 'Nudged the crew');
  else if (a === 'invite') shareInvite(c);
  else if (a === 'notif'){
    ls.set('crews.asked', '1');
    if (v === 'yes'){ try { await api.pushOn(); ls.set('crews.push', 'on'); toast('Notifications on'); } catch(err){ toast(errText(err)); } }
    render();
  }
  else if (a === 'pushtoggle'){
    if (pushIsOn()){ try { await api.pushOff(); } catch(err){} ls.set('crews.push', 'off'); toast('Notifications off'); render(); }
    else { try { await api.pushOn(); ls.set('crews.push', 'on'); toast('Notifications on'); } catch(err){ toast(errText(err)); } render(); }
  }
  else if (a === 'noremind') act(() => api.setReminder(null), 'Reminder off');
  else if (a === 'post'){
    const k = U.compose, req = b.dataset.req === '1';
    if ((req && !k.photo) || (!k.photo && !k.note.trim())) return;
    const r = await act(async () => {
      await api.post(c, {note:k.note.trim(), photo:k.photo, blob:k.blob});
      if (req){ const wasFull = fullDay(c, today(c)), pp = chainInfo(c).st[today(c) - 1] === 'paused'; await api.checkIn(c); await refresh(); const m = resultMsg(c, wasFull, pp); return celebrateFor(crewById(c.id) || c, true) ? null : m; }
      return 'Posted';
    }, m => m);
    if (r !== undefined){ U.compose = {photo:null, blob:null, note:''}; if (req){ U.crew = c.id; go('crew'); } else render(); }
  }
  else if (a === 'cheer'){ const f = c.feed.find(x => x.id === b.dataset.m), on = !f.cheers.includes(me(c).id);
    f.cheers = on ? f.cheers.concat(me(c).id) : f.cheers.filter(x => x !== me(c).id); render();
    try { await api.cheer(c, f, on); } catch(err){ toast(errText(err)); } softRefresh(); }
  else if (a === 'postmenu'){ U.sheet = {type:'post', crew:v, post:b.dataset.m}; render(); }
  else if (a === 'delpost'){ const s = U.sheet, x = crewById(s.crew), f = x.feed.find(p => p.id === s.post); U.sheet = null; act(() => api.deletePost(x, f), 'Post deleted'); }
  else if (a === 'reportsheet'){ U.sheet = {...U.sheet, type:'report'}; render(); }
  else if (a === 'report'){ const s = U.sheet, x = crewById(s.crew), f = x.feed.find(p => p.id === s.post); U.sheet = null; act(() => api.report(x, f, v), 'Reported. Thanks for telling us.'); }
  else if (a === 'block'){ U.sheet = null; act(() => api.block(v), 'Blocked'); }
  else if (a === 'unblock') act(() => api.unblock(v), 'Unblocked');
  else if (a === 'tpl'){ const t = TEMPLATES[+v]; U.draft = {tpl:+v, name:t.name, rule:t.rule, len:t.len, mode:'daily', proof:false}; render();
    const s = document.getElementById('setup'); if (s) s.scrollIntoView({behavior:'smooth', block:'start'}); if (t.custom){ const n = document.getElementById('cn'); if (n) n.focus(); } }
  else if (a === 'len'){ if (v === 'custom'){ U.draft.customLen = true; render(); const el = document.getElementById('cl'); if (el){ el.focus(); el.select(); } } else { U.draft.customLen = false; U.draft.len = +v; render(); } }
  else if (a === 'dcolor'){ U.draft.color = v; render(); }
  else if (a === 'colorsheet'){ U.sheet = {type:'color', crew:v}; render(); }
  else if (a === 'setcolor'){ const x = crewById(U.sheet.crew); U.sheet = null; x.color = v; render(); act(() => api.setColor(x, v)); }
  else if (a === 'closecele'){ U.celebrate = null; render(); }
  else if (a === 'hkind'){ U.hkind = v; render(); const n = document.getElementById('hn'); if (n) n.focus(); }
  else if (a === 'hstats'){ U.sheet = {type:'hstats', habit:v}; render(); }
  else if (a === 'addhabit'){ U.sheet = {type:'habit'}; U.hkind = 'build'; render(); const n = document.getElementById('hn'); if (n) n.focus(); }
  else if (a === 'habit' || a === 'slip'){ const h = S.habits.find(x => x.id === v), t = hToday(), on = !h.marks.has(t);
    if (on) h.marks.add(t); else h.marks.delete(t); render();
    try { await api.markHabit(h, on); } catch(err){ toast(errText(err)); await refresh(); render(); } }
  else if (a === 'delhabit'){ if (U.confirm !== 'h' + v){ U.confirm = 'h' + v; render(); return; } U.confirm = null; act(() => api.deleteHabit(S.habits.find(x => x.id === v)), 'Habit deleted'); }
  else if (a === 'pref'){ const p = {...S.me.prefs, [v]: S.me.prefs[v] === false}; S.me.prefs = p; render(); act(() => api.setPrefs(p)); }
  else if (a === 'mode'){ U.draft.mode = v; render(); }
  else if (a === 'proof'){ U.draft.proof = !U.draft.proof; render(); }
  else if (a === 'create'){
    const d = U.draft; if (!d.name.trim()) return;
    const len = Math.min(365, Math.max(3, Math.round(+d.len || 14)));
    const id = await act(() => api.createCrew({name:d.name.trim(), rule:d.rule.trim(), len, mode:d.mode, proof:d.proof, color:d.color || CREW_COLORS[0].hi}), 'Crew created. Now invite your crew.');
    if (id){ U.draft = null; U.crew = id; go('crew'); }
  }
  else if (a === 'again'){ const id = await act(() => api.rerun(c), 'New round started'); if (id){ U.crew = id; go('crew'); } }
  else if (a === 'recap'){ U.recapOnly = v; U.screen = 'recap'; render(); }
  else if (a === 'share'){ U.celebrate = null; shareRecap(c); }
  else if (a === 'leave'){
    if (U.confirm !== 'leave'){ U.confirm = 'leave'; render(); return; }
    const x = crewById(U.crew); U.confirm = null; await act(() => api.leave(x), 'You left the crew'); go('home');
  }
  else if (a === 'delcrew'){
    if (U.confirm !== 'del'){ U.confirm = 'del'; render(); return; }
    const x = crewById(U.crew); U.confirm = null; await act(() => api.deleteCrew(x), 'Crew deleted'); go('home');
  }
  else if (a === 'join'){
    const code = U.invite, taken = (U.preview && U.preview.members || []).map(m => m.color);
    const id = await act(() => api.join(code, taken), "You're in the crew");
    if (id){ clearInvite(); U.crew = id; go('crew'); }
  }
  else if (a === 'nojoin'){ clearInvite(); go('home'); }
  else if (a === 'theme'){ applyTheme(v); render(); }
  else if (a === 'install'){
    if (installEvt){ installEvt.prompt(); try { await installEvt.userChoice; } catch(err){} installEvt = null; render(); }
    else { U.sheet = {type:'install'}; render(); }
  }
  else if (a === 'signout'){ await api.signOut(); S.crews = []; S.me = null; U.auth = 'in'; U.authErr = ''; U.authMsg = ''; go('welcome'); }
  else if (a === 'delacct'){
    if (U.confirm !== 'delacct'){ U.confirm = 'delacct'; render(); return; }
    U.confirm = null; U.busy = true; render();
    try { await api.deleteAccount(); ls.del('crews.push'); ls.del('crews.asked'); S.crews = []; S.me = null; U.busy = false; U.auth = 'up'; go('welcome'); toast('Your account was deleted'); }
    catch(err){ U.busy = false; toast(errText(err)); render(); }
  }
  else if (a === 'skipday'){ await api.skipDay(); await refresh(); toast('New day'); render(); }
  else if (a === 'erase'){
    if (U.confirm !== 'erase'){ U.confirm = 'erase'; render(); return; }
    U.confirm = null; await api.erase(); S.crews = []; S.me = null; go('welcome');
  }
});

app.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'note') U.compose.note = t.value;
  else if (t.id === 'cn'){ U.draft.name = t.value; const btn = app.querySelector('[data-a="create"]'); if (btn) btn.disabled = !t.value.trim(); }
  else if (t.id === 'cr') U.draft.rule = t.value;
  else if (t.id === 'cl') U.draft.len = t.value;
  else if (t.id === 'hn') U.hname = t.value;
});
app.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'ph' && t.files[0]){
    try { const r = await readImage(t.files[0]); U.compose.photo = r.dataUrl; U.compose.blob = r.blob; }
    catch(err){ toast("That file couldn't be read as a photo."); }
    render();
  } else if (t.id === 'yn'){
    const n = t.value.trim().slice(0, 24); if (!n || n === S.me.name){ t.value = S.me.name; return; }
    act(() => api.setName(n), 'Name saved');
  } else if (t.id === 'rt' && t.value){ act(() => api.setReminder(t.value), 'Reminder set for ' + t.value); }
});
app.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target.dataset.f, val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  if (f === 'auth'){
    const name = val('au-name'), email = val('au-email'), pw = (document.getElementById('au-pw') || {}).value || '';
    U.authErr = ''; U.authMsg = '';
    if ((U.auth === 'up' || DEMO) && !name){ U.authErr = 'Add your name.'; render(); return; }
    if (!DEMO && !/^\S+@\S+\.\S+$/.test(email)){ U.authErr = 'Enter a valid email.'; render(); return; }
    if (!DEMO && U.auth !== 'reset' && pw.length < 6){ U.authErr = 'Use at least 6 characters for your password.'; render(); return; }
    U.busy = true; render();
    try {
      if (U.auth === 'reset'){ await api.resetPassword(email); U.authMsg = 'Check your email for a reset link.'; U.busy = false; render(); return; }
      const r = DEMO || U.auth === 'up' ? await api.signUp(name, email, pw) : await api.signIn(email, pw);
      U.busy = false; U.autoJoin = !!U.preview;
      if (r === 'confirm'){ U.auth = 'in'; U.authMsg = 'Check your email to confirm your account, then sign in.'; render(); return; }
      enter();
    } catch(err){ U.busy = false; U.authErr = errText(err); render(); }
  }
  else if (f === 'newpw'){
    const pw = (document.getElementById('np') || {}).value || '';
    if (pw.length < 6){ U.authErr = 'Use at least 6 characters.'; render(); return; }
    U.busy = true; render();
    try { await api.updatePassword(pw); U.busy = false; U.authErr = ''; toast('Password saved'); enter(); }
    catch(err){ U.busy = false; U.authErr = errText(err); render(); }
  }
  else if (f === 'name'){ const n = val('nm').slice(0, 24); if (!n) return; await act(() => api.setName(n)); if (S.me.name) enter(); }
  else if (f === 'habit'){ const n = val('hn').slice(0, 40); if (!n) return; U.sheet = null; U.hname = ''; await act(() => api.addHabit(n, U.hkind), U.hkind === 'build' ? 'Habit added' : 'Counting days clean from today'); }
  else if (f === 'friend'){ const n = val('fn'); if (!n) return; U.addFriend = false; act(() => api.addFriend(crewById(U.crew), n)); }
});

/* keep things fresh: new day at midnight, other phones' check-ins, coming back to the app */
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.loaded && NAV_SCREENS.includes(U.screen)) softRefresh(); });
let lastDayKey = null;
setInterval(() => { const k = tzIdx(MY_TZ); if (lastDayKey !== null && k !== lastDayKey && S.loaded) softRefresh(); lastDayKey = k; }, 30e3);
if (matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(ls.get('crews.theme') || 'system'));

/* ---------- start ---------- */
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
applyTheme(ls.get('crews.theme') || 'system');
(async () => {
  const q = new URLSearchParams(location.search);
  const code = q.get('j');
  if (code){ ls.set('crews.invite', code.toLowerCase().slice(0, 16)); history.replaceState(null, '', location.pathname + (q.get('c') ? '?c=' + q.get('c') : '')); }
  U.invite = ls.get('crews.invite');
  render();
  let session = null;
  try { session = await api.start(); }
  catch(e){ U.screen = 'welcome'; U.authErr = "Can't reach the server. Check your connection and reload."; render(); return; }
  if (U.invite && !DEMO) U.preview = await api.preview(U.invite);
  if (U.screen === 'newpw') return;
  if (session) enter(); else { U.auth = U.invite ? 'up' : 'up'; go('welcome'); }
})();
})();
