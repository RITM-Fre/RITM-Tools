// RITM Tools — core: i18n, hash routing, theme, search, recents, generic tool view.
import { tools } from './tools/registry.js';

const $ = s => document.querySelector(s);
const K = { lang: 'ritm_lang_v1', theme: 'ritm_theme_v1', rec: 'ritm_recent_tools_v1' };
const ls = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
// el(tag, props, ...children): children are text nodes, so user content is never parsed as HTML (XSS-safe)
const el = (tag, a = {}, ...kids) => { const e = Object.assign(document.createElement(tag), a); e.append(...kids); return e; };

let lang = ls.get(K.lang, null) || (navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fa');
let D = {};
const t = k => D[k] ?? k;
const fmt = n => new Intl.NumberFormat(lang == 'fa' ? 'fa-IR' : 'en-US', { maximumFractionDigits: 6 }).format(n);
const ctx = { t, fmt, get lang() { return lang; } };

function toast(msg, type = 'info') {
  const e = $('#toast'); e.textContent = msg; e.className = 'show ' + type;
  clearTimeout(toast.h); toast.h = setTimeout(() => { e.className = ''; }, 3000);
}

async function setLang(l) {
  try { D = await (await fetch(`i18n/${l}.json`)).json(); } catch { toast('Could not load language file', 'error'); return; }
  lang = l; ls.set(K.lang, l);
  const h = document.documentElement; h.lang = l; h.dir = l == 'fa' ? 'rtl' : 'ltr'; h.dataset.lang = l;
  document.querySelectorAll('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $('#q').placeholder = t('search'); $('#lang').textContent = l == 'fa' ? 'EN' : 'فا';
  route();
}

function meta(title, desc) {
  document.title = title + ' | RITM Tools';
  $('meta[name=description]').content = desc;
}

const grid = list => el('div', { className: 'grid' }, ...list.map(x =>
  el('a', { className: 'card', href: '#/' + x.id }, el('span', { className: 'ic' }, x.i),
    el('b', {}, `${fmt(x.n)}. ${t('tool.' + x.id + '.n')}`), el('small', {}, t('tool.' + x.id + '.d')))));

function home() {
  const q = $('#q').value.trim().toLowerCase(), app = $('#app');
  const match = x => !q || (t('tool.' + x.id + '.n') + ' ' + t('tool.' + x.id + '.d')).toLowerCase().includes(q);
  const list = tools.filter(match);
  if (!list.length) { app.append(el('p', { className: 'empty' }, '🔍 ' + t('empty'))); return; }
  const rec = ls.get(K.rec, []).map(id => tools.find(x => x.id == id)).filter(x => x && match(x));
  if (rec.length) app.append(el('h2', {}, t('recent')), grid(rec));
  for (const c of ['text', 'image', 'sec', 'daily', 'unit', 'web', 'extra']) {
    const l = list.filter(x => x.c == c);
    if (l.length) app.append(el('h2', {}, t('c.' + c)), grid(l));
  }
}

function page(id) {
  $('#app').append(back(), el('div', { className: 'tool' }, el('h1', {}, t(id)), el('p', {}, t(id + '.p'))));
  meta(t(id), t('desc'));
}

const back = () => el('p', {}, el('a', { href: '#/' }, (lang == 'fa' ? '→ ' : '← ') + t('back')));

function view(tool) {
  ls.set(K.rec, [tool.id, ...ls.get(K.rec, []).filter(i => i != tool.id)].slice(0, 5));
  const out = el('div', { className: 'out' + (tool.big ? ' big' : '') }), inputs = [];
  const run = async () => {
    out.replaceChildren(); out.classList.remove('err');
    try {
      const vals = Object.fromEntries(inputs.map(([k, i]) => [k, i.type == 'checkbox' ? i.checked : i.value]));
      const r = await tool.run(vals, ctx), o = typeof r == 'object' ? r : { s: r };
      out.append(el('pre', { dir: tool.ltr ? 'ltr' : 'auto' }, o.s));
      if (o.p != null) out.append(el('div', { className: 'bar' }, el('i', { style: `width:${o.p}%;background:hsl(${o.p * 1.2},70%,45%)` })));
      if (o.note) out.append(el('small', {}, o.note));
      out.append(el('p', {}, el('button', { className: 'btn', onclick: () =>
        navigator.clipboard.writeText(o.s).then(() => toast(t('copied'), 'success'), () => toast(t('e.fmt'), 'error')) }, t('copy'))));
    } catch (e) {
      const m = e.message?.startsWith('e.') ? e.message : 'e.fmt';
      out.classList.add('err'); out.textContent = t(m); toast(t(m), 'error');
    }
  };
  const rows = tool.f.map(f => {
    const id = 'f_' + f.k;
    const i = f.t == 'area' ? el('textarea', { rows: 6, maxLength: 100000 })
      : f.t == 'sel' ? el('select', {}, ...f.o.map(o => el('option', { value: o }, D['o.' + o] ?? o)))
      : el('input', { type: { num: 'number', chk: 'checkbox', color: 'color', text: 'text' }[f.t], step: 'any' });
    if (f.t == 'sel') i.selectedIndex = f.v ?? 0; else if (f.t == 'chk') i.checked = !!f.v; else if (f.v != null) i.value = f.v;
    i.id = id; i.dir = tool.ltr ? 'ltr' : 'auto'; inputs.push([f.k, i]);
    if (!tool.g) i.addEventListener('input', run);
    const lab = el('label', { htmlFor: id }, t('f.' + f.k));
    return el('div', { className: 'row' }, ...(f.t == 'chk' ? [i, lab] : [lab, i]));
  });
  $('#app').append(back(), el('div', { className: 'tool' }, el('h1', {}, `${tool.i} ${t('tool.' + tool.id + '.n')}`),
    el('p', {}, t('tool.' + tool.id + '.d')), ...rows, el('button', { className: 'btn', onclick: run }, t('run')), out));
  meta(t('tool.' + tool.id + '.n'), t('tool.' + tool.id + '.d'));
  if (tool.a) run();
}

function route() {
  const id = location.hash.replace('#/', ''), tool = tools.find(x => x.id == id);
  $('#app').replaceChildren();
  if (['about', 'contact', 'privacy'].includes(id)) page(id);
  else if (tool) view(tool);
  else { home(); meta(t('title'), t('desc')); }
}

// Theme
const root = document.documentElement;
const setTheme = x => { root.dataset.theme = x; ls.set(K.theme, x); };
setTheme(ls.get(K.theme, matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));
$('#theme').onclick = () => setTheme(root.dataset.theme == 'dark' ? 'light' : 'dark');
$('#lang').onclick = () => setLang(lang == 'fa' ? 'en' : 'fa');
$('#q').oninput = () => { if (location.hash.length > 2) location.hash = '#/'; else route(); };
$('#clr').onclick = () => { if (confirm(t('clear.q'))) { Object.values(K).forEach(k => localStorage.removeItem(k)); location.hash = '#/'; location.reload(); } };
// Mouse-reactive glow on cards
document.addEventListener('pointermove', e => {
  const c = e.target.closest?.('.card'); if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--x', e.clientX - r.left + 'px'); c.style.setProperty('--y', e.clientY - r.top + 'px');
});
addEventListener('hashchange', route);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(() => {});
setLang(lang);
