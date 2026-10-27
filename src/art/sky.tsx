// The sky over the field is the forecast. This week hangs big over the farm; the coming weeks shrink toward the
// horizon; past what the barometer can tell lies fog. Raids announced ahead show here too: a flock circling over
// the forest, a locust cloud on the horizon, children far off by the hills. Same ink language as the field.
import type { JSX } from 'preact';
import { P } from './palette';
import { CrowFlying } from './crows';
import { Hopper } from './locusts';
import { icons } from './icons';
import type { RaidSign, SkyKind, SkyToken } from '../ui/skyForecast';
import { ROAD_CREST } from './meadow';

const INK = P.ink;
export const SKY_H = 96;

// ---------- weather pictures, centred on (0, 0), about 70 × 60 at scale 1 ----------
const CLOUD: ([number, number, number] | [number, number, number, number])[] = [[-20, 2, 13], [0, -7, 17], [19, 1, 13], [-32, 4, 64, 15]];
function Cloud({ fill = '#fff', sw = 2.2 }: { fill?: string; sw?: number }) {
  const parts = (stroke: boolean) => CLOUD.map((p) => (p.length === 3
    ? <circle cx={p[0]} cy={p[1]} r={p[2]} fill={fill} stroke={stroke ? INK : 'none'} stroke-width={stroke ? sw * 2 : 0} />
    : <rect x={p[0]} y={p[1]} width={p[2]} height={p[3]} rx={7.5} fill={fill} stroke={stroke ? INK : 'none'} stroke-width={stroke ? sw * 2 : 0} />));
  return <g class="sky-cloud">{parts(true)}{parts(false)}<path d="M-14 -4 q6 -6 12 0 M4 -10 q6 -6 12 0" stroke="#fff" stroke-width={2} fill="none" stroke-linecap="round" opacity={0.55} /></g>;
}
function Sun({ r = 15, hot = false }: { r?: number; hot?: boolean }) {
  const col = hot ? '#f6a03a' : '#ffd25a', ray = hot ? '#d9822b' : '#e1a52b';
  return (
    <g class="sky-sun">
      <g class="sky-rays">{Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a);
        return <path d={`M${c * (r + 4)} ${s * (r + 4)} L${c * (r + 10)} ${s * (r + 10)}`} stroke={ray} stroke-width={3} stroke-linecap="round" />;
      })}</g>
      <circle r={r} fill={col} stroke={INK} stroke-width={2.2} />
      <path d={`M${-r * 0.45} ${-r * 0.35} q${r * 0.3} ${-r * 0.3} ${r * 0.6} 0`} stroke="#fff6c8" stroke-width={2} fill="none" stroke-linecap="round" opacity={0.7} />
    </g>
  );
}
function Heat({ y = 24, w = 34, n = 3 }: { y?: number; w?: number; n?: number }) {
  return <g class="sky-heat">{Array.from({ length: n }, (_, i) => (
    <path d={`M${-w / 2} ${y + i * 7} q${w / 8} -5 ${w / 4} 0 t${w / 4} 0 t${w / 4} 0 t${w / 4} 0`} fill="none" stroke="#e0823a" stroke-width={2.2} stroke-linecap="round" opacity={0.9 - i * 0.22} style={{ animationDelay: `${-i * 0.4}s` }} />
  ))}</g>;
}
function Falling({ kind }: { kind: 'rain' | 'hail' | 'snow' }) {
  const xs = [-18, -6, 6, 18];
  if (kind === 'rain') return <g class="sky-fall rain">{xs.map((x, i) => <path d={`M${x} 24 l-3 9`} stroke="#3f97d0" stroke-width={2.4} stroke-linecap="round" style={{ animationDelay: `${-i * 0.23}s` }} />)}</g>;
  if (kind === 'hail') return <g class="sky-fall hail">{xs.map((x, i) => <circle cx={x} cy={28} r={3.2} fill="#f2f8ff" stroke="#5f7f99" stroke-width={1.4} style={{ animationDelay: `${-i * 0.29}s` }} />)}</g>;
  return <g class="sky-fall snow">{xs.map((x, i) => (
    <path d={`M${x} 24 v8 M${x - 3.5} 26 l7 4 M${x - 3.5} 30 l7 -4`} stroke="#6fa6cf" stroke-width={1.8} stroke-linecap="round" style={{ animationDelay: `${-i * 0.5}s` }} />
  ))}</g>;
}
export function SkyPicture({ kind }: { kind: SkyKind }) {
  switch (kind) {
    case 'sun': return <Sun />;
    case 'hot': return <g><Sun hot /><Heat y={26} n={2} /></g>;
    case 'dry': return <g><Sun hot r={16} /><Heat y={27} n={3} /></g>;
    case 'warm': return <g><circle r={27} fill="#ffd9a0" opacity={0.45} class="sky-glow" /><Sun r={14} /></g>;
    case 'cloud': return <g><g transform="translate(14 -12)"><Sun r={11} /></g><g transform="translate(-4 4) scale(.82)"><Cloud /></g></g>;
    case 'cold': return <g transform="scale(.9)"><Cloud fill="#cfd8e2" /></g>;
    case 'rain': return <g><Falling kind="rain" /><Cloud fill="#b9c7d4" /></g>;
    case 'hail': return <g><Falling kind="hail" /><Cloud fill="#8c98a8" /></g>;
    case 'flood': return <g><Falling kind="rain" /><Cloud fill="#9fb2c4" /><path class="sky-waves" d="M-26 40 q6.5 -5 13 0 t13 0 t13 0 t13 0" stroke="#2c86b8" stroke-width={2.6} fill="none" stroke-linecap="round" /></g>;
    case 'snow': return <g><Falling kind="snow" /><Cloud fill="#e8f0f6" /></g>;
    case 'frost': return <g><Falling kind="snow" /><Cloud fill="#d8ecfb" /><g transform="translate(22 -18) scale(.42)">{icons.snow()}</g></g>;
    case 'thaw': return <g><g transform="translate(-10 -6)"><Sun r={11} /></g><g transform="translate(12 6) scale(.6)"><Cloud fill="#eef4f8" /></g></g>;
  }
}

// ---------- where each week sits ----------
// this week is big and close; each farther week smaller and lower, toward the horizon
export const skyScale = (k: number) => 1.45 / (1 + 0.38 * k);
export function skySlots(W: number, n: number, clear = false): { x: number; y: number; sc: number }[] {
  const out: { x: number; y: number; sc: number }[] = [];
  // with the tools in the band its corners are taken; with the tools beside the field the sky is all weather
  const x0 = clear ? Math.max(62, W * 0.13) : Math.max(96, W * 0.185);
  // the right corner keeps room for the tools; long forecasts squeeze closer together
  let pairs = 0;
  for (let k = 1; k < n; k++) pairs += skyScale(k - 1) + skyScale(k);
  const step = n > 1 ? Math.min(40, (W - (clear ? 96 : 150) - x0 - 4 * (n - 1)) / pairs) : 40;
  let x = x0;
  for (let k = 0; k < n; k++) {
    const sc = skyScale(k);
    if (k > 0) x += step * (skyScale(k - 1) + sc) + 4;
    out.push({ x, y: 40 + 16 * (1 - sc / 1.45), sc });
  }
  return out;
}

// this week's weather tints the sky (the season's colours stay on the hills)
const WEATHER_SKY: Partial<Record<SkyKind, [string, string]>> = {
  rain: ['#93a6b3', '#cdd6d6'],
  hail: ['#7f8d99', '#bcc4c6'],
  flood: ['#8597a4', '#c3ccce'],
  cloud: ['#b6cbd6', '#e3ebe3'],
  cold: ['#bccdd8', '#e6eef0'],
  frost: ['#c3d3e0', '#eef3f6'],
  hot: ['#cfe4ee', '#f6efcf'],
  dry: ['#d6e3e6', '#f4e9c6'],
};
const SEASON_SKY = [
  ['#c4e6f6', '#eef7e0', '#c4e39a', '#a9d27f'],
  ['#bfe4f6', '#eef7e0', '#b9dd8a', '#a9d27f'],
  ['#cfe3ec', '#f3ead6', '#cdd08a', '#b9c97a'],
  ['#dfe9f1', '#f4f7fa', '#eef3f7', '#f4f8fb'],
];

function TempTag({ t, sc }: { t: number; sc: number }) {
  const s = Math.min(1.1, Math.max(0.62, sc));
  const label = `${t > 0 ? '+' : ''}${t}°`;
  return (
    <g transform={`translate(${22 * sc} ${22 * sc}) scale(${s})`} class="sky-temp">
      <rect x={-19} y={-10} width={38} height={20} rx={7} fill="#fff8ea" stroke={INK} stroke-width={1.6} />
      <text y={5} text-anchor="middle" class="sky-temp-text" fill={t <= 0 ? '#2c6fa8' : t >= 26 ? '#b9531f' : INK}>{label}</text>
    </g>
  );
}
function WeekChip({ k, sc }: { k: number; sc: number }) {
  const s = Math.min(1, Math.max(0.6, sc));
  return (
    <g transform={`translate(${-28 * sc} ${-20 * sc}) scale(${s})`} class="sky-chip">
      <circle r={9.5} fill="#fffaf0" stroke={INK} stroke-width={1.6} />
      <text y={4.6} text-anchor="middle" class="sky-chip-text">{k}</text>
    </g>
  );
}

// ---------- raids seen coming ----------
export function Flock({ far }: { far: boolean }) {
  return (
    <g class={`sky-flock${far ? ' far' : ''}`}>
      {/* one wide ring for the whole flock, each bird a fifth of a lap apart, the nearer ones a little bigger */}
      {[[-2, 1, 0], [3, .86, 1], [-6, .93, 2], [5, .8, 3], [0, .9, 4]].map(([dy, k, i]) => (
        <g transform={`translate(0 ${dy}) scale(${k})`}><g class="sky-orbit" style={{ animationDelay: `${-i * 1.24}s` }}><g transform="scale(.5)"><CrowFlying /></g></g></g>
      ))}
    </g>
  );
}
function Swarm({ far }: { far: boolean }) {
  const dots = Array.from({ length: 26 }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
    return [(a - Math.floor(a) - 0.5) * 62, (b - Math.floor(b) - 0.5) * 20] as const;
  });
  return (
    <g class={`sky-swarm${far ? ' far' : ''}`}>
      <ellipse rx={36} ry={13} fill="#5b5a3a" opacity={0.16} />
      {dots.map(([x, y], i) => <circle cx={x} cy={y} r={1.8} fill="#4a4a2a" class="sky-gnat" style={{ animationDelay: `${-(i % 7) * 0.13}s` }} />)}
      {!far && <g transform="translate(22 6) scale(.9)" class="sky-hopper"><Hopper /></g>}
    </g>
  );
}
function FarKids() {
  // two small heads over the far hill: children watching the farm from afar
  return (
    <g class="sky-kids">
      <circle cx={-6} cy={-2} r={5} fill="#f0c4a0" stroke={INK} stroke-width={1.2} /><path d="M-11 -4 Q-6 -10 -1 -4 Z" fill="#c23a2c" stroke={INK} stroke-width={1} />
      <circle cx={6} cy={-1} r={4.6} fill="#e8b48e" stroke={INK} stroke-width={1.2} /><path d="M1.6 -3 Q6 -9 10.6 -3 Z" fill="#3f6fb0" stroke={INK} stroke-width={1} />
    </g>
  );
}

export interface SkyBandProps {
  W: number; season: number; tokens: SkyToken[]; signs: RaidSign[]; meteoMax: boolean; px: number;
  onToken?: (t: SkyToken) => void; onFog?: () => void; onSign?: (s: RaidSign) => void;
  clear?: boolean; // the tools stand beside the field, not in the band
  ext?: number; // the sky goes on this far beyond the field at both sides (the band spans the whole screen)
}
/** The village road in the sky's land: it leaves the field's crest (ROAD_CREST of the width), narrows as it
 *  climbs and ends at a few roofs and a church dome on the far hill — where the «Деревня» sign stands. */
function VillageRoad({ W, H, winter }: { W: number; H: number; winter: boolean }) {
  const x0 = W * ROAD_CREST, x1 = W * 0.72, y1 = H - 34;
  const road = winter ? '#e6eef3' : '#d2b884';
  return (
    <g class="sky-road" pointer-events="none">
      <path d={`M${x0 - 7} ${H + 2} C${x0 - 6} ${H - 14} ${x1 - 22} ${H - 20} ${x1 - 1.5} ${y1} H${x1 + 1.5} C${x1 - 18} ${H - 18} ${x0 + 4} ${H - 12} ${x0 + 7} ${H + 2} Z`} fill={road} opacity={0.9} />
      <g transform={`translate(${x1 + 8} ${y1 + 1})`} stroke="#3f2a1d" stroke-width={0.9} stroke-linejoin="round">
        <path d="M-14 0 V-6 L-10 -10 L-6 -6 V0 Z" fill={winter ? '#eef3f7' : '#e7c88c'} />
        <path d="M-15 -5.5 L-10 -10.5 L-5 -5.5" fill="none" stroke="#a5482f" stroke-width={1.6} />
        <path d="M-3 0 V-11 L1 -15 L5 -11 V0 Z" fill={winter ? '#eef3f7' : '#f2d79e'} />
        <path d="M1 -15 V-20" /><circle cx={1} cy={-20.5} r={1.5} fill="#d9b25e" />
        <path d="M7 0 V-5 L11 -9 L15 -5 V0 Z" fill={winter ? '#eef3f7' : '#e0b882'} />
        <path d="M6 -4.5 L11 -9.5 L16 -4.5" fill="none" stroke="#6a3a22" stroke-width={1.6} />
        <path d="M-18 0.5 H19" stroke={winter ? '#c3d3dd' : '#6f9a4a'} stroke-width={1.4} />
      </g>
    </g>
  );
}

export function SkyBand({ W, season, tokens, signs, meteoMax, px, onToken, onFog, onSign, clear = false, ext = 0 }: SkyBandProps) {
  const H = SKY_H;
  const [top0, bottom0, hill, front] = SEASON_SKY[season] ?? SEASON_SKY[1];
  // the sky over the field is this week's weather: grey in the rain, darker still under hail and flood
  const [top, bottom] = WEATHER_SKY[tokens[0]?.kind ?? ''] ?? [top0, bottom0];
  const slots = skySlots(W, tokens.length, clear);
  const last = slots[slots.length - 1];
  const fogX = last ? last.x + 36 * last.sc : W * 0.4;
  const flock = signs.find((x) => x.kind === 'crows');
  const swarm = signs.find((x) => x.kind === 'locust');
  const kidsFar = signs.find((x) => x.kind === 'kids' && x.ahead >= 2);
  // raids gather just past the known weeks, clear of the tools in the right corner
  const signX = Math.min(W - (clear ? 120 : 175), Math.max(W * 0.5, fogX + 24));
  const key = (e: JSX.TargetedKeyboardEvent<SVGGElement>, fn: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  // touch targets never smaller than about 40 screen pixels
  const hit = Math.max(30, 40 / Math.max(0.05, px));
  return (
    <g class="sky-band">
      <defs>
        <linearGradient id="sky-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color={top} /><stop offset="1" stop-color={bottom} /></linearGradient>
        {/* over the village the sky keeps only a light veil at the top: the trees and roofs below show through it */}
        <linearGradient id="sky-veil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color={top} stop-opacity=".9" /><stop offset=".35" stop-color={top} stop-opacity=".5" /><stop offset=".75" stop-color={bottom} stop-opacity="0" /></linearGradient>
        <linearGradient id="sky-fog" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#f7f2e6" stop-opacity="0" /><stop offset=".35" stop-color="#f7f2e6" stop-opacity=".88" /><stop offset="1" stop-color="#f4efe2" stop-opacity=".96" /></linearGradient>
        <clipPath id="sky-clip"><path d={ext ? `M${-ext} 0 H${W + ext} V${H + 2} H${-ext} Z` : `M0 18 Q0 0 18 0 H${W - 18} Q${W} 0 ${W} 18 V${H + 2} H0 Z`} /></clipPath>
      </defs>
      <g clip-path="url(#sky-clip)">
        {/* the sky and its own strip of land: solid over the field, gone as the village comes up (--sky-solid) */}
        <g class="sky-solid">
        <rect x={-ext} width={W + 2 * ext} height={H + 2} fill="url(#sky-grad)" />
        <path class="sky-land" d={`M${-ext} ${H - 26} L0 ${H - 26} Q${W * 0.16} ${H - 40} ${W * 0.33} ${H - 30} Q${W * 0.5} ${H - 44} ${W * 0.66} ${H - 32} Q${W * 0.82} ${H - 42} ${W} ${H - 30} L${W + ext} ${H - 30} V${H + 2} H${-ext} Z`} fill={hill} />
        {/* a dark strip of forest on the far right hill, where flocks gather */}
        <path class="sky-land" d={`M${W * 0.7} ${H - 34} q6 -12 12 0 q6 -14 12 0 q6 -10 12 0 q6 -13 12 0 q6 -11 12 0 V${H - 26} H${W * 0.7} Z`} fill={season === 3 ? '#c9d6de' : '#6f9a4a'} opacity={0.55} />
        <path class="sky-land" d={`M${-ext} ${H - 12} L0 ${H - 12} Q${W * 0.25} ${H - 22} ${W * 0.5} ${H - 14} Q${W * 0.75} ${H - 6} ${W} ${H - 16} L${W + ext} ${H - 16} V${H + 2} H${-ext} Z`} fill={front} opacity={0.9} />
        </g>
        <rect class="sky-veil" x={-ext} width={W + 2 * ext} height={H + 2} fill="url(#sky-veil)" />
        {/* the conveyor of weeks: keyed by the absolute week so a new week slides each picture one place closer */}
        {tokens.map((t, i) => {
          const s = slots[i];
          return (
            <g key={t.abs} class={`sky-token k${Math.min(t.k, 3)}${t.bad ? ' bad' : ''}`} style={{ transform: `translate(${s.x}px, ${s.y}px)` }}
              role="button" tabindex={0} aria-label={t.text} onClick={(e) => { e.stopPropagation(); onToken?.(t); }} onKeyDown={(e) => key(e, () => onToken?.(t))}>
              <g class="sky-token-scale" style={{ transform: `scale(${s.sc})` }}>
                <circle r={34} fill="transparent" />
                <SkyPicture kind={t.kind} />
              </g>
              <TempTag t={t.temp} sc={s.sc} />
              {t.k > 0 && <WeekChip k={t.k} sc={s.sc} />}
              <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
            </g>
          );
        })}
        {/* fog past the forecast */}
        {fogX < W - 8 && (
          <g class="sky-fogbank" role="button" tabindex={0} aria-label="Туман: дальше прогноза" onClick={(e) => { e.stopPropagation(); onFog?.(); }} onKeyDown={(e) => key(e, () => onFog?.())}>
            <rect class="sky-fog" x={fogX - 30} y={0} width={W - fogX + 30 + ext} height={H - 8} fill="url(#sky-fog)" />
            {[[0.2, 24], [0.45, 40], [0.12, 56]].map(([f, y], i) => (
              <path class="sky-wisp" d={`M${fogX + (W - fogX) * f} ${y} q10 -5 20 0 t20 0 t20 0`} stroke="#e2d9c6" stroke-width={3} fill="none" stroke-linecap="round" style={{ animationDelay: `${-i * 2.3}s` }} />
            ))}
            {!meteoMax && <g transform={`translate(${Math.min(W - 70, fogX + (W - fogX) * 0.38)} 46) scale(.55)`} opacity={0.5}>{icons.sensor()}</g>}
          </g>
        )}
        {/* the road from the field's gate up through the hills to the village on the horizon: over the fog,
            which hides the weather to come, not the land */}
        <VillageRoad W={W} H={H} winter={season === 3} />
        {kidsFar && (
          <g transform={`translate(${Math.min(W - 170, Math.max(W * 0.46, fogX + 10))} ${H - 37})`} class="sky-sign" role="button" tabindex={0} aria-label={kidsFar.text} onClick={(e) => { e.stopPropagation(); onSign?.(kidsFar); }} onKeyDown={(e) => key(e, () => onSign?.(kidsFar))}>
            <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
            <FarKids />
          </g>
        )}
      </g>
      {/* raids fly over the sky's edge */}
      {flock && (
        <g transform={`translate(${signX + (flock.ahead >= 2 ? 30 : 0)} ${flock.ahead >= 2 ? 30 : 34}) scale(${flock.ahead >= 2 ? 0.8 : 1.15})`} class="sky-sign" role="button" tabindex={0} aria-label={flock.text}
          onClick={(e) => { e.stopPropagation(); onSign?.(flock); }} onKeyDown={(e) => key(e, () => onSign?.(flock))}>
          <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
          <Flock far={flock.ahead >= 2} />
        </g>
      )}
      {swarm && (
        <g transform={`translate(${signX + (flock ? 52 : 10)} ${swarm.ahead >= 2 ? 60 : 56}) scale(${swarm.ahead >= 2 ? 0.62 : 0.9})`} class="sky-sign" role="button" tabindex={0} aria-label={swarm.text}
          onClick={(e) => { e.stopPropagation(); onSign?.(swarm); }} onKeyDown={(e) => key(e, () => onSign?.(swarm))}>
          <rect x={-hit / 2} y={-hit / 2} width={hit} height={hit} fill="transparent" />
          <Swarm far={swarm.ahead >= 2} />
        </g>
      )}
    </g>
  );
}
