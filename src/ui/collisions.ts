// When one trouble of the week gets to a bed before another one does.
// The engine resolves the week in a fixed order — weather → pests → children → crows — and a later
// visitor whose bed is already gone simply finds nothing. These are those meetings, read from the two
// states and the week's report, so the field can show them: beetles skidding on a frozen bed, a child
// sneezing over a dried-up stalk, a crow that came for a plant the frost had already taken.
// Nothing here changes the game; it only explains what the report already says.
import type { GameState } from '../engine/game';
import { tile, underScarecrow } from '../engine/game';

/** What took the plant before the late visitor arrived. `gone` — nothing we can name (a cover, the player). */
export type MissCause = 'frost' | 'dry' | 'locust' | 'gone';
export interface Miss { x: number; y: number; cause: MissCause; pest?: 'beetle' | 'locust' }

const k = (x: number, y: number) => `${x},${y}`;

/** The first thing that killed the plant on each bed this week. */
export function killers(next: GameState): Map<string, MissCause> {
  const m = new Map<string, MissCause>();
  const r = next.lastReport;
  for (const d of r?.fieldDamage ?? []) if (!d.after && (d.kind === 'frost' || d.kind === 'dry') && !m.has(k(d.x, d.y))) m.set(k(d.x, d.y), d.kind);
  for (const h of r?.pestHits ?? []) if (h.after === null && h.kind === 'locust' && !m.has(k(h.x, h.y))) m.set(k(h.x, h.y), 'locust');
  return m;
}

/** Beds where beetles chewed the plant but left it standing: the next visitor finds beetles on it. */
export function bugBeds(next: GameState): Set<string> {
  return new Set((next.lastReport?.pestHits ?? []).filter((h) => h.kind === 'beetle' && h.after).map((h) => k(h.x, h.y)));
}

/** Beetles or locusts that were sent to a bed the weather had already killed. */
export function pestMisses(prev: GameState, next: GameState): Miss[] {
  // a drone sortie is its own scene: the bugs fled, they did not look around
  if ((next.scenes ?? []).some((e) => e.id === `${prev.absWeek}:drone`)) return [];
  const dead = killers(next), hits = next.lastReport?.pestHits ?? [], out: Miss[] = [];
  for (const st of prev.strikes.filter((x) => x.week === prev.absWeek && (x.kind === 'beetle' || x.kind === 'locust'))) {
    for (const [x, y, pid] of st.cells) {
      const t = tile(prev, x, y), cause = dead.get(k(x, y));
      if (!t.crop || t.structure === 'greenhouse' || (!st.zone && t.crop.pid !== pid) || t.crop.traits?.includes('tough')) continue;
      if (cause !== 'frost' && cause !== 'dry') continue;
      if (hits.some((h) => h.x === x && h.y === y && h.kind === st.kind) || out.some((m) => m.x === x && m.y === y)) continue;
      out.push({ x, y, cause, pest: st.kind as 'beetle' | 'locust' });
    }
  }
  return out;
}

/** The children's beds that held nothing to take by the time they came. With nothing stolen at all, every bed
 *  is a miss (named or not); otherwise only the beds whose loss we can name get their own child. */
export function kidMisses(prev: GameState, next: GameState): Miss[] {
  const th = prev.thieves;
  const visit = (next.scenes ?? []).find((e) => e.id === `${prev.absWeek}:thieves`)?.visit;
  if (!th || th.week !== prev.absWeek || th.talked || !visit) return [];
  const dead = killers(next);
  const stolen = new Set(visit.outcome === 'stolen' ? visit.targets.map(([x, y]) => k(x, y)) : []);
  return th.targets.filter((g) => !stolen.has(k(g.x, g.y)))
    .map((g) => ({ x: g.x, y: g.y, cause: dead.get(k(g.x, g.y)) ?? 'gone' as MissCause }))
    .filter((m) => visit.outcome === 'empty' || m.cause !== 'gone');
}

/** Crows that came for a plant something else had already taken. */
export function crowMisses(prev: GameState, next: GameState): Miss[] {
  const c = prev.crows;
  if (!c || c.week !== prev.absWeek || c.shoo || c.drone) return [];
  const dead = killers(next);
  const visit = (next.scenes ?? []).find((e) => e.id === `${prev.absWeek}:thieves`)?.visit;
  const chased = new Set((visit?.crows ?? []).map(([x, y]) => k(x, y)));
  const pecked = new Set((next.lastReport?.fieldDamage ?? []).filter((d) => d.kind === 'crows').map((d) => k(d.x, d.y)));
  return c.targets.filter((g) => {
    const t = tile(prev, g.x, g.y), key = k(g.x, g.y);
    return t.crop?.pid === g.pid && t.structure !== 'greenhouse' && !underScarecrow(prev, g.x, g.y) && !chased.has(key) && !pecked.has(key) && dead.has(key);
  }).map((g) => ({ x: g.x, y: g.y, cause: dead.get(k(g.x, g.y))! }));
}

// The four orphanage children: each one looks and moves differently, so a raid of three or four
// does not read as one child copied. 0 — Петька in the green cap, 1 — Галя in the red kerchief,
// 2 — little Сёмка in a pom-pom hat, 3 — tall Витёк in a flat cap, the lookout.
export const KID_DELAY_MS = [0, 150, 300, 450];
export const kidDelay = (i: number) => KID_DELAY_MS[i % 4];

/** Native animation milliseconds, including the last child's delayed exit. */
export function sceneDuration(cue:{kind:string;targets?:unknown[];visit?:{outcome:string;targets:unknown[]};misses?:unknown[]}):number {
  if(cue.kind!=='thieves')return 5200;
  const stolen=cue.visit?.outcome==='empty'?0:(cue.targets?.length??cue.visit?.targets.length??2);
  const missed=cue.misses?.length||(cue.visit?.outcome==='empty'?(cue.targets?.length??cue.visit.targets.length):0);
  const last=kidDelay(Math.max(0,Math.min(4,stolen+missed)-1));
  return Math.max(5200,5000+last+100);
}
