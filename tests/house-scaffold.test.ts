// 28.10 · a house under construction stands in scaffolding again: on the House screen (the estate) and in the
// village, in three stages by the share of the work done. The new level shows only when it is finished.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/engine/game';
import { V_SUMMER, V_WINTER } from '../src/art/village/chernozem';
import { ES_SUMMER, ES_WINTER } from '../src/art/village/estate';

const quiet = () => {
  const s = G.newGame({ loc: 'chernozem', seed: 'SCAFFOLD-2810' });
  s.money = 5000; s.plan = []; s.strikes = []; s.temps = s.temps.map(() => 15);
  return s;
};

test('the house project goes through scaffold stages 1, 2, 3 and comes out of them finished', () => {
  let s = quiet();
  assert.equal(G.buildStage(s, 'house'), 0, 'nothing is being built');
  // build up to the cellar first so the next level takes several weeks
  s = G.apply(s, { t: 'track', track: 'house' });
  const p = s.projects.find((x) => x.kind === 'track' && x.track === 'house')!;
  assert.ok(p, 'the house is being built');
  const seen: number[] = [G.buildStage(s, 'house')];
  for (let i = 0; i < 12 && s.projects.some((x) => x.kind === 'track' && x.track === 'house'); i++) {
    s = G.endWeek(s);
    seen.push(G.buildStage(s, 'house'));
  }
  assert.equal(seen[0], 1, 'the work starts with the materials brought');
  assert.equal(seen[seen.length - 1], 0, 'the scaffolding comes down when the level is finished');
  for (let i = 1; i < seen.length - 1; i++) assert.ok(seen[i] >= seen[i - 1], 'stages only go up');
});

test('stages follow the share of the weeks done', () => {
  const s = quiet();
  s.projects = [{ kind: 'track', track: 'house', level: 3, weeks: 6, total: 6 }];
  assert.equal(G.buildStage(s, 'house'), 1);
  s.projects = [{ kind: 'track', track: 'house', level: 3, weeks: 3, total: 6 }];
  assert.equal(G.buildStage(s, 'house'), 2);
  s.projects = [{ kind: 'track', track: 'house', level: 3, weeks: 1, total: 6 }];
  assert.equal(G.buildStage(s, 'house'), 3);
  assert.equal(G.buildStage(s, 'lab'), 0, 'another track is not the house');
});

test('the estate and the village carry three scaffold drawings in summer and winter', () => {
  for (const d of [ES_SUMMER, ES_WINTER]) {
    assert.equal(d.scaffold.length, 3);
    for (const svg of d.scaffold) assert.ok(svg.length > 1000 && svg.includes('<path'));
  }
  for (const d of [V_SUMMER, V_WINTER]) {
    const svg = d.layers.map((l) => l.svg).join('');
    for (const st of [1, 2, 3]) assert.equal(svg.split(`vc vc-build${st}`).length - 1, 1, `one stage-${st} scaffold in the village`);
  }
});
