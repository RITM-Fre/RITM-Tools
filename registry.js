// Tool registry. Tool = {id, n: number, c: category, i: icon, f: fields, run(values, ctx)}
// Fields: {k: key, t: 'area'|'text'|'num'|'sel'|'chk'|'color', o: options, v: default}
// run returns string | {s, p?, note?} (or a Promise); throw Error('e.xxx') for translated errors.
// Names/descriptions live in i18n files as tool.<id>.n / tool.<id>.d
const num = v => { if (v === '' || !isFinite(v)) throw Error('e.num'); return +v; };
const rnd = n => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const need = s => { if (!s || !s.trim()) throw Error('e.empty'); return s; };
const text = { k: 'text', t: 'area' };

// Safe expression parser (no eval): + - * / % ^ ( ) sin cos tan sqrt log ln abs pi e
function calc(s) {
  const t = s.replace(/\s+/g, '').toLowerCase().match(/\d*\.?\d+|[a-z]+|[-+*/^()%]/g) || [];
  let i = 0;
  const F = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, log: Math.log10, ln: Math.log, abs: Math.abs };
  const C = { pi: Math.PI, e: Math.E };
  const ex = () => { let a = tm(); while (t[i] == '+' || t[i] == '-') a = t[i++] == '+' ? a + tm() : a - tm(); return a; };
  const tm = () => { let a = pw(); while ('*/%'.includes(t[i] || '#')) { const o = t[i++], b = pw(); a = o == '*' ? a * b : o == '/' ? a / b : a % b; } return a; };
  const pw = () => { const a = un(); return t[i] == '^' ? (i++, a ** pw()) : a; };
  const un = () => t[i] == '-' ? (i++, -un()) : t[i] == '+' ? (i++, un()) : at();
  const at = () => {
    const k = t[i++];
    if (k == '(') { const a = ex(); if (t[i++] != ')') throw 0; return a; }
    if (Object.hasOwn(F, k)) return F[k](at());
    if (Object.hasOwn(C, k)) return C[k];
    if (/^[\d.]/.test(k)) return +k;
    throw 0;
  };
  try { const r = ex(); if (i < t.length || !isFinite(r)) throw 0; return r; } catch { throw Error('e.fmt'); }
}

// Unit converter factory: U maps unit -> factor to the base unit
const unit = (id, n, i, U) => ({ id, n, c: 'unit', i, a: 1,
  f: [{ k: 'val', t: 'num', v: 1 }, { k: 'from', t: 'sel', o: Object.keys(U) }, { k: 'to', t: 'sel', o: Object.keys(U), v: 1 }],
  run: (v, x) => x.fmt(num(v.val) * U[v.from] / U[v.to]) });

const MORSE = '.-,-...,-.-.,-..,.,..-.,--.,....,..,.---,-.-,.-..,--,-.,---,.--.,--.-,.-.,...,-,..-,...-,.--,-..-,-.--,--..,-----,.----,..---,...--,....-,.....,-....,--...,---..,----.'.split(',');
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NAMES = { fa: ['علی', 'مریم', 'رضا', 'سارا', 'نیلوفر', 'امیر', 'هانیه', 'کیان', 'آرش', 'مینا', 'پارسا', 'نگار'],
  en: ['Liam', 'Emma', 'Noah', 'Olivia', 'Ava', 'Lucas', 'Mia', 'Ethan', 'Zoe', 'Leo', 'Nora', 'Owen'] };
const hex2 = b => b.toString(16).padStart(2, '0');

export const tools = [
  { id: 'counter', n: 1, c: 'text', i: '🔢', f: [text], run: (v, x) => {
    const s = need(v.text);
    return [['words', s.trim().split(/\s+/).length], ['chars', s.length],
      ['sent', (s.match(/[^.!?؟]+[.!?؟]*/g) || []).filter(a => a.trim()).length],
      ['paras', s.split(/\n\s*\n/).filter(a => a.trim()).length]].map(([k, n]) => x.t('r.' + k) + ': ' + x.fmt(n)).join('\n'); } },
  { id: 'case', n: 2, c: 'text', i: 'Aa', f: [text, { k: 'mode', t: 'sel', o: ['upper', 'lower', 'title', 'rev'] }], run: v => {
    const s = need(v.text);
    return { upper: s.toUpperCase(), lower: s.toLowerCase(), title: s.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()), rev: [...s].reverse().join('') }[v.mode]; } },
  { id: 'spaces', n: 3, c: 'text', i: '🧹', f: [text], run: v => need(v.text).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim() },

  { id: 'password', n: 6, c: 'sec', i: '🔑', g: 1, f: [{ k: 'len', t: 'num', v: 16 }, { k: 'sym', t: 'chk', v: 1 }, { k: 'sim', t: 'chk' }], run: (v, x) => {
    const L = num(v.len); if (!Number.isInteger(L) || L < 4 || L > 128) throw Error('e.range');
    let p = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + (v.sym ? '!@#$%^&*()-_=+[]{}?' : '');
    if (v.sim) p = p.replace(/[0O1lI|]/g, '');
    return { s: Array.from({ length: L }, () => p[rnd(p.length)]).join(''), note: x.t('r.entropy') + ': ' + x.fmt(Math.round(L * Math.log2(p.length))) + ' bit' }; } },
  { id: 'strength', n: 7, c: 'sec', i: '🛡️', ltr: 1, f: [{ k: 'pw', t: 'text' }], run: (v, x) => {
    const s = need(v.pw);
    const sc = Math.min(100, Math.min(s.length * 4, 40) + [/[a-z]/, /[A-Z]/, /\d/, /[^\w]/].filter(r => r.test(s)).length * 15);
    return { s: x.t(sc < 40 ? 'r.weak' : sc < 75 ? 'r.mid' : 'r.strong'), p: sc }; } },

  { id: 'calc', n: 8, c: 'daily', i: '🧮', ltr: 1, f: [{ k: 'expr', t: 'text' }], run: (v, x) => x.fmt(calc(need(v.expr))) },
  { id: 'random', n: 11, c: 'daily', i: '🎲', g: 1, f: [{ k: 'min', t: 'num', v: 1 }, { k: 'max', t: 'num', v: 100 }, { k: 'qty', t: 'num', v: 5 }, { k: 'uniq', t: 'chk' }], run: (v, x) => {
    const a = num(v.min), b = num(v.max), q = num(v.qty);
    if (![a, b, q].every(Number.isInteger)) throw Error('e.num');
    if (a > b || q < 1 || q > 1000 || (v.uniq && q > b - a + 1)) throw Error('e.range');
    const r = [], seen = new Set();
    while (r.length < q) { const n = a + rnd(b - a + 1); if (v.uniq && seen.has(n)) continue; seen.add(n); r.push(n); }
    return r.map(n => x.fmt(n)).join(', '); } },

  unit('length', 13, '📏', { m: 1, km: 1000, cm: .01, mm: .001, mi: 1609.344, ft: .3048, in: .0254 }),
  unit('weight', 14, '⚖️', { kg: 1, g: .001, lb: .45359237, oz: .028349523125 }),
  { id: 'temp', n: 15, c: 'unit', i: '🌡️', a: 1, f: [{ k: 'val', t: 'num', v: 20 }, { k: 'from', t: 'sel', o: ['C', 'F', 'K'] }, { k: 'to', t: 'sel', o: ['C', 'F', 'K'], v: 1 }], run: (v, x) => {
    const n = num(v.val), c = v.from == 'C' ? n : v.from == 'F' ? (n - 32) * 5 / 9 : n - 273.15;
    if (c < -273.15) throw Error('e.range');
    return x.fmt(v.to == 'C' ? c : v.to == 'F' ? c * 9 / 5 + 32 : c + 273.15); } },
  unit('volume', 16, '🧪', { L: 1, mL: .001, gal: 3.785411784, qt: .946352946, cup: .2365882365 }),

  { id: 'base64', n: 17, c: 'web', i: '🧬', ltr: 1, f: [text, { k: 'mode', t: 'sel', o: ['enc', 'dec'] }], run: v => {
    const s = need(v.text);
    try { return v.mode == 'enc' ? btoa(String.fromCharCode(...new TextEncoder().encode(s))) : new TextDecoder().decode(Uint8Array.from(atob(s.trim()), c => c.charCodeAt(0))); }
    catch { throw Error('e.fmt'); } } },
  { id: 'morse', n: 18, c: 'web', i: '📡', ltr: 1, f: [text, { k: 'mode', t: 'sel', o: ['enc', 'dec'] }], run: v => {
    const s = need(v.text);
    return v.mode == 'enc' ? [...s.toUpperCase()].map(c => c == ' ' ? '/' : MORSE[KEYS.indexOf(c)] || '?').join(' ')
      : s.trim().split(/\s+/).map(c => c == '/' ? ' ' : KEYS[MORSE.indexOf(c)] ?? '?').join(''); } },

  { id: 'hash', n: 21, c: 'extra', i: '#️⃣', ltr: 1, f: [text, { k: 'algo', t: 'sel', o: ['SHA-1', 'SHA-256', 'SHA-512'], v: 1 }], run: async v =>
    [...new Uint8Array(await crypto.subtle.digest(v.algo, new TextEncoder().encode(need(v.text))))].map(hex2).join('') },
  { id: 'url', n: 22, c: 'extra', i: '🔗', ltr: 1, f: [text, { k: 'mode', t: 'sel', o: ['enc', 'dec'] }], run: v => {
    try { return v.mode == 'enc' ? encodeURIComponent(need(v.text)) : decodeURIComponent(need(v.text)); } catch { throw Error('e.fmt'); } } },
  { id: 'json', n: 23, c: 'extra', i: '{ }', ltr: 1, f: [text, { k: 'mode', t: 'sel', o: ['pretty', 'min'] }], run: v => {
    let j; try { j = JSON.parse(need(v.text)); } catch { throw Error('e.fmt'); }
    return v.mode == 'min' ? JSON.stringify(j) : JSON.stringify(j, null, 2); } },
  { id: 'color', n: 24, c: 'extra', i: '🎨', a: 1, ltr: 1, f: [{ k: 'col', t: 'color', v: '#6c7bff' }], run: v => {
    const h = v.col, r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 510;
    const s = d ? d / 255 / (1 - Math.abs(2 * l - 1)) : 0;
    let H = !d ? 0 : mx == r ? ((g - b) / d) % 6 : mx == g ? (b - r) / d + 2 : (r - g) / d + 4;
    H = (H * 60 + 360) % 360;
    return `${h.toUpperCase()}\nrgb(${r}, ${g}, ${b})\nhsl(${Math.round(H)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`; } },
  { id: 'bmi', n: 25, c: 'extra', i: '❤️', f: [{ k: 'w', t: 'num' }, { k: 'h', t: 'num' }, { k: 'u', t: 'sel', o: ['metric', 'imp'] }], run: (v, x) => {
    const w = num(v.w), h = num(v.h); if (w <= 0 || h <= 0) throw Error('e.range');
    const b = v.u == 'imp' ? 703 * w / h / h : w / (h / 100) ** 2;
    return x.fmt(+b.toFixed(1)) + ' — ' + x.t(b < 18.5 ? 'r.under' : b < 25 ? 'r.normal' : b < 30 ? 'r.over' : 'r.obese'); } },
  { id: 'loan', n: 26, c: 'extra', i: '🏦', f: [{ k: 'amt', t: 'num' }, { k: 'rate', t: 'num', v: 12 }, { k: 'mon', t: 'num', v: 12 }], run: (v, x) => {
    const P = num(v.amt), r = num(v.rate) / 1200, n = num(v.mon);
    if (P <= 0 || n < 1 || r < 0) throw Error('e.range');
    const m = r ? P * r / (1 - (1 + r) ** -n) : P / n, R = z => x.fmt(Math.round(z * 100) / 100);
    return x.t('r.monthly') + ': ' + R(m) + '\n' + x.t('r.total') + ': ' + R(m * n); } },
  { id: 'name', n: 27, c: 'extra', i: '🪪', g: 1, f: [{ k: 'qty', t: 'num', v: 5 }], run: (v, x) => {
    const q = num(v.qty); if (!Number.isInteger(q) || q < 1 || q > 50) throw Error('e.range');
    const L = NAMES[x.lang]; return Array.from({ length: q }, () => L[rnd(L.length)]).join('\n'); } },
  { id: 'dice', n: 28, c: 'extra', i: '🪙', g: 1, big: 1, f: [{ k: 'mode', t: 'sel', o: ['dice', 'coin'] }], run: (v, x) => {
    if (v.mode == 'dice') { const r = rnd(6); return '⚀⚁⚂⚃⚄⚅'[r] + ' ' + x.fmt(r + 1); }
    return '🪙 ' + x.t(rnd(2) ? 'r.heads' : 'r.tails'); } },
];
