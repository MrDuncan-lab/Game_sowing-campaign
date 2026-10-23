// Is the first year winnable by plain sensible play? Not a balance tool.
import { apply, newGame, GameState, placements, cardBlockReason, Action, GameError, ownedTiles, placementYield, playableTargets, stockOf, deliverProblem, acceptProblem, nextPayment, growNote, tile, trackProblem, canBuyLand, deckList } from '../src/engine/game';
import { CARDS, LOCATION_IDS, LOCATIONS } from '../src/engine/data';
const tryA = (s: GameState, a: Action) => { try { return apply(s, a); } catch (e) { if (e instanceof GameError) return s; throw e; } };
function week(s: GameState): GameState {
  // keep the water flowing first
  for (let k = 0; k < 2 && s.days > 1; k++) {
    const dry = ownedTiles(s).filter(([t]) => t.crop && t.moisture < 1);
    if (!dry.length) break;
    s = tryA(s, { t: 'waterHand', tiles: [[dry[0][1], dry[0][2]]] });
  }
  // sow the best placement of each seed card, coldest-safe first
  for (let pass = 0; pass < 3; pass++)
    for (const c of [...s.hand]) {
      if (cardBlockReason(s, c)) continue;
      const d = CARDS[c.def];
      if (d.kind === 'seed') {
        const pl = placements(s, c).filter((p) => p.tiles.every(([x, y]) => !growNote({ ...s, tiles: s.tiles } as GameState, x, y)));
        const best = placements(s, c).sort((a, b) => placementYield(s, c, b.tiles) - placementYield(s, c, a.tiles))[0];
        if (best) s = tryA(s, { t: 'play', uid: c.uid, tiles: best.tiles });
        void pl;
      } else if (c.def === 'water' || c.def === 'mulch') {
        const dry = ownedTiles(s).filter(([t]) => t.crop && t.moisture < 2).sort((a, b) => a[0].moisture - b[0].moisture)[0];
        if (dry) s = tryA(s, { t: 'play', uid: c.uid, tiles: [[dry[1], dry[2]]] });
      } else if (c.def === 'fertilizer') {
        const tg = playableTargets(s, 'fertilizer')[0];
        if (tg && s.money > nextPayment(s).amount) s = tryA(s, { t: 'play', uid: c.uid, tiles: [tg] });
      } else if (c.def === 'sidejob') s = tryA(s, { t: 'play', uid: c.uid });
    }
  for (let k = 0; k < 4 && s.days > 0; k++) {
    const dry = ownedTiles(s).filter(([t]) => t.crop && t.moisture < 1);
    if (!dry.length) break;
    s = tryA(s, { t: 'waterHand', tiles: [[dry[0][1], dry[0][2]]] });
  }
  for (const o of LOCATIONS[s.loc].orgs) {
    if (!deliverProblem(s, o)) s = tryA(s, { t: 'deliver', org: o });
    const q = s.orgs[o]?.offer;
    if (q && !acceptProblem(s, o) && q.lines.every((l) => stockOf(s, l.crop) >= l.qty)) s = tryA(s, { t: 'accept', org: o });
  }
  const need = new Map<string, number>();
  for (const st of Object.values(s.orgs)) for (const l of st?.active?.lines ?? []) need.set(l.crop, (need.get(l.crop) ?? 0) + l.qty);
  for (const l of [...s.storage, ...s.yard]) {
    const keep = need.get(l.crop) ?? 0;
    const q = stockOf(s, l.crop) - keep;
    if (q > 0) s = tryA(s, { t: 'sell', crop: l.crop, qty: q });
  }
  if (s.money > nextPayment(s).amount + 80 && !trackProblem(s, 'irrigation')) s = tryA(s, { t: 'track', track: 'irrigation' });
  for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) if (s.money > nextPayment(s).amount + 60 && canBuyLand(s, x, y) && ownedTiles(s).filter(([t]) => !t.crop).length < 3) s = tryA(s, { t: 'buyLand', x, y });
  // a card that cannot be played for lack of room or warmth makes way for a new one
  if (s.days > 0 && s.hand.length >= 5) { const stuck = s.hand.find((c) => cardBlockReason(s, c) && cardBlockReason(s, c) !== 'Не хватает рабочих дней'); if (stuck) s = tryA(s, { t: 'discardCard', uid: stuck.uid }); }
  return s;
}
export { week };
if (process.env.DIAG) {
  let s = newGame({ loc: 'chernozem', seed: 'SAN1' });
  while (s.phase !== 'gameover' && s.year < 3) {
    if (s.phase === 'shortfall') { console.log('SHORTFALL', s.due, s.money); s = tryA(s, { t: 'emergency' }); if (s.phase === 'shortfall') s = tryA(s, { t: 'restructure' }); if (s.phase === 'shortfall') s = apply(s, { t: 'giveUp' }); continue; }
    s = week(s);
    const growing = ownedTiles(s).filter(([t]) => t.crop).map(([t]) => t.crop!.id[0]).join('');
    console.log(`y${s.year} ${['spr','sum','aut','win'][s.season]}${s.weekInSeason} T=${s.temps[s.week-1]} money=${s.money} owned=${ownedTiles(s).length} plants=${growing} barn=${s.storage.map(l=>l.crop+l.qty).join(',')} hand=${s.hand.map(c=>c.def.replace('seed_','')).join(',')} deck=${deckList(s).length}`);
    s = apply(s, { t: 'endWeek' });
    if (s.lastReport) { const r = s.lastReport; const h = r.harvests.reduce((a,x)=>a+x.qty,0); if (h || r.lost.length) console.log('   harvest', h, r.lost.join('; ')); }
  }
  console.log(s.over);
  process.exit(0);
}
for (const loc of LOCATION_IDS) {
  let alive1 = 0, alive2 = 0, n = 20, money: number[] = [];
  for (let k = 0; k < n; k++) {
    let s = newGame({ loc, seed: `SAN${k}` });
    while (s.phase !== 'gameover' && s.year < 3) {
      if (s.phase === 'shortfall') {
        s = tryA(s, { t: 'pay' });
        if (s.phase === 'shortfall') s = tryA(s, { t: 'emergency' });
        if (s.phase === 'shortfall') s = tryA(s, { t: 'restructure' });
        if (s.phase === 'shortfall') s = apply(s, { t: 'giveUp' });
        continue;
      }
      s = week(s);
      s = apply(s, { t: 'endWeek' });
    }
    if (s.year >= 2 || s.phase !== 'gameover') alive1++;
    if (s.year >= 3) alive2++;
    money.push(Math.round(s.money));
  }
  console.log(loc, 'survived year1', alive1, '/', n, 'year2', alive2, '/', n, 'money', money.join(','));
}
