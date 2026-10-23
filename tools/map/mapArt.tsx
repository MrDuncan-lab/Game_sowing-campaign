/** @jsxImportSource preact */
// The painted base of the region map, rendered once to src/assets/map-base.webp (see render.cjs).
// An antique hand-coloured map on parchment: ink linework with a slight hand wobble, colour washes that
// sink into the paper (multiply), engraved waterlines along the coast, mountains in rows from back to front.
import type { JSX } from 'preact';
import { RAILWAY, SEA, MILL_HUB, MAP_PINS } from '../../src/art/mapLayout';

const INK = '#3d2a1b';
const INK2 = '#5a4030';
const rnd = (i: number) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
type Pt = [number, number];

// ---------- splines ----------
function sample(pts: Pt[], per = 10): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const line = (pts: Pt[]) => 'M' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L');
function ribbon(pts: Pt[], w0: number, w1: number) {
  const s = sample(pts, 12), L: Pt[] = [], R: Pt[] = [];
  s.forEach((p, i) => {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(s.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const t = i / (s.length - 1), w = (w0 + (w1 - w0) * Math.pow(t, 1.3)) / 2 * (1 + .12 * Math.sin(i * .9));
    L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
  });
  return line(L) + ' L' + R.reverse().map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L') + ' Z';
}
function River({ pts, w0, w1 }: { pts: Pt[]; w0: number; w1: number }) {
  const d = ribbon(pts, w0, w1);
  return <g>
    <path d={d} fill="#8fb9bf" stroke={INK} stroke-width={.7} stroke-linejoin="round" />
    <path d={line(sample(pts, 12))} fill="none" stroke="#d9ece6" stroke-width={Math.max(.4, w1 * .16)} stroke-linecap="round" opacity={.9} stroke-dasharray="3 4" />
  </g>;
}

// ---------- nature ----------
function Mountain({ x, base, h, w, seed, snow = 0, far = false }: { x: number; base: number; h: number; w: number; seed: number; snow?: number; far?: boolean }) {
  // the ridge: a jagged profile under a skewed envelope, so no two mountains look alike
  const n = 12, peakT = .36 + rnd(seed) * .28, x0 = x - w / 2;
  const prof: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env = t < peakT ? Math.pow(t / peakT, 1.2) : Math.pow((1 - t) / (1 - peakT), 1.05);
    const jag = i > 0 && i < n ? (rnd(seed + i * 3) - .5) * .32 : 0;
    prof.push([x0 + w * t, base - h * Math.max(0, env * (1 + jag))]);
  }
  const top = sample(prof, 6);
  let pk = 0; top.forEach((p, i) => { if (p[1] < top[pk][1]) pk = i; });
  const P = top[pk], foot: Pt = [P[0] + w * .14, base];
  const sil = line(top) + ` L${x0 + w} ${base} L${x0} ${base} Z`;
  const ridgeMid: Pt = [P[0] + w * .03 + (rnd(seed + 40) - .5) * w * .05, P[1] + (base - P[1]) * .55];
  const ridge = `M${P[0]} ${P[1]} Q${ridgeMid[0]} ${ridgeMid[1]} ${foot[0]} ${foot[1]}`;
  const dark = line(top.slice(pk)) + ` L${x0 + w} ${base} L${foot[0]} ${foot[1]} Q${ridgeMid[0]} ${ridgeMid[1]} ${P[0]} ${P[1]} Z`;
  const id = `mt${seed}`;
  const hatch: JSX.Element[] = [];
  for (let i = -14; i < 40; i++) { const hx = P[0] - w * .1 + i * 1.7; hatch.push(<path d={`M${hx} ${P[1] - 2} l${w * .22} ${h * 1.1}`} />); }
  const gullies: JSX.Element[] = [];
  for (let i = 0; i < 4; i++) {
    const t = .25 + i * .17, gx = P[0] - (P[0] - x0) * t * .9, gy = P[1] + (base - P[1]) * (t * .8 + .06);
    gullies.push(<path d={`M${gx} ${gy} q${-w * .03} ${h * .1} ${-w * .07} ${h * .16}`} />);
  }
  const sl = base - h * (1 - (.3 + snow * .1));
  const zig = Array.from({ length: 15 }, (_, i) => [x0 + w + 2 - i * (w + 4) / 14, sl + (i % 2 ? -h * .07 : h * .05) + (rnd(seed + i * 7) - .5) * h * .08] as Pt);
  const snowClip = `M${x0 - 2} ${base - h - 4} H${x0 + w + 2} ` + zig.map((p) => `L${p[0]} ${p[1]}`).join(' ') + ' Z';
  const light = far ? '#e8dbb9' : '#e2cfa3', shade = far ? '#c5b08a' : '#a48b62';
  return <g>
    <clipPath id={id}><path d={dark} /></clipPath>
    <clipPath id={`${id}s`}><path d={snowClip} /></clipPath>
    <clipPath id={`${id}m`}><path d={sil} /></clipPath>
    <path d={sil} fill={light} />
    <path d={dark} fill={shade} />
    <g clip-path={`url(#${id})`} stroke={INK2} stroke-width={.42} opacity={far ? .35 : .6}>{hatch}</g>
    {snow > 0 && <g clip-path={`url(#${id}s)`}><path d={sil} fill="#fbf8ee" /><path d={dark} fill="#cfd8dc" /></g>}
    {snow > 0 && <g clip-path={`url(#${id}m)`}><path d={line(zig)} fill="none" stroke={INK} stroke-width={.45} /></g>}
    <g fill="none" stroke={INK2} stroke-width={.45} opacity={.7} stroke-linecap="round">{gullies}</g>
    <path d={ridge} fill="none" stroke={INK} stroke-width={.5} opacity={.8} />
    <path d={line(top)} fill="none" stroke={INK} stroke-width={far ? .6 : .85} stroke-linejoin="round" stroke-linecap="round" />
  </g>;
}
function Hill({ x, base, w, h }: { x: number; base: number; w: number; h: number }) {
  return <g>
    <path d={`M${x - w / 2} ${base} Q${x - w * .2} ${base - h * 1.3} ${x + w * .05} ${base - h} Q${x + w * .3} ${base - h * .8} ${x + w / 2} ${base} Z`} fill="#e7d6ad" stroke={INK} stroke-width={.7} />
    <g stroke={INK2} stroke-width={.4} opacity={.6}>{[0, 1, 2, 3, 4].map((i) => <path d={`M${x + w * (.06 + i * .08)} ${base - h * (.9 - i * .14)} l${w * .05} ${h * .5}`} />)}</g>
  </g>;
}
function Fir({ x, y, s = 1, seed = 0 }: { x: number; y: number; s?: number; seed?: number }) {
  const g = ['#4f6e3a', '#5a7a40', '#466434'][seed % 3];
  return <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`}>
    <ellipse cx={2.4} cy={.6} rx={4.4} ry={1.3} fill="#5b3f22" opacity={.28} />
    <path d="M0 0 V1.6" stroke={INK} stroke-width={.9} />
    <path d="M0 -13 L-3.4 -6.5 L-2.2 -6.5 L-4.6 -2.4 L-3 -2.4 L-5.4 .6 L5.4 .6 L3 -2.4 L4.6 -2.4 L2.2 -6.5 L3.4 -6.5 Z" fill={g} stroke={INK} stroke-width={.55} stroke-linejoin="round" />
    <path d="M0 -13 L3.4 -6.5 L2.2 -6.5 L4.6 -2.4 L3 -2.4 L5.4 .6 L0 .6 Z" fill="#2f4524" opacity={.35} />
  </g>;
}
function Oak({ x, y, r = 5, seed = 0 }: { x: number; y: number; r?: number; seed?: number }) {
  const g = ['#8a9a48', '#7c8f40', '#97a654'][seed % 3];
  return <g>
    <ellipse cx={x + r * .7} cy={y + r * 1.2} rx={r * .95} ry={r * .32} fill="#5b3f22" opacity={.26} />
    <path d={`M${x} ${y + r * .4} V${y + r * 1.2}`} stroke={INK} stroke-width={.8} />
    <path d={`M${x - r} ${y + r * .2} Q${x - r * 1.15} ${y - r * .6} ${x - r * .4} ${y - r * .9} Q${x} ${y - r * 1.35} ${x + r * .5} ${y - r * .9} Q${x + r * 1.15} ${y - r * .55} ${x + r} ${y + r * .2} Q${x} ${y + r * .75} ${x - r} ${y + r * .2} Z`} fill={g} stroke={INK} stroke-width={.55} />
    <path d={`M${x + r * .1} ${y + r * .55} Q${x + r} ${y + r * .35} ${x + r} ${y - r * .2}`} fill="none" stroke="#4d5a26" stroke-width={r * .35} opacity={.35} stroke-linecap="round" />
  </g>;
}
function Birch({ x, y }: { x: number; y: number }) {
  return <g>
    <path d={`M${x} ${y} V${y - 9}`} stroke="#f8f2e2" stroke-width={1.6} /><path d={`M${x} ${y} V${y - 9}`} stroke={INK} stroke-width={.5} stroke-dasharray="1 1.6" />
    <ellipse cx={x} cy={y - 11} rx={3} ry={5} fill="#a8b860" stroke={INK} stroke-width={.5} />
  </g>;
}
function Poplar({ x, y, h = 14 }: { x: number; y: number; h?: number }) {
  return <g>
    <ellipse cx={x + 3} cy={y + .5} rx={3.4} ry={1} fill="#5b3f22" opacity={.26} />
    <path d={`M${x} ${y} V${y - 3}`} stroke={INK} stroke-width={.8} />
    <path d={`M${x} ${y - h} Q${x + 3} ${y - h * .5} ${x + 1.8} ${y - 2} H${x - 1.8} Q${x - 3} ${y - h * .5} ${x} ${y - h} Z`} fill="#6f8a3c" stroke={INK} stroke-width={.55} />
  </g>;
}
function Reeds({ x, y, n = 4, seed = 0 }: { x: number; y: number; n?: number; seed?: number }) {
  return <g stroke="#6a6b2e" stroke-width={.6} stroke-linecap="round">{Array.from({ length: n }, (_, i) => {
    const dx = (i - n / 2) * 1.6 + rnd(seed + i) * .8, hh = 5 + rnd(seed + i + 9) * 3;
    return <g><path d={`M${x + dx} ${y} q${(rnd(i + seed) - .5) * 2} ${-hh * .6} ${(rnd(i + seed + 3) - .5) * 1.5} ${-hh}`} fill="none" />{i % 2 === 0 && <ellipse cx={x + dx} cy={y - hh + .6} rx={.7} ry={1.6} fill="#7a4e2c" stroke="none" />}</g>;
  })}</g>;
}
function Tuft({ x, y }: { x: number; y: number }) {
  return <path d={`M${x - 2} ${y} l1 -2.4 M${x} ${y} v-3 M${x + 2} ${y} l-1 -2.4`} stroke="#7d7a3c" stroke-width={.55} stroke-linecap="round" />;
}

// ---------- fields and settlements ----------
function Field({ q, kind, seed = 0 }: { q: Pt[]; kind: 'wheat' | 'black' | 'green' | 'sun' | 'melon'; seed?: number }) {
  const d = 'M' + q.map((p) => p.join(' ')).join(' L') + ' Z', id = `fd${seed}`;
  const fill = { wheat: '#e7c76a', black: '#7a5a3c', green: '#a7b963', sun: '#9fae4c', melon: '#b9c27a' }[kind];
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  const x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4, y0 = Math.min(...ys) - 4, y1 = Math.max(...ys) + 4;
  const rows: JSX.Element[] = [];
  if (kind === 'sun') { for (let y = y0; y < y1; y += 3.2) for (let x = x0 + ((y - y0) / 3.2 % 2) * 1.6; x < x1; x += 3.2) rows.push(<g><circle cx={x} cy={y} r={1.2} fill="#f2c13a" /><circle cx={x} cy={y} r={.45} fill="#6b4422" /></g>); }
  else if (kind === 'melon') { for (let y = y0 + 2; y < y1; y += 4.2) for (let x = x0 + 2 + ((y - y0) / 4.2 % 2) * 2.4; x < x1; x += 5) rows.push(<g><ellipse cx={x} cy={y} rx={1.8} ry={1.3} fill="#4f7d34" stroke={INK} stroke-width={.3} /><path d={`M${x - 1.2} ${y - .4} q1.2 .7 2.4 0`} stroke="#c8d88a" stroke-width={.3} fill="none" /></g>); }
  else { const step = kind === 'black' ? 1.6 : 2.2; const ang = (seed % 2 ? .35 : -.18); for (let x = x0 - 30; x < x1 + 30; x += step) rows.push(<path d={`M${x} ${y0} l${(y1 - y0) * ang} ${y1 - y0}`} />); }
  return <g>
    <clipPath id={id}><path d={d} /></clipPath>
    <path d={d} fill={fill} />
    <g clip-path={`url(#${id})`} stroke={kind === 'black' ? '#4a3220' : kind === 'wheat' ? '#b98f2e' : '#6f8436'} stroke-width={.5} opacity={kind === 'sun' || kind === 'melon' ? 1 : .8}>{rows}</g>
    <path d={d} fill="none" stroke={INK} stroke-width={.6} stroke-linejoin="round" />
  </g>;
}
function Sheaf({ x, y }: { x: number; y: number }) {
  return <g><path d={`M${x - 2.4} ${y} L${x} ${y - 6} L${x + 2.4} ${y} Z`} fill="#e9c35a" stroke={INK} stroke-width={.45} /><path d={`M${x - 1.6} ${y - 2.4} h3.2`} stroke="#9a6b22" stroke-width={.5} /></g>;
}
function Izba({ x, y, s = 1, roof = '#9a5a34', wall = '#c89a62' }: { x: number; y: number; s?: number; roof?: string; wall?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} stroke-width={.6} stroke-linejoin="round">
    <ellipse cx={2} cy={.6} rx={6.4} ry={1.4} fill="#5b3f22" opacity={.25} stroke="none" />
    <path d="M-5 0 V-5.4 H5 V0 Z" fill={wall} />
    <path d="M-5 -2 H5 M-5 -3.8 H5" stroke="#8f6238" stroke-width={.35} />
    <path d="M-6.2 -5 L0 -9.8 L6.2 -5 Z" fill={roof} />
    <rect x={-1.2} y={-4.2} width={2.4} height={2} fill="#f3d27a" stroke-width={.35} />
  </g>;
}
function Hut({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} stroke-width={.6} stroke-linejoin="round">
    <ellipse cx={2} cy={.6} rx={6.4} ry={1.4} fill="#5b3f22" opacity={.25} stroke="none" />
    <path d="M-5 0 V-5 H5 V0 Z" fill="#fbf6ea" />
    <path d="M-6.6 -4.4 Q0 -11.6 6.6 -4.4 Z" fill="#d7b25e" />
    <path d="M-4 -6.4 l1 1.4 M-1 -8 l1 1.6 M2 -8 l1 1.6 M4.4 -6.2 l.4 1.3" stroke="#9a7a32" stroke-width={.35} />
    <rect x={-1.1} y={-3.8} width={2.2} height={2} fill="#7fb4c8" stroke-width={.35} />
  </g>;
}
function Church({ x, y, s = 1, dome = '#d9a73a' }: { x: number; y: number; s?: number; dome?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke={INK} stroke-width={.6} stroke-linejoin="round">
    <ellipse cx={3} cy={.8} rx={10} ry={1.8} fill="#5b3f22" opacity={.25} stroke="none" />
    <path d="M-8 0 V-7 H3 V0 Z" fill="#fbf6ea" /><path d="M-9 -6.6 L-2.5 -10.4 L4 -6.6 Z" fill="#8a9aa6" />
    <path d="M3 0 V-15 H8 V0 Z" fill="#fbf6ea" />
    <path d="M2.6 -15 Q5.5 -22 8.4 -15 Z" fill={dome} />
    <path d="M5.5 -20.6 Q4.2 -22.4 5.5 -24 Q6.8 -22.4 5.5 -20.6 Z" fill={dome} />
    <path d="M5.5 -24 V-27.6 M4.2 -26.4 H6.8 M4.6 -25 L6.4 -25.6" stroke-width={.45} />
    <path d="M-5 -3 v-2 M-1 -3 v-2 M5.5 -9 v-2.4" stroke-width={.9} />
  </g>;
}
function Tower({ x, y }: { x: number; y: number }) {
  // the windmill's tower; the sails turn on the live layer
  return <g transform={`translate(${x} ${y})`} stroke={INK} stroke-width={.6} stroke-linejoin="round">
    <ellipse cx={3} cy={.8} rx={7} ry={1.6} fill="#5b3f22" opacity={.25} stroke="none" />
    <path d="M-4.6 0 L-3 -13 H3 L4.6 0 Z" fill="#c89a62" /><path d="M-3.4 -9 H3.4 M-3.8 -5 H3.8" stroke="#8f6238" stroke-width={.35} />
    <path d="M-4 -12.6 L0 -17 L4 -12.6 Z" fill="#9a5a34" /><rect x={-1} y={-4} width={2} height={4} fill="#6b4422" />
  </g>;
}

// ---------- cartography ----------
function Compass({ x, y, r }: { x: number; y: number; r: number }) {
  const pts: JSX.Element[] = [];
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8 - Math.PI / 2, main = i % 4 === 0, mid = i % 2 === 0;
    const L = r * (main ? 1 : mid ? .68 : .48), wd = r * (main ? .16 : .11);
    const tip: Pt = [x + Math.cos(a) * L, y + Math.sin(a) * L], l: Pt = [x + Math.cos(a - Math.PI / 2) * wd, y + Math.sin(a - Math.PI / 2) * wd], rr: Pt = [x + Math.cos(a + Math.PI / 2) * wd, y + Math.sin(a + Math.PI / 2) * wd];
    pts.push(<g stroke={INK} stroke-width={.45} stroke-linejoin="round">
      <path d={`M${x} ${y} L${l[0]} ${l[1]} L${tip[0]} ${tip[1]} Z`} fill={i === 0 ? '#b8473a' : main ? '#3d2a1b' : '#efe1bd'} />
      <path d={`M${x} ${y} L${rr[0]} ${rr[1]} L${tip[0]} ${tip[1]} Z`} fill={i === 0 ? '#e58a6e' : main ? '#efe1bd' : '#c8a96a'} />
    </g>);
  }
  return <g>
    <circle cx={x} cy={y} r={r * .78} fill="none" stroke={INK} stroke-width={.5} />
    <circle cx={x} cy={y} r={r * .72} fill="none" stroke={INK} stroke-width={.3} stroke-dasharray=".8 1.2" />
    {pts.slice().sort((a, b) => 0)}
    <circle cx={x} cy={y} r={1.6} fill="#d9a73a" stroke={INK} stroke-width={.4} />
    <text x={x} y={y - r - 2.2} text-anchor="middle" class="m-cap" font-size="6.2">С</text>
  </g>;
}
function Frame() {
  const bars: JSX.Element[] = [];
  for (let x = 11; x < 389; x += 10) { const k = Math.floor((x - 11) / 10) % 2; if (k) { bars.push(<rect x={x} y={7} width={Math.min(10, 389 - x)} height={3.6} fill={INK} />); bars.push(<rect x={x} y={289.4} width={Math.min(10, 389 - x)} height={3.6} fill={INK} />); } }
  for (let y = 11; y < 289; y += 10) { const k = Math.floor((y - 11) / 10) % 2; if (!k) { bars.push(<rect x={7} y={y} width={3.6} height={Math.min(10, 289 - y)} fill={INK} />); bars.push(<rect x={389.4} y={y} width={3.6} height={Math.min(10, 289 - y)} fill={INK} />); } }
  return <g>
    <rect x={7} y={7} width={386} height={286} fill="none" stroke={INK} stroke-width={.6} />
    <g opacity={.85}>{bars}</g>
    <rect x={10.6} y={10.6} width={378.8} height={278.8} fill="none" stroke={INK} stroke-width={.9} />
    <rect x={3.6} y={3.6} width={392.8} height={292.8} fill="none" stroke={INK} stroke-width={.35} />
    {[[7, 7], [389.4, 7], [7, 289.4], [389.4, 289.4]].map(([x, y]) => <rect x={x} y={y} width={3.6} height={3.6} fill="#b8473a" stroke={INK} stroke-width={.4} />)}
  </g>;
}
function Cartouche() {
  return <g transform="translate(58 26)">
    <path d="M-44 -9 Q-48 -9 -48 -5 V5 Q-48 9 -44 9 H44 Q48 9 48 5 V-5 Q48 -9 44 -9 Z" fill="#f4e6c0" stroke={INK} stroke-width={.7} />
    <path d="M-42 -6.6 H42 M-42 6.6 H42" stroke={INK} stroke-width={.3} />
    <path d="M-48 -5 Q-54 -4 -54 1 Q-54 6 -49 6 Q-46 6 -46 3 Q-46 1 -48 1" fill="#e2cf9e" stroke={INK} stroke-width={.6} />
    <path d="M48 -5 Q54 -4 54 1 Q54 6 49 6 Q46 6 46 3 Q46 1 48 1" fill="#e2cf9e" stroke={INK} stroke-width={.6} />
    <text x={0} y={3} text-anchor="middle" class="m-title">Карта хозяйств</text>
  </g>;
}
function ScaleBar({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    {[0, 1, 2, 3, 4].map((i) => <rect x={i * 10} y={0} width={10} height={2.4} fill={i % 2 ? '#f4e6c0' : INK} stroke={INK} stroke-width={.35} />)}
    {[0, 25, 50].map((v, i) => <text x={i * 25} y={7.4} text-anchor="middle" class="m-small">{v}</text>)}
    <text x={25} y={-2.4} text-anchor="middle" class="m-small">вёрст</text>
  </g>;
}

export function MapBase() {
  const don: Pt[] = [[128, 11], [123, 28], [131, 46], [122, 64], [110, 80], [105, 98], [112, 116], [106, 134], [98, 148], [104, 160], [117, 171]];
  const voronezh: Pt[] = [[178, 11], [172, 28], [160, 46], [144, 58], [124, 66]];
  const kuban: Pt[] = [[238, 291], [230, 281], [216, 277], [198, 280], [180, 283], [164, 280], [150, 273], [138, 269], [125, 268]];
  const kubanArm: Pt[] = [[150, 273], [142, 279], [131, 282]];
  const katun: Pt[] = [[298, 178], [290, 156], [284, 134], [289, 110], [298, 86], [312, 60], [324, 38], [332, 26]];
  const biya: Pt[] = [[372, 168], [368, 146], [371, 124], [364, 100], [353, 72], [342, 46], [334, 30], [332, 26]];
  const ob: Pt[] = [[332, 26], [334, 18], [333, 9]];
  const near = (x: number, y: number, pts: Pt[], d: number) => sample(pts, 6).some((p) => Math.hypot(p[0] - x, p[1] - y) < d);
  // the taiga, kept off the pin, its ribbon and the rivers
  const firs: [number, number, number, number][] = [];
  for (let i = 0; i < 900 && firs.length < 150; i++) {
    const x = 264 + rnd(i * 3 + 1) * 124, y = 18 + rnd(i * 7 + 2) * 160;
    if (Math.hypot(x - MAP_PINS.altai[0], y - MAP_PINS.altai[1]) < 33 || (x > 266 && x < 388 && y > 134 && y < 166)) continue;
    if (near(x, y, katun, 6) || near(x, y, biya, 6) || near(x, y, ob, 6) || y > 176 || (x > 360 && y > 160)) continue;
    if (x < 270 && (y < 40 || y > 120)) continue;
    firs.push([x, y, .8 + rnd(i + 5) * .45, i]);
  }
  firs.sort((a, b) => a[1] - b[1]);
  // grass tufts over the open steppe, kept off the fields, the villages, the pins and their ribbons
  const busy: [number, number, number, number][] = [[180, 14, 258, 92], [24, 40, 100, 148], [188, 98, 258, 140], [104, 168, 168, 216], [222, 166, 260, 232], [104, 214, 138, 246],
    [118, 70, 182, 150], [166, 186, 230, 262], [12, 11, 110, 44], [120, 256, 262, 289]];
  const tufts: Pt[] = [];
  for (let i = 0; i < 1400 && tufts.length < 70; i++) {
    const x = 14 + rnd(i * 13 + 5) * 244, y = 14 + rnd(i * 17 + 6) * 272;
    if (busy.some(([a, b, c, d]) => x > a && x < c && y > b && y < d)) continue;
    if (near(x, y, don, 6) || near(x, y, voronezh, 5) || near(x, y, kuban, 6)) continue;
    if (y > 146 && x < 110 + (y - 150) * .2) continue;
    tufts.push([x, y]);
  }
  const oaks: [number, number, number][] = [];
  for (let i = 0; i < 400 && oaks.length < 34; i++) {
    const x = 26 + rnd(i * 5 + 3) * 74, y = 48 + rnd(i * 11 + 4) * 42;
    if (near(x, y, don, 7) || (x > 74 && y > 60)) continue;
    oaks.push([x, y, i]);
  }
  oaks.sort((a, b) => a[1] - b[1]);
  // distant range, then three rows from back to front; the lake lies in the valley before the second row
  const far = [[302, 198, 26, 62, 0], [346, 198, 22, 56, 0]] as const;
  const row1 = [[282, 224, 34, 70, 0], [322, 224, 44, 78, 1], [364, 224, 34, 64, 1]] as const;
  const row2 = [[272, 256, 40, 66, 0], [312, 256, 52, 84, 1], [354, 256, 66, 94, 2], [390, 256, 40, 60, 0]] as const;
  const row3 = [[266, 288, 30, 62, 0], [302, 288, 36, 72, 0], [342, 288, 34, 68, 0], [380, 288, 32, 62, 0]] as const;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width={400} height={300}>
      <defs>
        <filter id="wobble" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves={2} seed={4} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={1.1} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="bleed" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves={3} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={6} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={1.2} />
        </filter>
        <clipPath id="inner"><rect x={11} y={11} width={378} height={278} /></clipPath>
        <clipPath id="sea"><path d={SEA} /></clipPath>
        <clipPath id="r-ch"><path d="M11 11 H258 L262 60 L256 110 L258 158 L240 166 L200 164 L160 170 L120 178 L92 184 L60 170 L11 160 Z" /></clipPath>
        <clipPath id="r-ku"><path d="M92 184 L120 178 L160 170 L200 164 L240 166 L258 158 L262 210 L258 250 L262 289 H130 L100 200 Z" /></clipPath>
        <clipPath id="r-al"><path d="M258 11 H389 V289 H262 L258 250 L262 210 L258 158 L256 110 L262 60 Z" /></clipPath>
        <linearGradient id="seawash" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#97c1c0" /><stop offset="1" stop-color="#7fb0b4" /></linearGradient>
      </defs>
      <image href="parchment.png" x={0} y={0} width={400} height={300} preserveAspectRatio="none" />
      <g clip-path="url(#inner)">
        {/* hand-coloured washes: each land along its borders and coasts */}
        <g style={{ mixBlendMode: 'multiply' }} filter="url(#bleed)">
          <g clip-path="url(#r-ch)"><rect width={400} height={300} fill="#c9cf8a" opacity={.32} /><path d="M11 11 H258 L262 60 L256 110 L258 158 L240 166 L200 164 L160 170 L120 178 L92 184 L60 170 L11 160 Z" fill="none" stroke="#7f9d3c" stroke-width={10} opacity={.45} /></g>
          <g clip-path="url(#r-ku)"><rect width={400} height={300} fill="#e9cf86" opacity={.34} /><path d="M92 184 L120 178 L160 170 L200 164 L240 166 L258 158 L262 210 L258 250 L262 289 H130 L100 200 Z" fill="none" stroke="#d29a35" stroke-width={10} opacity={.45} /></g>
          <g clip-path="url(#r-al)"><rect width={400} height={300} fill="#c6cfb6" opacity={.32} /><path d="M258 11 H389 V289 H262 L258 250 L262 210 L258 158 L256 110 L262 60 Z" fill="none" stroke="#b5594a" stroke-width={10} opacity={.38} /></g>
        </g>
        {/* graticule */}
        <g fill="none" stroke={INK2} stroke-width={.3} opacity={.35} stroke-dasharray="1 2.4" style={{ mixBlendMode: 'multiply' }}>
          {[105, 205, 305].map((x) => <path d={`M${x - 3} 11 Q${x + 2} 150 ${x - 3} 289`} />)}
          {[80, 160, 240].map((y) => <path d={`M11 ${y + 3} Q200 ${y - 5} 389 ${y + 3}`} />)}
        </g>
        <g style={{ mixBlendMode: 'multiply' }}>
          {/* the sea: wash, engraved waterlines along the coast, rhumb lines from the rose */}
          <path d={SEA} fill="url(#seawash)" opacity={.85} filter="url(#bleed)" />
          <g clip-path="url(#sea)" fill="none">
            {[30, 23, 17, 12, 8, 4.6].map((w, i) => <path d={SEA} stroke="#4d7480" stroke-width={w} opacity={.16 + i * .05} />)}
            {[30, 23, 17, 12, 8, 4.6].map((w) => <path d={SEA} stroke="#97c1c0" stroke-width={w - .9} opacity={.9} />)}
            <g stroke="#466a74" stroke-width={.32} opacity={.45}>{Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return <path d={`M52 232 L${52 + Math.cos(a) * 300} ${232 + Math.sin(a) * 300}`} />; })}</g>
            <g stroke="#3f6470" stroke-width={.5} opacity={.6} stroke-linecap="round">{[[24, 172], [40, 186], [74, 168], [22, 262], [86, 222], [70, 270], [104, 250], [30, 284]].map(([x, y]) => <path d={`M${x} ${y} q2 -1.6 4 0 t4 0`} />)}</g>
          </g>
          <path d={SEA} fill="none" stroke={INK} stroke-width={.9} filter="url(#wobble)" />
        </g>

        <g style={{ mixBlendMode: 'multiply' }} filter="url(#wobble)">
          {/* rivers */}
          <River pts={don} w0={1.6} w1={5.6} />
          <River pts={voronezh} w0={1.2} w1={2.6} />
          <River pts={kuban} w0={1.8} w1={5.2} />
          <River pts={kubanArm} w0={2} w1={2.8} />
          <River pts={katun} w0={2} w1={4.2} />
          <River pts={biya} w0={2.2} w1={3.8} />
          <River pts={ob} w0={5.4} w1={6.4} />
          <g>{[[121, 262], [128, 260], [133, 275], [140, 285], [146, 266], [154, 284], [126, 285], [158, 274], [137, 262]].map(([x, y], i) => <Reeds x={x} y={y} n={4} seed={i * 5} />)}</g>
          {/* Chernozemye */}
          <Field q={[[184, 22], [214, 19], [216, 40], [186, 44]]} kind="wheat" seed={1} />
          <Field q={[[217, 19], [251, 17], [252, 38], [219, 40]]} kind="black" seed={2} />
          <Field q={[[186, 47], [216, 43], [218, 63], [188, 67]]} kind="green" seed={3} />
          <Field q={[[220, 43], [252, 41], [253, 62], [221, 64]]} kind="wheat" seed={4} />
          <Field q={[[190, 70], [220, 67], [222, 86], [192, 89]]} kind="black" seed={5} />
          <Field q={[[224, 67], [253, 65], [253, 82], [225, 86]]} kind="wheat" seed={6} />
          <Field q={[[30, 98], [64, 95], [66, 118], [32, 122]]} kind="black" seed={7} />
          <Field q={[[67, 95], [94, 93], [96, 114], [69, 118]]} kind="wheat" seed={8} />
          <Field q={[[33, 125], [66, 121], [67, 141], [36, 145]]} kind="green" seed={9} />
          {[[228, 76], [236, 78], [244, 75], [196, 30], [203, 33], [232, 52], [240, 54], [78, 104], [86, 106]].map(([x, y]) => <Sheaf x={x} y={y} />)}
          {[186, 192, 198, 204, 210, 216, 222, 228, 234, 240, 246].map((x, i) => <Oak x={x} y={44.6 - (x - 186) * .05} r={2.4} seed={i} />)}
          {[22, 28, 34, 40, 46, 52, 58, 64].map((y, i) => <Oak x={217.6} y={y + 18} r={2.2} seed={i + 1} />)}
          {oaks.map(([x, y, i]) => <Oak x={x} y={y} r={3.8 + rnd(i) * 1.4} seed={i} />)}
          {[[84, 70], [90, 74], [80, 80], [94, 84], [86, 88], [76, 90]].map(([x, y]) => <Birch x={x} y={y} />)}
          {/* the village with its church; the windmill on the rise */}
          <g>
            <path d="M196 110 Q214 102 240 108 Q246 118 238 128 Q216 134 198 128 Z" fill="#b9a06a" opacity={.25} />
            <Izba x={200} y={112} /><Izba x={210} y={120} roof="#7a4a2c" /><Izba x={236} y={118} s={.95} /><Izba x={226} y={128} roof="#8a5232" /><Izba x={204} y={128} s={.9} />
            <Church x={216} y={116} s={.9} dome="#3f8a6a" />
            <path d="M196 132 Q218 138 242 130" stroke="#8a5a32" stroke-width={.5} fill="none" stroke-dasharray="1 1.4" />
            {[[192, 118], [244, 124], [192, 126]].map(([x, y], i) => <Oak x={x} y={y} r={2.6} seed={i} />)}
          </g>
          <Tower x={MILL_HUB[0]} y={MILL_HUB[1] + 13} />
          {/* Kuban: whitewashed huts, the stanitsa church, sunflowers, melons, poplars along the road */}
          <Field q={[[226, 172], [255, 170], [257, 197], [228, 199]]} kind="sun" seed={10} />
          <Field q={[[229, 205], [256, 203], [256, 226], [231, 228]]} kind="melon" seed={11} />
          <Field q={[[108, 222], [128, 218], [134, 240], [114, 244]]} kind="sun" seed={12} />
          <Hut x={142} y={194} /><Hut x={156} y={200} s={.95} /><Hut x={146} y={208} s={.9} /><Hut x={160} y={214} s={.9} />
          <Church x={128} y={204} s={.75} dome="#5b8ab0" />
          {[[178, 160], [182, 168], [187, 176], [192, 184]].map(([x, y]) => <Poplar x={x} y={y} />)}
          {[[202, 160], [210, 162], [218, 160]].map(([x, y]) => <Poplar x={x} y={y} h={12} />)}
          {[[176, 250], [214, 262], [236, 250], [120, 196], [184, 236], [242, 240], [168, 262]].map(([x, y]) => <Tuft x={x} y={y} />)}
          {tufts.map(([x, y]) => <Tuft x={x} y={y} />)}
          {/* Altai: lake, taiga, then the mountains from back to front */}
          {firs.map(([x, y, s, i]) => <Fir x={x} y={y} s={s} seed={i} />)}
          {far.map(([x, b, h, w]) => <Mountain x={x} base={b} h={h} w={w} seed={x + b} far />)}
          {row1.map(([x, b, h, w, sn]) => <Mountain x={x} base={b} h={h} w={w} snow={sn} seed={x * 3 + b} />)}
          <path d="M372 166 C378 168 382 180 383 192 C384 204 382 214 378 214 C374 214 372 204 371 192 C370 180 368 168 372 166 Z" fill="#8fb9bf" stroke={INK} stroke-width={.7} />
          <path d="M374 172 C377 184 379 196 378 208" stroke="#d9ece6" stroke-width={.6} fill="none" stroke-dasharray="2 3" />
          {row2.map(([x, b, h, w, sn]) => <Mountain x={x} base={b} h={h} w={w} snow={sn} seed={x * 5 + b} />)}
          {[[268, 262], [292, 266], [330, 262], [372, 266], [384, 262]].map(([x, y], i) => <Fir x={x} y={y} s={.9} seed={i} />)}
          {row3.map(([x, b, h, w, sn]) => <Mountain x={x} base={b} h={h} w={w} snow={sn} seed={x * 7 + b} />)}
          {[[272, 120], [278, 70], [384, 60], [386, 130], [266, 96]].map(([x, y], i) => <Fir x={x} y={y} s={1.05} seed={i} />)}
          {/* roads and the railway east */}
          <path d="M150 124 C153 140 158 154 168 166 C176 176 184 184 190 188" fill="none" stroke="#9a3e2a" stroke-width={.9} stroke-dasharray="1.6 2" />
          <path d="M146 100 C130 98 116 98 100 98 C80 100 50 92 11 94" fill="none" stroke="#9a3e2a" stroke-width={.9} stroke-dasharray="1.6 2" />
          <g transform="translate(106 98) rotate(4)" stroke={INK} stroke-width={.6}><rect x={-5} y={-2.2} width={10} height={4.4} fill="#c89a62" /><path d="M-3 -2.2 v4.4 M0 -2.2 v4.4 M3 -2.2 v4.4" stroke-width={.35} /></g>
          {[[252, 132], [114, 198], [244, 236]].map(([x, y]) => <Hill x={x} base={y} w={12} h={4} />)}
          {[[94, 128], [120, 142], [116, 112], [100, 64], [136, 30]].map(([x, y], i) => <Oak x={x} y={y} r={2.8} seed={i + 2} />)}
          <path d={RAILWAY} fill="none" stroke={INK} stroke-width={2.2} />
          <path d={RAILWAY} fill="none" stroke="#f4e6c0" stroke-width={1.2} stroke-dasharray="3 3" />
        </g>
        {/* lettering */}
        <g class="labels">
          <text transform="translate(97 128) rotate(-78)" class="m-river">Дон</text>
          <text transform="translate(150 44) rotate(-42)" class="m-river" font-size="5.2">Воронеж</text>
          <text x={206} y={274} class="m-river">Кубань</text>
          <text transform="translate(280 102) rotate(-64)" class="m-river">Катунь</text>
          <text transform="translate(368 82) rotate(58)" class="m-river">Бия</text>
          <text x={340} y={20} class="m-river">Обь</text>
          <text transform="translate(367 214) rotate(-84)" class="m-river" font-size="5.4">Телецкое оз.</text>
          <text x={340} y={182} text-anchor="middle" class="m-small" font-size="5.6">г. Белуха</text>
          <text transform="translate(192 166) rotate(-5)" class="m-small" font-size="5.4">≈ 3 500 вёрст на восток</text>
          <path id="sea-label" d="M16 180 Q48 168 84 182" fill="none" />
          <text class="m-sea"><textPath href="#sea-label" startOffset="50%" text-anchor="middle">Азовское море</textPath></text>
        </g>
        <Compass x={52} y={232} r={18} />
        <ScaleBar x={24} y={270} />
        <Cartouche />
      </g>
      <Frame />
    </svg>
  );
}
