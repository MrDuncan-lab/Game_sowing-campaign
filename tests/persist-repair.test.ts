import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { LOCATION_IDS, SEED_BANK_OK } from '../src/engine/data';
import { apply, newGame, upgradeSpots } from '../src/engine/game';
import { isSeed } from '../src/engine/data';
import {
  allFarms, emptyProfile, farmRunId, hasFarmData, loadFarm, loadProfile, persistenceStatus,
  profileRecoveryRequired, recordEnd, saveFarm, saveProfile, subscribePersistence, syncFarm, syncProfile,
} from '../src/ui/persist';

const values = new Map<string, string>();
let failKey: string | null = null;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    if (key === failKey) throw new Error('Simulated storage quota');
    values.set(key, value);
  },
  removeItem: (key: string) => values.delete(key),
} });
const farmKey = 'posevnaya.v4.farm.chernozem';
const profileKey = 'posevnaya.v4.profile';
const farm = (seed = 'persist-test') => newGame({ loc: 'chernozem', seed });

beforeEach(() => {
  failKey = null;
  values.clear();
  // Reset the same success/error state that the application uses on retry.
  saveProfile(emptyProfile());
  for (const loc of LOCATION_IDS) saveFarm(newGame({ loc, seed: 'reset' }));
  values.clear();
  loadProfile();
  allFarms();
});

test('complete existing v4 farm/profile data round-trips for every region', () => {
  for (const loc of LOCATION_IDS) {
    const state = newGame({ loc, seed: `legacy-${loc}` });
    assert.equal(saveFarm(state), true);
    assert.deepEqual(loadFarm(loc), state);
  }
  const profile = emptyProfile();
  profile.settings.intro = true;
  profile.history.push({ loc: 'altai', years: 2, glory: 10, at: 123, reason: 'Legacy record' });
  assert.equal(saveProfile(profile), true);
  assert.deepEqual(loadProfile(), profile);
});

test('partial and malformed farm saves are rejected without deleting or replacing the original', () => {
  const valid = farm();
  const broken = [
    '{invalid JSON',
    JSON.stringify({ v: 5, loc: 'chernozem', tiles: Array(36).fill({}) }),
    ...['pets', 'rewardsOut', 'stats', 'demand', 'report', 'hand', 'orgs', 'projects', 'flags', 'over'].map((key) => {
      const copy: Record<string, unknown> = { ...structuredClone(valid) };
      delete copy[key];
      return JSON.stringify(copy);
    }),
    JSON.stringify({ ...valid, tiles: [{ ...valid.tiles[0], crop: { id: 'unknown' } }, ...valid.tiles.slice(1)] }),
    JSON.stringify({ ...valid, hand: [{ uid: 1, def: 'unknown' }] }),
  ];
  for (const raw of broken) {
    values.set(farmKey, raw);
    assert.equal(loadFarm('chernozem'), null);
    assert.equal(values.get(farmKey), raw);
    assert.match(persistenceStatus(), /повреждено/);
    assert.equal(saveFarm(valid), false);
    assert.equal(values.get(farmKey), raw);
  }
});

test('a corrupt main farm recovers the last complete backup and preserves corrupt bytes on repair', () => {
  const original = farm();
  const advanced = { ...original, money: original.money + 7 };
  assert.equal(saveFarm(original), true);
  assert.equal(saveFarm(advanced), true);
  values.set(farmKey, '{broken');
  assert.deepEqual(loadFarm('chernozem'), original);
  assert.match(persistenceStatus(), /резервная копия/);
  assert.equal(values.get(farmKey), '{broken');
  assert.equal(saveFarm(original), true);
  assert.equal(values.get(`${farmKey}.recovery`), '{broken');
  assert.deepEqual(loadFarm('chernozem'), original);
  assert.equal(persistenceStatus(), '');
});

test('out-of-range upgrade and worker levels recover a valid snapshot instead of crashing their screens', () => {
  const original = farm('valid-levels');
  const broken = [
    ...[0, -1, 1.5, 99].map(level => ({ ...original, levels: { ...original.levels, house: level } })),
    ...[-1, 1.5, 99].map(level => ({ ...original, levels: { ...original.levels, lab: level } })),
    ...[0, -1, 1.5, 99].map(level => ({ ...original, projects: [{ kind: 'track', track: 'lab', level, weeks: 1, total: 2 }] })),
    ...[0, -1, 1.5, 99].map(level => ({ ...original, team: [{ id: 'agronomist', level, away: 0 }] })),
    ...[-1, 1.5].map(away => ({ ...original, team: [{ id: 'agronomist', level: 1, away }] })),
  ];
  for (const state of broken) {
    const raw = JSON.stringify(state);
    values.set(farmKey, raw);
    values.set(`${farmKey}.backup`, JSON.stringify(original));
    assert.deepEqual(loadFarm('chernozem'), original);
    assert.match(persistenceStatus(), /резервная копия/);
    assert.equal(values.get(farmKey), raw, 'reading preserves the damaged slot');
    values.delete(`${farmKey}.backup`);
    assert.equal(loadFarm('chernozem'), null);
    assert.equal(values.get(farmKey), raw);
  }
});

test('failed backup and failed replacement retain the old live slot and expose a persistent retry status', () => {
  const original = farm();
  saveFarm(original);
  const raw = values.get(farmKey);
  const replacement = farm('new-attempt');
  let notified = 0;
  const unsubscribe = subscribePersistence(() => notified++);
  for (const key of [`${farmKey}.previous`, `${farmKey}.backup`, farmKey]) {
    failKey = key;
    assert.equal(saveFarm(replacement, true), false);
    assert.equal(values.get(farmKey), raw);
    assert.match(persistenceStatus(), /не сохран(ён|ена):/);
    // Visiting the map must not clear a failed write by merely reading old data.
    allFarms();
    assert.match(persistenceStatus(), /не сохран(ён|ена):/);
  }
  failKey = null;
  assert.equal(saveFarm(replacement, true), true);
  assert.equal(persistenceStatus(), '');
  assert.ok(notified > 0);
  unsubscribe();
});

test('an intentional replacement archives the prior run independently of rolling autosave backups', () => {
  const original = farm('closed-run');
  saveFarm(original);
  const raw = values.get(farmKey);
  const replacement = farm('new-run');
  assert.equal(saveFarm(replacement, true), true);
  assert.equal(saveFarm({ ...replacement, money: replacement.money + 1 }), true);
  assert.equal(values.get(`${farmKey}.previous`), raw);
  assert.equal(JSON.parse(values.get(`${farmKey}.backup`)!).seed, replacement.seed);
});

test('corrupt data without a backup requires explicit replacement and is retained for recovery', () => {
  values.set(farmKey, '{unreadable');
  assert.equal(hasFarmData('chernozem'), true);
  assert.equal(loadFarm('chernozem'), null);
  assert.equal(saveFarm(farm()), false);
  assert.equal(saveFarm(farm(), true), true);
  assert.equal(values.get(`${farmKey}.recovery`), '{unreadable');
  assert.equal(loadFarm('chernozem')?.seed, 'persist-test');
});

test('corrupt profile uses a valid backup, or requires an explicit recovery decision before replacement', () => {
  const profile = { ...emptyProfile(), glory: 41 };
  saveProfile(profile);
  saveProfile({ ...profile, glory: 42 });
  values.set(profileKey, '{broken profile');
  assert.deepEqual(loadProfile(), profile);
  assert.equal(saveProfile(profile), true);
  assert.equal(values.get(`${profileKey}.recovery`), '{broken profile');

  values.delete(`${profileKey}.backup`);
  values.set(profileKey, JSON.stringify({ v: 1, glory: 'not a number' }));
  assert.deepEqual(loadProfile(), emptyProfile());
  assert.equal(profileRecoveryRequired(), true);
  assert.equal(saveProfile(emptyProfile()), false);
  assert.equal(saveProfile(emptyProfile(), true), true);
  assert.equal(profileRecoveryRequired(), false);
  assert.equal(JSON.parse(values.get(`${profileKey}.recovery`)!).glory, 'not a number');
});

test('seed-bank discoveries reach previously created eligible farms once without injecting any cards', () => {
  const profile = emptyProfile();
  profile.seedBank = ['strawberry', 'cranberry', 'rice', 'watermelon', 'seabuckthorn'];
  profile.pets = ['cat'];
  for (const loc of LOCATION_IDS) {
    const existing = newGame({ loc, seed: `already-exists-${loc}` });
    const synced = syncFarm(profile, existing);
    for (const crop of profile.seedBank) {
      assert.equal(synced.unlocked.includes(crop), existing.unlocked.includes(crop) || !!SEED_BANK_OK[crop]?.includes(loc));
    }
    for (const key of ['draw', 'hand', 'discard', 'spare', 'rewardsOut'] as const) assert.deepEqual(synced[key], existing[key]);
    assert.equal(new Set(synced.unlocked).size, synced.unlocked.length);
    assert.equal(syncFarm(profile, synced), synced);
    assert.equal(saveFarm(synced), true);
    assert.deepEqual(loadFarm(loc)?.unlocked, synced.unlocked);
  }
});

test('more than 4000 reward IDs survive profile reload and old farm rewards never pay twice', () => {
  const state = farm();
  state.rewardsOut = Array.from({ length: 4505 }, (_, i) => ({ id: `${state.seed}|${i}`, kind: 'glory' as const, value: 1 }));
  const profile = syncProfile(emptyProfile(), state);
  assert.equal(profile.glory, 4505);
  assert.equal(profile.applied.length, 4505);
  assert.equal(saveProfile(profile), true);
  const restored = loadProfile();
  assert.equal(syncProfile(restored, state), restored);
  const oldest = { ...state, rewardsOut: state.rewardsOut.slice(0, 2) };
  assert.equal(syncProfile(restored, oldest).glory, 4505);
});

test('history deduplicates a single run but preserves equal results from different seeds and restarts', () => {
  const one = farm('attempt-one');
  const two = farm('attempt-two');
  let profile = recordEnd(emptyProfile(), one);
  assert.equal(profile.history[0].reason, 'Перезапуск');
  assert.equal(profile.history[0].runId, farmRunId(one));
  assert.equal(recordEnd(profile, one), profile);
  profile = recordEnd(profile, two);
  assert.equal(profile.history.length, 2);
  assert.notEqual(profile.history[0].runId, profile.history[1].runId);
  assert.equal(saveProfile(profile), true);
  assert.equal(recordEnd(loadProfile(), two).history.length, 2);
});

test('valid states continue loading through an actual year of engine transitions', () => {
  for (const loc of LOCATION_IDS) {
    let state = newGame({ loc, seed: `progress-${loc}` });
    for (let i = 0; i < 42; i++) {
      state = { ...state, money: 10000 };
      if (state.phase === 'shortfall') state = apply(state, { t: 'pay' });
      if (state.phase === 'gameover') break;
      state = apply(state, { t: 'endWeek' });
      assert.equal(saveFarm(state), true, `${loc}, week ${i}`);
      assert.deepEqual(loadFarm(loc), JSON.parse(JSON.stringify(state)));
    }
  }
});

test('laboratory projects and completed shapes preserve negative relative coordinates', () => {
  let state = farm('negative-lab-cell');
  state.money = 10000;
  state.levels.lab = 1;
  const seed = state.draw.find((c) => isSeed(c.def))!;
  const cell = upgradeSpots(state, seed).find(([x, y]) => x < 0 || y < 0)!;
  assert.ok(cell, 'a shape can grow above or left of its original origin');
  state = apply(state, { t: 'labCell', uid: seed.uid, cell });
  assert.equal(saveFarm(state), true);
  assert.deepEqual(loadFarm(state.loc), JSON.parse(JSON.stringify(state)));
  for (let i = 0; i < 4; i++) state = apply(state, { t: 'endWeek' });
  const completed = [...state.draw, ...state.discard, ...state.hand, ...state.spare].find((c) => c.uid === seed.uid)!;
  assert.ok(completed.extra?.some(([x, y]) => x < 0 || y < 0));
  assert.equal(saveFarm(state), true);
  assert.deepEqual(loadFarm(state.loc), JSON.parse(JSON.stringify(state)));
});
