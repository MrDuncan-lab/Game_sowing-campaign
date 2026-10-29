import {Tutorial} from './Tutorial';
import {TestLab} from './TestLab';
import { useEffect, useRef, useState } from 'preact/hooks';
import { EXPEDITION_IDS, rankOf, type ExpeditionId, type LocationId } from '../engine/data';
import { RankUp } from './RankUp';
import { Action, GameError, GameState, apply, newGame, randomSeed, startArrest } from '../engine/game';
import { depart as departRun, recallCart, settleRun, type Cart } from '../engine/meta';
import type { PlotOffer } from '../engine/run';
import { FarmScreen } from './FarmScreen';
import { MapScreen } from './MapScreen';
import { Profile, allFarms, checkSaveSession, hasFarmData, loadFarm, loadProfile, persistenceStatus, profileRecoveryRequired, recordEnd, resetPersistenceSession, saveFarm, saveProfile, subscribePersistence, syncFarm, syncProfile, writeSessionStorage } from './persist';
import { saveSession } from './saveSession';
import { Intro } from './Intro';
import { Btn, Sheet } from './common';

export function App() {
  const [session, setSession] = useState(saveSession.status);
  const loadedGeneration = useRef(-1);
  useEffect(() => {
    const unsubscribe = saveSession.subscribe(() => setSession(saveSession.status()));
    const resume = () => { void saveSession.acquire(); };
    window.addEventListener('pageshow', resume);
    void saveSession.acquire();
    return () => { unsubscribe(); window.removeEventListener('pageshow', resume); saveSession.release(); };
  }, []);
  if (session.state === 'owner') {
    if (loadedGeneration.current !== session.generation) {
      resetPersistenceSession();
      loadedGeneration.current = session.generation;
    }
    return <OwnedApp key={session.generation}/>;
  }
  const stale = session.state === 'stale', unsupported = session.state === 'unsupported', checking = session.state === 'checking';
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '20px' }}>
    <section class="sheet" role="status" aria-live="polite" style={{ width: 'min(100%, 460px)', padding: '24px' }}>
      <h2>{checking ? 'Открываем ферму…' : stale ? 'Сохранение обновилось' : unsupported ? 'Не удалось защитить сохранение' : 'Игра открыта в другой вкладке'}</h2>
      {!checking && <p>{stale
        ? 'Другая вкладка изменила прогресс. Обновите страницу, чтобы продолжить с последнего сохранения.'
        : unsupported
          ? 'В этом браузере недоступна безопасная запись игры. Сохранения не изменены. Попробуйте открыть игру в другом браузере.'
          : 'Закройте другую вкладку с игрой, затем продолжите здесь. Ваш прогресс сохранится.'}</p>}
      {!checking && !unsupported && <Btn tone="primary" onClick={() => stale ? window.location.reload() : void saveSession.acquire()}>{stale ? 'Обновить страницу' : 'Продолжить здесь'}</Btn>}
    </section>
  </main>;
}

function OwnedApp() {
  const [tutorial,setTutorial]=useState(()=>{try{return window.location.hash!=='#test'&&(window.location.hash==='#learn'||localStorage.getItem('posevnaya.tutorial.active')==='1');}catch{return window.location.hash==='#learn';}});
  useEffect(()=>{writeSessionStorage('posevnaya.tutorial.active',tutorial?'1':null);},[tutorial]);
  const [testRegion,setTestRegion]=useState<LocationId>('chernozem');
  const [testing,setTesting]=useState(()=>window.location.hash==='#test');
  // ST-05 · a farm stored before an interrupted profile write already counts: its rewards are applied by id, once
  const [profile, setProfile] = useState<Profile>(() => {
    const stored = loadProfile();
    const p = Object.values(allFarms()).reduce((acc, f) => (f ? syncProfile(acc, f) : acc), stored);
    if (p !== stored) saveProfile(p);
    return p;
  });
  const [farms, setFarmsState] = useState(() => allFarms());
  const farmsRef = useRef(farms);
  const setFarms = (f: typeof farms) => { farmsRef.current = f; setFarmsState(f); };
  const [departFor, setDepartFor] = useState<{ loc: ExpeditionId; key: number } | null>(null);
  const [rankUp, setRankUp] = useState<number | null>(null);
  const [s, setS] = useState<GameState | null>(null);
  const [saveStatus, setSaveStatus] = useState(persistenceStatus);
  const [recoverProfile, setRecoverProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errTimer = useRef<number | null>(null);
  const sRef = useRef<GameState | null>(null);
  sRef.current = s;
  const profRef = useRef(profile);
  profRef.current = profile;

  /** 29.10 · a new rank tells what it opens (whichever way the glory came: a week, a closed farm, a departure) */
  function noteRank(p: Profile) {
    if (rankOf(p.glory).index > rankOf(profRef.current.glory).index) setRankUp(rankOf(p.glory).index);
  }
  function commitProfile(p: Profile) {
    if (!checkSaveSession()) return false;
    noteRank(p);
    if (p !== profRef.current) {
      profRef.current = p;
      setProfile(p);
      saveProfile(p);
    }
    return true;
  }
  /** v3 · a finished expedition hands over to the home it came from (once): the home is saved first, then the run
   *  is marked settled — an interrupted pair settles again on the next start */
  function settle(run: GameState): GameState {
    if (!run.run || run.phase !== 'gameover' || run.run.result?.settled) return run;
    const home = farmsRef.current.chernozem ?? loadFarm('chernozem');
    // a home slot that exists but cannot be read now (corrupt, storage out) is not «no home»: settle later
    if (!home && hasFarmData('chernozem')) return run;
    const r = settleRun(home, run);
    if (!r) return run;
    if (r.home && r.home !== home) {
      if (!saveFarm(r.home)) return run;
      const p = syncProfile(profRef.current, r.home);
      commitProfile(r.home.phase === 'gameover' && !r.home.over?.work ? recordEnd(p, r.home) : p);
      setFarms({ ...farmsRef.current, chernozem: r.home });
    }
    return r.run;
  }
  function show(next: GameState, saved = false) {
    if (!checkSaveSession()) return null;
    next = syncFarm(profRef.current, next);
    const settled = settle(next);
    if (settled !== next) { next = settled; saved = false; }
    sRef.current = next;
    setS(next);
    // ST-05 · the profile follows the stored farm: a week that is not saved hands out no profile rewards yet
    // (play goes on in memory; «Сохранить» writes the farm and then the profile)
    if (!saved && !saveFarm(next)) return checkSaveSession() ? next : null;
    if (!checkSaveSession()) return null;
    let p = syncProfile(profRef.current, next);
    // a bankrupt home that can still be worked off is not over yet (v3 §3.3)
    if (next.phase === 'gameover' && !next.over?.work) p = recordEnd(p, next);
    commitProfile(p);
    if (next.loc === 'chernozem') farmsRef.current = { ...farmsRef.current, chernozem: next };
    return next;
  }
  // on start: an expedition that ended while the game was closed between two saves settles; a cart whose
  // expedition never got written (or was lost) comes back home with its cards and worker
  useEffect(() => {
    for (const l of EXPEDITION_IDS) {
      const f = farmsRef.current[l];
      if (!f?.run || f.phase !== 'gameover' || f.run.result?.settled) continue;
      const done = settle(f);
      if (done !== f && saveFarm(done)) setFarms({ ...farmsRef.current, [l]: done });
    }
    const home = farmsRef.current.chernozem;
    const away = home?.away;
    const slot = away ? farmsRef.current[away.loc] : undefined;
    // the slot holds another farm, or nothing at all (an unreadable slot waits: it may still be recovered)
    if (home && away && (slot ? slot.seed !== away.seed : !hasFarmData(away.loc))) {
      const back = recallCart(home);
      if (saveFarm(back)) setFarms({ ...farmsRef.current, chernozem: back });
    }
  }, []);
  /** the cart leaves the home: the home is stored without what it took, the expedition starts */
  function depart(loc: ExpeditionId, offer: PlotOffer, cart: Cart, seed: string) {
    if (!checkSaveSession()) return;
    setDepartFor(null);
    const home = farmsRef.current.chernozem ?? loadFarm('chernozem');
    if (!home) return;
    let pair: { home: GameState; run: GameState };
    try { pair = departRun(home, loc, offer, cart, seed, profRef.current); }
    catch (e) { if (e instanceof GameError) { setError(e.message); return; } throw e; }
    const previous = farmsRef.current[loc] ?? loadFarm(loc);
    if (previous && !saveFarm(previous)) return;
    if (previous) {
      const closed = recordEnd(syncProfile(profRef.current, previous), previous);
      if (closed !== profRef.current && !saveProfile(closed)) return;
      noteRank(closed);
      profRef.current = closed;
      setProfile(closed);
    }
    if (!saveFarm(pair.home)) return;
    setFarms({ ...farmsRef.current, chernozem: pair.home });
    if (!saveFarm(pair.run, true) && previous) {
      // the expedition could not be written over the old farm: the cart turns back
      const back = recallCart(pair.home);
      if (saveFarm(back)) setFarms({ ...farmsRef.current, chernozem: back });
      return;
    }
    show(pair.run, true);
  }
  /** a bankrupt mortgaged home goes to work off its debt: the house is under arrest */
  function goWork() {
    const cur = sRef.current;
    if (!cur || cur.loc !== 'chernozem') return;
    try { show(startArrest(cur)); } catch (e) { if (e instanceof GameError) setError(e.message); else throw e; }
  }
  const dispatch = (a: Action): GameState | null => {
    const cur = sRef.current;
    if (!cur || !checkSaveSession()) return null;
    try {
      const next = apply(cur, a);
      return show(next);
    } catch (e) {
      if (e instanceof GameError) {
        setError(e.message);
        if (errTimer.current) clearTimeout(errTimer.current);
        errTimer.current = window.setTimeout(() => setError(null), 2600);
        return null;
      }
      throw e;
    }
  };
  function open(l: LocationId) {
    if (!checkSaveSession()) return;
    const f = farmsRef.current[l] ?? loadFarm(l);
    if (!f) return startNew(l);
    show(syncFarm(profRef.current, f));
  }
  function startNew(l: LocationId) {
    if (!checkSaveSession()) return;
    const previous = sRef.current?.loc === l ? sRef.current : farmsRef.current[l] ?? loadFarm(l);
    // Include a unique attempt token in the seed; reward IDs and history now
    // distinguish two otherwise identical restarts without engine changes.
    const seed = `${randomSeed()}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${randomSeed()}`}`;
    const g = newGame({ loc: l, seed, pets: profRef.current.pets, seedBank: profRef.current.seedBank });
    if (previous && !saveFarm(previous)) return;
    if (previous) {
      // ST-05/ST-06 · the closed run's rewards reach the stored profile before its live slot is replaced
      const closed = recordEnd(syncProfile(profRef.current, previous), previous);
      if (closed !== profRef.current && !saveProfile(closed)) return;
      noteRank(closed);
      profRef.current = closed;
      setProfile(closed);
    }
    // ST-10 · with nothing to protect (no earlier run) a refused write still lets the farm be played in this tab
    if (!saveFarm(g, true) && previous) return;
    show(g, true);
  }
  function toMap() {
    if (!checkSaveSession()) return;
    const current = sRef.current;
    // Keep unsaved progress in memory while the user visits another region.
    // A quota error must not turn map navigation into a rollback.
    setFarms({ ...allFarms(), ...farmsRef.current, ...(current ? { [current.loc]: current } : {}) });
    sRef.current = null;
    setS(null);
  }
  useEffect(() => {
    setSaveStatus(persistenceStatus());
    return subscribePersistence(() => setSaveStatus(persistenceStatus()));
  }, []);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const t = (e: KeyboardEvent) => {
      if (e.key === 'F9' && sRef.current) {
        // a debug shortcut: money for testing the late game
        show({ ...sRef.current, money: sRef.current.money + 1000 });
      }
    };
    window.addEventListener('keydown', t);
    return () => window.removeEventListener('keydown', t);
  }, []);
  function retrySave() {
    if (!checkSaveSession()) return;
    // ST-05 · once the farm is stored, the profile catches up with its rewards
    if (sRef.current && saveFarm(sRef.current)) show(sRef.current, true);
    saveProfile(profRef.current);
    if (!sRef.current) {
      const existing = { ...allFarms(), ...farmsRef.current };
      for (const farm of Object.values(existing)) if (farm) saveFarm(farm);
      setFarms(existing);
    }
  }
  const screen = !profile.settings.intro
    ? <Intro onDone={(guide) => {commitProfile({ ...profRef.current, settings: { ...profRef.current.settings, intro: true, guide } });if(guide)setTutorial(true);}} />
    : !s ? <MapScreen onTutorial={()=>setTutorial(true)} profile={profile} farms={farms} onOpen={open} onNew={startNew} onDepart={depart} departFor={departFor} onTest={(loc)=>{setTestRegion(loc ?? 'chernozem');setTesting(true);}} /> : (
      <FarmScreen
        key={`${s.loc}|${s.seed}`}
        s={s}
        dispatch={dispatch}
        profile={profile}
        fast={profile.settings.fast}
        onFast={() => commitProfile({ ...profRef.current, settings: { ...profRef.current.settings, fast: !profRef.current.settings.fast } })}
        onMap={toMap}
        onRestart={() => s.loc === 'chernozem' ? startNew(s.loc) : (toMap(), setDepartFor({ loc: s.loc as ExpeditionId, key: Date.now() }))}
        onHome={() => { toMap(); open('chernozem'); }}
        onWork={goWork}
        onExpedition={(l) => { toMap(); setDepartFor({ loc: l, key: Date.now() }); }}
        error={error}
        onTest={()=>{setTestRegion(s.loc);setTesting(true);}}
        suspended={rankUp !== null}
      />
    );
  const leaveTutorial=()=>{commitProfile({...profRef.current,settings:{...profRef.current.settings,intro:true}});setTutorial(false);if(window.location.hash==='#learn')history.replaceState(null,'',location.pathname+location.search);};
  // 29.10 · «Своя ферма» after the lesson goes straight home: the home that is there, or a new one (its first morning)
  if(tutorial)return <Tutorial profile={profile} onExit={leaveTutorial} onOwn={()=>{leaveTutorial();const home=farmsRef.current.chernozem??loadFarm('chernozem');if(home&&(home.phase!=='gameover'||home.over?.work!==undefined))open('chernozem');else startNew('chernozem');}}/>;
  if(testing)return <TestLab initialLoc={testRegion} onExit={()=>{setTesting(false);if(window.location.hash==='#test')window.history.replaceState(null,'',window.location.pathname+window.location.search);}}/>;
  return (
    <>
      {/* PSV-025 · the notice and the game share one viewport-high column: the notice takes its own height,
          the game the rest, so the hand and the bottom controls never slide below the screen */}
      <div class={`app-shell${saveStatus ? ' with-notice' : ''}`}>
        {saveStatus && <aside class="save-notice" role="status" aria-live="polite">
          <span>{saveStatus}</span>
          <div class="save-notice-actions">
            <Btn small onClick={retrySave}>Сохранить</Btn>
            {profileRecoveryRequired() && <Btn small onClick={() => setRecoverProfile(true)}>Восстановление профиля</Btn>}
          </div>
        </aside>}
        <div class="app-screen">{screen}</div>
      </div>
      {rankUp !== null && <RankUp index={rankUp} onClose={() => setRankUp(null)} />}
      {recoverProfile && <Sheet title="Восстановление профиля" onClose={() => setRecoverProfile(false)}>
        <p>Повреждённый профиль не удалось прочитать. Сохраним его отдельной копией и запишем текущий профиль. Ранее заработанные награды могут отсутствовать в текущем профиле.</p>
        <div class="btn-row"><Btn tone="danger" onClick={() => { if (saveProfile(profRef.current, true)) setRecoverProfile(false); }}>Записать текущий профиль</Btn><Btn tone="ghost" onClick={() => setRecoverProfile(false)}>Отмена</Btn></div>
      </Sheet>}
    </>
  );
}
