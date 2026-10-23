// Builds a few late-game farms for screenshots (not a balance tool): node --import tsx tools/showcase.ts > out.json
import { apply, newGame, GameState, placements, cardBlockReason, buildSpots, Action, GameError, tile, ownedTiles } from '../src/engine/game';
import { CARDS, LocationId } from '../src/engine/data';

function tryA(s: GameState, a: Action): GameState {
  try { return apply(s, a); } catch (e) { if (e instanceof GameError) return s; throw e; }
}
function playWeek(s: GameState): GameState {
  for (let k = 0; k < 6; k++) {
    for (const c of [...s.hand]) {
      if (cardBlockReason(s, c)) continue;
      const d = CARDS[c.def];
      if (d.kind === 'seed') {
        const pl = placements(s, c);
        if (pl.length) s = tryA(s, { t: 'play', uid: c.uid, tiles: pl[0].tiles });
      } else if (c.def === 'water') {
        const dry = ownedTiles(s).find(([t]) => t.crop && t.moisture < 2);
        if (dry) s = tryA(s, { t: 'play', uid: c.uid, tiles: [[dry[1], dry[2]]] });
      }
    }
    const dry = ownedTiles(s).filter(([t]) => t.crop && t.moisture < 1);
    if (dry.length && s.days) s = tryA(s, { t: 'waterHand', tiles: [[dry[0][1], dry[0][2]]] });
  }
  for (const l of [...s.storage]) if (l.crop !== 'potato') s = tryA(s, { t: 'sell', crop: l.crop, qty: Math.floor(l.qty / 2) || l.qty });
  return s;
}
function build(loc: LocationId, weeks: number, seed: string): GameState {
  let s = newGame({ loc, seed });
  s = { ...s, money: 900 };
  for (let w = 0; w < weeks; w++) {
    s = playWeek(s);
    for (const o of Object.keys(s.orgs) as any[]) {
      s = tryA(s, { t: 'accept', org: o });
      s = tryA(s, { t: 'deliver', org: o });
    }
    if (s.phase === 'week') s = apply(s, { t: 'endWeek' });
    if (s.phase === 'shortfall') s = tryA(s, { t: 'emergency' });
    s.money = Math.max(s.money, 400);
  }
  return s;
}
const out: Record<string, GameState> = {};
// Черноземье, второй год, лето
let s = build('chernozem', 30, 'SHOW1');
s.levels = { ...s.levels, house: 3, irrigation: 2, greenhouse: 2, apiary: 2, guard: 1, barn: 1, meteo: 2, lab: 2, drone: 2, compost: 1, planning: 1 };
s.team = [{ id: 'foreman', level: 2, away: 0 }, { id: 'agronomist', level: 1, away: 0 }, { id: 'beekeeper', level: 1, away: 2 }];
s.pets = ['dog', 'cat'];
s.certs = ['Благодарность интерната', 'Почётная грамота сельсовета'];
s.glory = 64;
for (const item of ['greenhouse', 'hive', 'drip', 'scarecrow'] as const) {
  const sp = buildSpots(s, item);
  if (sp.length) s = tryA(s, { t: 'build', item, x: sp[sp.length - 1][0], y: sp[sp.length - 1][1] });
}
s.projects = [{ kind: 'track', track: 'barn', level: 2, weeks: 1, total: 2 }, { kind: 'variety', crop: 'tomato', weeks: 2, total: 4 }, { kind: 'trait', card: { uid: 9999, def: 'seed_wheat' }, trait: 'cold', weeks: 1, total: 3 }];
s.orgs.orphanage = { ...s.orgs.orphanage!, rel: -55 };
s.orgs.council = { ...s.orgs.council!, rel: 40, step: 2 };
s.storage = [{ crop: 'potato', qty: 22, age: 1 }, { crop: 'wheat', qty: 14, age: 0 }, { crop: 'carrot', qty: 9, age: 0 }, { crop: 'tomato', qty: 5, age: 1 }];
s.yard = [{ crop: 'cabbage', qty: 8, age: 0 }];
// a fuller field: a 4×4 plot with a mix of crops at different stages
const mix: [number, number, string, number][] = [
  [1, 1, 'carrot', 1], [2, 1, 'onion', 2], [3, 1, 'carrot', 3], [4, 1, 'radish', 1],
  [1, 2, 'potato', 2], [2, 2, 'potato', 2], [4, 2, 'bean', 2],
  [1, 3, 'corn', 3], [2, 3, 'corn', 3], [3, 3, 'pumpkin', 1], [4, 3, 'buckwheat', 2],
  [1, 4, 'wheat', 4], [2, 4, 'wheat', 4], [3, 4, 'cabbage', 0], [4, 4, 'sunflower', 3],
];
let pid = 500;
for (let y = 1; y <= 4; y++) for (let x = 1; x <= 4; x++) { const t = tile(s, x, y); t.owned = true; t.terrain = 'plain'; t.moisture = (x + y) % 4; t.soil = 1 + ((x * 3 + y) % 5); }
for (const [x, y, c, g] of mix) { const t = tile(s, x, y); if (t.structure === 'hive') continue; t.crop = { id: c as any, grown: g, bonus: 0, mult: 1, planted: 1, pid: pid++ }; }
tile(s, 3, 2).structure = 'greenhouse'; tile(s, 3, 2).crop = { id: 'tomato', grown: 1, bonus: 0, mult: 1, planted: 1, pid: pid++ };
tile(s, 4, 4).weeds = false; tile(s, 1, 1).mulch = 2; tile(s, 4, 1).shelter = 2;
s.scarecrows = [[1, 1]];
for (let x = 0; x < 6; x++) tile(s, x, 2).drip = true;
s.strikes = [{ kind: 'hail', ep: 1, week: s.absWeek, cells: [[3, 3, 0], [4, 3, 0], [4, 4, 0]], zone: true }];
const ripe = ownedTiles(s).filter(([t]) => t.crop).slice(0, 2);
s.thieves = { week: s.absWeek, targets: ripe.map(([t, x, y]) => ({ x, y, pid: t.crop!.pid })), talked: false };
s.crows = { week: s.absWeek, targets: [], shoo: false, drone: false };
out.chernozem = s;
// Кубань: каналы и рис
let k = build('kuban', 8, 'SHOW2');
k.levels = { ...k.levels, canal: 2 };
for (let i = 0; i < 3; i++) { const sp = buildSpots(k, 'canal'); if (sp.length) k = tryA(k, { t: 'build', item: 'canal', x: sp[0][0], y: sp[0][1] }); }
out.kuban = k;
// Алтай: зима
let a = build('altai', 19, 'SHOW3');
out.altai = a;
console.log(JSON.stringify(out));
