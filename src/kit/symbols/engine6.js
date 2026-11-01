// Отрисовка тактических знаков на canvas — перенесено из СКАТ 6.x без изменения логики
// (точечные знаки и линейные/площадные по Приложению 3). Типы — engine6.d.ts.
// Изменения: при зеркальном отражении (o.mx) текст внутри знака не зеркалится;
// у линейных знаков sp.flip переносит зубцы и метки на другую сторону линии,
// sp.flipA / sp.flipB — отдельно узел в начале и в конце (полудужья разгранлиний: включительно / исключительно).
/* eslint-disable */
import SYM_DEF from './symbols6.json';

export { SYM_DEF };
export const SCOL = {k:'#111111', b:'#1f5fe0', r:'#e0302a', y:'#f2d21b', w:'#ffffff', g:'#00d84a'};
export const SIDES = {r:{name:'Красные', color:'#e0302a', pre:'К'}, b:{name:'Синие', color:'#1f5fe0', pre:'С'}};
export const SYM_BY = Object.fromEntries(SYM_DEF.map((s) => [s.id, s]));
const symPaths = {};
function mkP(d){ const p = new Path2D(d); p._d = d; return p; }
const symC = (k, c) => !k ? c : k === 'y' ? SCOL.y : k === 'w' ? '#ffffff' : k === 'k' ? SCOL.k : k === 'g' ? SCOL.g : k === 'b' ? SIDES.b.color : SIDES.r.color;
export function symCol(sid, side, def){ const s = SYM_BY[sid]; if (!s) return def; return side === 'r' ? (s.cR || SIDES.r.color) : side === 'b' ? (s.cB || SIDES.b.color) : def; }
export function drawSym(g, sid, x, y, color, fc, rot, sc, o){
const s = SYM_BY[sid]; if (!s) return;
if (!symPaths[sid]) symPaths[sid] = {d:s.d.map(mkP), f:(s.f || []).map(mkP), z:(s.z || []).map(mkP)};
const P = symPaths[sid], dk = s.dk || [], fk = s.fk || [], cc = k => symC(k, color);
g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sc) g.scale(sc, sc); if (o && o.mx) g.scale(-1, 1); g.translate(-16, -16); g.lineCap = 'round'; g.lineJoin = 'round';
g.strokeStyle = '#fff'; g.lineWidth = 6; P.d.forEach(v => g.stroke(v)); P.f.forEach(v => g.stroke(v));
if (fc){ g.fillStyle = fc; P.z.forEach(v => g.fill(v)); }
P.f.forEach((v, i) => { if (fk[i] === 'y'){ g.fillStyle = SCOL.y; g.fill(v); } });
g.lineWidth = (o && o.lw) || 2.6; if (o && o.dash) g.setLineDash([3, 2.5]); P.d.forEach((v, i) => { g.strokeStyle = cc(dk[i]); g.stroke(v); }); g.setLineDash([]);
P.f.forEach((v, i) => { if (fk[i] !== 'y'){ g.fillStyle = cc(fk[i]); g.fill(v); } });
(s.tx || []).forEach(t => { g.font = `700 ${t.s}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#fff'; const mx = o && o.mx; if (mx){ g.save(); g.translate(t.x, t.y); g.scale(-1, 1); } const tx = mx ? 0 : t.x, ty = mx ? 0 : t.y; g.strokeText(t.t, tx, ty); g.fillStyle = cc(t.c); g.fillText(t.t, tx, ty); if (mx) g.restore(); });
g.restore();
}
export const LSPEC = {
rub_obor:{n:'Рубеж обороны (не занятый)', base:'braces'},
trench:{n:'Траншея', base:'solid', marks:[{t:'trench', step:16}]},
ogn_t:{n:'Огневой рубеж (танки)', base:'dash', ends:['T', 'sym:tank']},
ogn_b:{n:'Огневой рубеж (БМП)', base:'dash', ends:['T', 'sym:bmp']},
razv_pt:{n:'Рубеж развёртывания ПТ взвода', base:'dash', ends:{a:['T', 'sym:ptrk'], b:['T', 'sym:ptp']}},
ataki:{n:'Рубеж перехода в атаку', base:'dash', ends:['T'], marks:[{t:'stubA', n:1}]},
ataki_b:{n:'Рубеж перехода в атаку (на БМП)', base:'dash', ends:['T', 'sym:bmp'], marks:[{t:'stubA', n:1}]},
gr1:{n:'Граница полосы огня (основной)', base:'solid', ends:{a:['arrow'], b:['dot']}},
gr2:{n:'Граница полосы огня (дополнительный)', base:'dash', ends:{a:['arrow'], b:['dot']}},
otkr1:{n:'Рубеж открытия огня ПТУР', base:'dash', ends:['chev'], marks:[{t:'chev', n:1}]},
otkr2:{n:'Рубеж открытия огня танков', base:'dash', ends:['tx'], marks:[{t:'tx', n:1}]},
otkr3:{n:'Рубеж открытия огня БМП', base:'dash', ends:['x'], marks:[{t:'x', n:1}]},
otkr4:{n:'Рубеж открытия огня стр. оружия', base:'dash', ends:['tT'], marks:[{t:'tT', n:1}]},
zagr:{n:'Рубеж заградительного огня', base:'solid', ends:['Tf'], marks:[{t:'tf', n:2}]},
nzo:{n:'Неподвижный заградительный огонь', base:'solid', ends:['T']},
front:{n:'Фронт сторон (синий/красный)', base:'solid', pair:5, ends:['hookA']},
polozh:{n:'Положение к времени', base:'solid', ends:['hook'], mid:{t:'arrow'}},
polozh_x:{n:'Положение к времени (крестики)', base:'solid', ends:['hook'], mid:{t:'arrow'}, marks:[{t:'x2', step:9, off:-6, sk:6}]},
polozh_d:{n:'Положение к времени (пунктир)', base:'solid', ends:['hook'], mid:{t:'arrow'}, inner:{off:-6, dash:[4, 3]}},
blizh:{n:'Ближайшая задача (бат.)', base:'dash', ends:['hook'], mid:{t:'arrow', ticks:3}},
blizh_r:{n:'Ближайшая задача (рота)', base:'dash', ends:['hook'], mid:{t:'arrow', ticks:2}},
blizh_v:{n:'Ближайшая задача (взвод)', base:'dash', ends:['hook'], mid:{t:'arrow', ticks:1}},
blizh_b:{n:'Ближайшая задача (на БМП)', base:'dash', ends:['sym:bmp'], mid:{t:'arrow', ticks:3}},
daln:{n:'Дальнейшая задача', base:'dash', dbl:2.5, ends:['hook'], mid:{t:'arrow', ticks:3}},
spesh:{n:'Рубеж спешивания', base:'dash', ends:['T'], marks:[{t:'stubT', n:2}]},
posad:{n:'Рубеж посадки десантом на танки', base:'dash', ends:['T', 'sym:tank'], marks:[{t:'stubT', n:2}]},
razv_k:{n:'Рубеж развёртывания в колонны', base:'dash', ends:['T'], marks:[{t:'stub3', n:1}]},
iskh:{n:'Исходный рубеж, рубеж регулирования', base:'dash', ends:['T']},
morsk:{n:'Участок высадки морского десанта', base:'dash', ends:['T'], marks:[{t:'bar', n:3}]},
rg1:{n:'Разгранлиния дивизий (бригад)', base:'solid', ends:['U']},
rg2:{n:'Разгранлиния полков', base:'dashdot', ends:['U']},
rg3:{n:'Разгранлиния батальонов', base:'dash', ends:['U']},
vstr:{n:'Рубеж вероятной встречи', base:'dash', pair:5, ends:['T']},
kol:{n:'Походная колонна (бат.)', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16, 20, 24]}]},
kol_r:{n:'Походная колонна (рота)', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16, 20]}]},
kol_v:{n:'Походная колонна (взвод)', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16]}]},
kol_b:{n:'Колонна роты на БМП', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16, 20]}], mid:{t:'sym:bmp', along:1}},
kol_t:{n:'Колонна роты танковой', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16, 20]}], mid:{t:'sym:tank', along:1}},
kol_a:{n:'Колонна артдивизиона', base:'solid', ends:{a:['arrow']}, marks:[{t:'tx', at:[16, 20, 24]}], mid:{t:'sym:art', along:1}},
koch:{n:'Кочующий танк (маршрут)', base:'dash', ends:['curl'], mid:{t:'sym:tank'}},
patrul:{n:'Пешие патрульные (маршрут)', base:'dash', ends:['curl'], mid:{t:'ring', r:6}},
bezop:{n:'Рубеж безопасного удаления', base:'dash', ends:['zig']},
aeroz:{n:'Рубеж постановки аэрозольной завесы', base:'dash', ends:['T'], marks:[{t:'V', n:2}]},
minir:{n:'Рубеж минирования', base:'dashdot2', ends:['T']},
wire:{n:'Проволочное заграждение', base:'zigzag', amp:4, lam:22, marks:[{t:'hash2', step:44}]},
ezhi:{n:'Заграждение из ежей', base:'none', marks:[{t:'ezh', step:16}]},
eskarp:{n:'Эскарп (контрэскарп)', base:'zigzag', amp:5, lam:44},
spiral:{n:'Малозаметное заграждение (спираль)', base:'loops'},
rov:{n:'Противотанковый ров', base:'dash', side:6},
nadolb:{n:'Надолбы', base:'none', marks:[{t:'nadolb', step:8}]},
zaval:{n:'Минированный завал', base:'none', marks:[{t:'zaval', step:26}]},
marsh:{n:'Маршрут движения', base:'solid', mid:{t:'ring', r:7}, marks:[{t:'tn', at:[30]}]},
// площадные
a_obor:{n:'Район обороны (засечки наружу)', area:1, base:'solid', out:1, marks:[{t:'tn', step:20}]},
a_rayon:{n:'Район подразделения', area:1, base:'solid', fillOp:1},
a_vys:{n:'Район высадки, форсирования (пунктир)', area:1, base:'dash', fillOp:1},
a_mpt:{n:'Минное поле ПТ', area:1, base:'solid', fill:'dots'},
a_mpp:{n:'Минное поле ПП', area:1, base:'solid', fill:'rings'},
a_ov:{n:'Заражённый ОВ (жёлтая заливка)', area:1, base:'solid', fill:'y'},
a_bio:{n:'Заражённый биосредствами (штриховка)', area:1, base:'solid', fill:'hatch'},
a_opdiv:{n:'Район ОП артдивизиона (батареи в вершинах)', area:1, base:'none', verts:'bat_art'}};

function ldd(P){ return P.filter((q, i) => !i || Math.hypot(q.x - P[i-1].x, q.y - P[i-1].y) > 0.01); }
function lgeo(P){ const S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i-1] + Math.hypot(P[i].x - P[i-1].x, P[i].y - P[i-1].y)); return S; }
function lnAt(P, S, s){ const T = S[S.length-1]; s = Math.max(0, Math.min(T, s)); let i = 1; while (i < S.length - 1 && S[i] < s) i++;
const a = P[i-1], b = P[i], L0 = (S[i] - S[i-1]) || 1, t = (s - S[i-1]) / L0, ux = (b.x - a.x) / L0, uy = (b.y - a.y) / L0;
return {x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t, ux, uy, nx:-uy * FLIP, ny:ux * FLIP}; }
function loff(P, o){ if (!o) return P; o *= FLIP; return P.map((q, i) => { const a = P[Math.max(0, i-1)], b = P[Math.min(P.length-1, i+1)], L0 = Math.hypot(b.x - a.x, b.y - a.y) || 1; return {x:q.x - (b.y - a.y) / L0 * o, y:q.y + (b.x - a.x) / L0 * o}; }); }
function lpath(g, P, c, w, dash){ if (P.length < 2) return; g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.stroke(); g.setLineDash([]); }
function lseg(g, L, c, w){ g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]); g.beginPath(); L.forEach(s => s.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.stroke(); }
function lfill(g, pts, c){ g.fillStyle = c; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); }
function lcirc(g, x, y, r, c, w, fill){ g.beginPath(); g.arc(x, y, r, 0, 7); if (fill){ g.fillStyle = fill; g.fill(); } if (w){ g.strokeStyle = c; g.lineWidth = w; g.stroke(); } }
function lsym(g, id, p, k, c, rot){ if (typeof drawSym === 'function' && SYM_BY[id]) drawSym(g, id, p.x, p.y, c, null, rot ?? Math.atan2(p.uy, p.ux) - Math.PI / 2, (rot === undefined ? 0.75 : 1.05) * k); }
function lbase(g, P, S, c, k, sp){ const w = 3 * k, b = sp.base, T = S[S.length-1];
if (b === 'none') return;
if (b === 'solid') return lpath(g, P, c, w);
if (b === 'dash') return lpath(g, P, c, w, [10 * k, 7 * k]);
if (b === 'dashdot') return lpath(g, P, c, w, [16 * k, 6 * k, 2 * k, 6 * k]);
if (b === 'dashdot2') return lpath(g, P, c, w, [9 * k, 6 * k, 1 * k, 6 * k]);
if (b === 'zigzag'){ const out = [], lam = (sp.lam || 22) * k, amp = (sp.amp || 4) * k; let sg = 1; for (let s = 0; s <= T + 0.1; s += lam / 2){ const p = lnAt(P, S, s); out.push({x:p.x + p.nx * amp * sg, y:p.y + p.ny * amp * sg}); sg = -sg; } return lpath(g, out, c, w); }
if (b === 'loops'){ const out = [], d = 7 * k, r = 6 * k; for (let t = 0; ; t += 0.25){ const s = d * t / (2 * Math.PI) - r * 0.75 * Math.sin(t); if (s > T) break; const p = lnAt(P, S, Math.max(0, s)), o = -r * (1 - Math.cos(t)); out.push({x:p.x + p.nx * o, y:p.y + p.ny * o}); } return lpath(g, out, c, w * 0.8); }
if (b === 'braces'){ const seg = 26 * k, gap = 7 * k, L = [];
for (let s0 = 0; s0 + seg * 0.5 < T; s0 += seg + gap){ const s1 = Math.min(T, s0 + seg), cv = [];
for (let i = 0; i <= 12; i++){ const s = s0 + (s1 - s0) * i / 12, p = lnAt(P, S, s), o = -Math.sin(Math.PI * i / 12) * 5 * k; cv.push([p.x + p.nx * o, p.y + p.ny * o]); }
L.push(cv); [s0, s1].forEach(s => { const p = lnAt(P, S, s); L.push([[p.x, p.y], [p.x + p.nx * 7 * k + p.ux * (s === s0 ? -2 : 2) * k, p.y + p.ny * 7 * k + p.uy * (s === s0 ? -2 : 2) * k]]); }); }
return lseg(g, L, c, w); } }
function lmark(g, t, p, c, k, m, idx){ const G = (a, b) => [p.x + p.ux * a + p.nx * b, p.y + p.uy * a + p.ny * b], h = 7 * k, w = 2.4 * k, q = 4 * k;
switch (t){
case 'tn': return lseg(g, [[G(0, 0), G(0, h)]], c, w);
case 'tf': return lseg(g, [[G(0, 0), G(0, -h)]], c, w);
case 'tx': return lseg(g, [[G(0, -h), G(0, h)]], c, w);
case 'x': return lseg(g, [[G(-q, -q), G(q, q)], [G(-q, q), G(q, -q)]], c, w);
case 'x2': return lseg(g, [[G(-2.5 * k, -2.5 * k), G(2.5 * k, 2.5 * k)], [G(-2.5 * k, 2.5 * k), G(2.5 * k, -2.5 * k)]], c, 1.8 * k);
case 'chev': return lseg(g, [[G(-q, h), G(0, 0), G(q, h)]], c, w);
case 'tT': return lseg(g, [[G(0, -h * .5), G(0, h)], [G(-3 * k, h), G(3 * k, h)]], c, w);
case 'V': return lseg(g, [[G(-q, -h), G(0, 0), G(q, -h)]], c, w);
case 'hash2': return lseg(g, [[G(-4 * k, -h), G(-1 * k, h)], [G(1 * k, -h), G(4 * k, h)]], c, w);
case 'trench': return lseg(g, [[G(-3 * k, h), G(0, 0), G(3 * k, h)]], c, w);
case 'ring': return lcirc(g, p.x, p.y, (m.r || 3.6) * k, c, w, '#fff');
case 'dot': return lcirc(g, p.x, p.y, 3.6 * k, c, 0, c);
case 'bar': return lseg(g, [[G(-6 * k, 0), G(6 * k, 0)]], c, 6 * k);
case 'ezh': return lseg(g, [[G(-5 * k, -5 * k), G(5 * k, 5 * k)], [G(-5 * k, 5 * k), G(5 * k, -5 * k)]], c, 2.8 * k);
case 'nadolb': return lseg(g, [[G(-3 * k, -h), G(3 * k, h)]], c, w);
case 'zaval': { const sg = idx % 2 ? 1 : -1; lseg(g, [[G(-12 * k, 0), G(3 * k, 0)], [G(-3 * k, -5 * k), G(3 * k, 0), G(-3 * k, 5 * k)]], c, w); const z = G(-6 * k, 6.5 * k * sg); return lcirc(g, z[0], z[1], 2.6 * k, c, 1.8 * k, '#fff'); }
case 'stubT': return lseg(g, [[G(0, 0), G(0, h)], [G(-3 * k, h * .5), G(3 * k, h * .5)]], c, w);
case 'stubA': lseg(g, [[G(0, 0), G(0, 2 * h)], [G(-3 * k, h * .6), G(3 * k, h * .6)]], c, w); return lfill(g, [G(0, 2 * h + 5 * k), G(-3.5 * k, 2 * h - 2 * k), G(3.5 * k, 2 * h - 2 * k)], c);
case 'stub3': return lseg(g, [[G(0, 0), G(0, 2.4 * h)], [G(-3 * k, h * .9), G(3 * k, h * .9)], [G(-3 * k, h * 1.35), G(3 * k, h * 1.35)], [G(-3 * k, h * 1.8), G(3 * k, h * 1.8)]], c, w);
case 'arrow': { const L = 4 * h; lseg(g, [[G(0, 0), G(0, L)]], c, w); lfill(g, [G(0, L + 7 * k), G(-4 * k, L - 2 * k), G(4 * k, L - 2 * k)], c);
const ts = []; for (let i = 0; i < (m.ticks || 0); i++){ const b = L * 0.45 + i * 3.6 * k; ts.push([G(-3.5 * k, b), G(3.5 * k, b)]); } return ts.length && lseg(g, ts, c, w); } }
if (t.startsWith('sym:')) lsym(g, t.slice(4), p, k, c, m.along ? Math.atan2(p.uy, p.ux) : undefined); }
function lend(g, e, typ, c, k, side, P, S, atA){ const F = (a, b) => [e.x + e.ox * a + e.nx * b, e.y + e.oy * a + e.ny * b], h = 7 * k, w = 3 * k;
switch (typ){
case 'T': return lseg(g, [[F(0, -h), F(0, h)]], c, w);
case 'Tf': return lseg(g, [[F(0, 0), F(0, -h)]], c, w);
case 'U': { const r = 6 * k, L = []; for (let i = 0; i <= 12; i++){ const t = Math.PI * i / 12; L.push(F(r - r * Math.cos(t), r * Math.sin(t))); } return lseg(g, [L], c, w); }
case 'arrow': return lfill(g, [F(5 * k, 0), F(-11 * k, -5 * k), F(-11 * k, 5 * k)], c);
case 'dot': return lcirc(g, ...F(1 * k, 0), 4 * k, c, 0, c);
case 'zig': return lseg(g, [[F(0, 0), F(3 * k, 6 * k), F(6 * k, 0), F(9 * k, 6 * k), F(12 * k, 0)]], c, w * .85);
case 'hook': case 'hookA': { const sd = typ === 'hook' ? -1 : side, r = 7 * k, L = []; for (let i = 0; i <= 10; i++){ const t = Math.PI * 0.55 * i / 10; L.push(F(r * Math.sin(t), sd * (r - r * Math.cos(t)))); } return lseg(g, [L], c, w); }
case 'curl': { const sd = atA ? 1 : -1, r = 5 * k, L = []; for (let i = 0; i <= 14; i++){ const t = Math.PI * i / 14; L.push(F(r * Math.sin(t), sd * (r - r * Math.cos(t)))); } lseg(g, [L], c, w);
const tp = F(-3 * k, 2 * r * sd); return lseg(g, [[F(1 * k, 2 * r * sd - 3 * k), tp, F(1 * k, 2 * r * sd + 3 * k)]], c, w); }
case 'tx': case 'x': case 'chev': case 'tT': { const p = lnAt(P, S, atA ? 3 * k : S[S.length-1] - 3 * k); return lmark(g, typ, p, c, k, {}, 0); } }
if (typ.startsWith('sym:')){ const p = lnAt(P, S, atA ? 13 * k : S[S.length-1] - 13 * k); lsym(g, typ.slice(4), p, k, c); } }
function decorOne(g, P, c, k, sp, side){ const S = lgeo(P), T = S[S.length-1]; if (T < 1) return;
lbase(g, P, S, c, k, sp);
if (sp.side){ lpath(g, loff(P, sp.side * k), c, 3 * k); lpath(g, loff(P, -sp.side * k), c, 3 * k); }
if (sp.inner) lpath(g, loff(P, sp.inner.off * k), c, 1.6 * k, sp.inner.dash.map(v => v * k));
(sp.marks || []).forEach(m => { let pos = [];
if (m.at) pos = m.at.map(v => v * k); else if (m.n) for (let i = 1; i <= m.n; i++) pos.push(T * i / (m.n + 1)); else { const st = m.step * k; for (let s = st / 2; s < T; s += st) pos.push(s); }
pos.forEach((s, i) => { const p = lnAt(P, S, s); if (m.off){ p.x += p.nx * m.off * k; p.y += p.ny * m.off * k; } lmark(g, m.t, p, c, k, m, i); }); });
if (sp.mid) lmark(g, sp.mid.t, lnAt(P, S, T / 2), c, k, sp.mid, 0);
if (!sp.area && sp.ends){ const E = Array.isArray(sp.ends) ? {a:sp.ends, b:sp.ends} : sp.ends;
const pa = lnAt(P, S, 0), pb = lnAt(P, S, T);
const fa = sp.flipA ? -1 : 1, fb = sp.flipB ? -1 : 1;
(E.a || []).forEach(t => lend(g, {x:pa.x, y:pa.y, ox:-pa.ux, oy:-pa.uy, nx:pa.nx * fa, ny:pa.ny * fa}, t, c, k, side * fa, P, S, true));
(E.b || []).forEach(t => lend(g, {x:pb.x, y:pb.y, ox:pb.ux, oy:pb.uy, nx:pb.nx * fb, ny:pb.ny * fb}, t, c, k, side * fb, P, S, false)); } }
let FLIP = 1;
function decorLine(g, P, c, k, sp){ FLIP = sp.flip ? -1 : 1; try { decorLine0(g, P, c, k, sp); } finally { FLIP = 1; } }
function decorLine0(g, P, c, k, sp){ P = ldd(P); if (P.length < 2) return; g.save();
if (sp.area && P.length > 3){ let A = 0; for (let i = 1; i < P.length; i++) A += P[i-1].x * P[i].y - P[i].x * P[i-1].y; if (sp.out && A > 0) P = P.slice().reverse();
if (sp.fill){ g.save(); g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y)); g.closePath();
if (sp.fill === 'y'){ g.fillStyle = SCOL.y; g.fill(); } else { g.clip(); let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; P.forEach(q => { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
if (sp.fill === 'hatch'){ const L = [], st = 7 * k, hh = y1 - y0; for (let x = x0 - hh; x < x1; x += st) L.push([[x, y1], [x + hh, y0]]); lseg(g, L, c, 1.5 * k); }
else { const st = 16 * k; let row = 0; for (let y = y0 + st / 2; y < y1; y += st, row++) for (let x = x0 + (row % 2 ? st : st / 2); x < x1; x += st) lcirc(g, x, y, 3.6 * k, c, sp.fill === 'rings' ? 2 * k : 0, sp.fill === 'rings' ? '#fff' : c); } }
g.restore(); } }
if (sp.pair){ decorOne(g, loff(P, sp.pair * k), SCOL.b, k, sp, 1); decorOne(g, loff(P, -sp.pair * k), c === SCOL.b ? SCOL.r : c, k, sp, -1); }
else if (sp.dbl){ decorOne(g, loff(P, -sp.dbl * k), c, k, sp, -1); decorOne(g, loff(P, sp.dbl * k), c, k, Object.assign({}, sp, {mid:null, marks:null}), 1); }
else decorOne(g, P, c, k, sp, 1);
if (sp.verts && typeof drawSym === 'function'){ const V = P.slice(0, -1), R = 13 * 0.9 * k, L = [];
V.forEach((a, i) => { const b = V[(i + 1) % V.length], d = Math.hypot(b.x - a.x, b.y - a.y); if (d > 2 * R) L.push([[a.x + (b.x - a.x) * R / d, a.y + (b.y - a.y) * R / d], [b.x - (b.x - a.x) * R / d, b.y - (b.y - a.y) * R / d]]); });
lseg(g, L, c, 3 * k); V.forEach(q => drawSym(g, sp.verts, q.x, q.y, c, null, 0, 0.9 * k)); }
g.restore(); }
export { decorLine };
