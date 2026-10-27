import type { GameState, PestHit } from '../engine/game';
import { buildMorning, morningCellDelay, morningStep, type MorningStep } from './Morning';
import type { SceneCue } from './useSceneQueue';
import { bugBeds, crowMisses, kidDelay, kidMisses, pestMisses, sceneDuration } from './collisions';

export const SCENE_MS = 5200;
export const THEFT_IMPACT_MS = 2300;
export const THEFT_ARRIVAL_MS = 1500;
export const THEFT_STAGGER_MS = 150;
/** Each child sets off a little after the one before: the pull on its bed waits for it. */
export const theftStagger = (i: number) => kidDelay(i);
export const theftDelay = (cue?: SceneCue|null) => cue?.visit?.crows.length ? 500 : 0;
export const PEST_MS = 2300;
export const CALENDAR_MS = { enter: 300, tear: 650, settle: 150, fade: 200 };
export interface WeekEvent {
  id: string;
  duration: number;
  morning?: MorningStep;
  cue?: SceneCue;
  pests?: PestHit[];
}

/** The warnings a week event answers on the field (W-05): the kids at the yard and their footprints end when the
 *  children (or the dog, or the watchman) come; the flock on the fence when the crows go for the beds; the beetles
 *  and locusts on the plants when they eat (or the drone chases them); frost, drought, hail and flood with their
 *  own mornings. Until then the field keeps showing what was announced. */
export function eventKinds(e: WeekEvent): string[] {
  const out: string[] = [];
  const m = e.morning;
  if (m) {
    if (m.kind === 'crows' || m.kind === 'crowmiss') out.push('crows');
    else if (m.kind === 'bugmiss') m.cells.forEach(c => out.push(c.pest ?? 'beetle'));
    else out.push(m.kind);
  }
  e.pests?.forEach(h => out.push(h.kind));
  const c = e.cue;
  if (c) {
    if (c.kind === 'thieves' || c.kind === 'dogThieves' || c.kind === 'watchman') out.push('thieves');
    if (c.visit?.crows?.length) out.push('crows');
    if (c.kind === 'drone') out.push('beetle', 'locust');
  }
  return out;
}
/** The troubles still to come: everything in `rest` (FieldView also drops the kinds that have already begun). */
export const pendingKinds = (rest: WeekEvent[]) => new Set(rest.flatMap(eventKinds));

// A week's visual consequences have one owner. The state has already committed;
// the field keeps its old pictures until each corresponding action has happened.
export function buildWeekPlayback(prev: GameState, next: GameState, rate = 1.6, carried: SceneCue[] = []): WeekEvent[] {
  const events: WeekEvent[] = [];
  const old = new Set((prev.scenes ?? []).map(s => s.id));
  const cues:SceneCue[] = [...carried, ...(next.scenes ?? []).filter(s => !old.has(s.id))];
  const used = new Set<string>();
  const mornings = buildMorning(prev, next);
  // Meetings of the week's troubles on one bed (see collisions.ts).
  const bugs = bugBeds(next);
  const kids = kidMisses(prev, next);
  const kidExtras = { misses: kids, bugs: [...bugs].map(s => s.split(',').map(Number) as [number, number]) };
  for (const m of mornings) if (m.kind === 'crows') m.cells.forEach(c => { if (bugs.has(`${c.x},${c.y}`)) c.bugs = true; });
  const addCues = (kinds: SceneCue['kind'][]) => {
    for (const cue of cues.filter(c => kinds.includes(c.kind) && !used.has(c.id))) {
      used.add(cue.id);
      const directed={...cue,targets:cue.visit?.targets,managed:true,rate,...(cue.kind==='thieves'?kidExtras:{})};
      events.push({ id: cue.id, duration: Math.max(0,sceneDuration(directed)-(cue.elapsed??0)) / rate, cue: directed });
    }
  };
  const addMorning = (morning: MorningStep) => {
    let cue: SceneCue | undefined;
    if (morning.kind === 'thieves') {
      const theft = cues.find(c => c.kind === 'thieves' && !used.has(c.id));
      if (theft) used.add(theft.id);
      // Legacy reports may lack a scene cue. The actual damage still needs its actors.
      cue = { ...(theft ?? {id:`${next.absWeek}:theft-report:${morning.id}`,kind:'thieves',week:next.absWeek}),
        managed: true, rate, targets: morning.cells.map(c => [c.x,c.y]), ...kidExtras };
      morning = { ...morning, dur: sceneDuration(cue) / rate, reveal: (THEFT_IMPACT_MS+theftDelay(cue)) / rate };
    }
    // Every bed's visual starts slightly later. Keep the layer until its last
    // bird/weather effect has finished, not just until the first one has.
    const tail=morning.kind==='thieves'?0:Math.max(0,...morning.cells.map((_,i)=>morningCellDelay(i)));
    events.push({ id: `damage:${morning.id}`, duration: morning.dur+tail, morning, cue });
  };
  // Finish a scene already in motion before starting newly generated events.
  // Otherwise an approaching dog could suddenly yield to a drone after the calendar.
  for (const cue of carried.filter(c => (c.elapsed??0)>0)) {
    used.add(cue.id);
    events.push({id:cue.id,duration:Math.max(0,sceneDuration(cue)-cue.elapsed!)/rate,cue:{...cue,managed:true,rate}});
  }
  // Match the engine's order: weather → pests → children → birds → farm work.
  mornings.filter(m => !['crows','thieves'].includes(m.kind)).forEach(addMorning);
  addCues(['drone']);
  const hits = next.lastReport?.pestHits ?? [];
  // Repeated attacks on a bed keep their own before/after snapshots.
  let batch: PestHit[] = [];
  const flush = () => {
    if (batch.length) events.push({ id:`pests:${events.length}`,duration:PEST_MS,pests:batch });
    batch = [];
  };
  for (const hit of hits) {
    if (batch.some(h => h.x === hit.x && h.y === hit.y) || batch[0]?.kind !== hit.kind) flush();
    batch.push(hit);
  }
  flush();
  // Beetles and locusts sent to a bed the frost or the drought had already taken.
  const late = pestMisses(prev, next);
  if (late.length) addMorning(morningStep('bugmiss', late.map(m => ({ ...m, after: null }))));
  mornings.filter(m => m.kind === 'thieves').forEach(addMorning);
  addCues(['dogThieves','watchman','thieves']);
  mornings.filter(m => m.kind === 'crows').forEach(addMorning);
  // Crows that came for a plant something else had already taken.
  const empty = crowMisses(prev, next);
  if (empty.length) addMorning(morningStep('crowmiss', empty.map(m => ({ ...m, after: null }))));
  addCues(['geese']);
  return events;
}
