import {Tutorial} from './Tutorial';
import {TestLab} from './TestLab';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { LocationId } from '../engine/data';
import { Action, GameError, GameState, apply, newGame, randomSeed } from '../engine/game';
import { FarmScreen } from './FarmScreen';
import { MapScreen } from './MapScreen';
import { Profile, allFarms, checkSaveSession, loadFarm, loadProfile, persistenceStatus, profileRecoveryRequired, recordEnd, resetPersistenceSession, saveFarm, saveProfile, subscribePersistence, syncFarm, syncProfile, writeSessionStorage } from './persist';
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
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [farms, setFarms] = useState(() => allFarms());
  const [s, setS] = useState<GameState | null>(null);
  const [saveStatus, setSaveStatus] = useState(persistenceStatus);
  const [recoverProfile, setRecoverProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errTimer = useRef<number | null>(null);
  const sRef = useRef<GameState | null>(null);
  sRef.current = s;
  const profRef = useRef(profile);
  profRef.current = profile;

  function commitProfile(p: Profile) {
    if (!checkSaveSession()) return false;
    if (p !== profRef.current) {
      profRef.current = p;
      setProfile(p);
      saveProfile(p);
    }
    return true;
  }
  function show(next: GameState, saved = false) {
    if (!checkSaveSession()) return null;
    next = syncFarm(profRef.current, next);
    sRef.current = next;
    setS(next);
    if (!saved) saveFarm(next);
    if (!checkSaveSession()) return null;
    let p = syncProfile(profRef.current, next);
    if (next.phase === 'gameover') p = recordEnd(p, next);
    commitProfile(p);
    return next;
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
    const f = farms[l] ?? loadFarm(l);
    if (!f) return startNew(l);
    show(syncFarm(profRef.current, f));
  }
  function startNew(l: LocationId) {
    if (!checkSaveSession()) return;
    const previous = sRef.current?.loc === l ? sRef.current : farms[l] ?? loadFarm(l);
    // Include a unique attempt token in the seed; reward IDs and history now
    // distinguish two otherwise identical restarts without engine changes.
    const seed = `${randomSeed()}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${randomSeed()}`}`;
    const g = newGame({ loc: l, seed, pets: profRef.current.pets, seedBank: profRef.current.seedBank });
    if (previous && !saveFarm(previous)) return;
    if (!saveFarm(g, true)) return;
    if (previous) commitProfile(recordEnd(syncProfile(profRef.current, previous), previous));
    show(g, true);
  }
  function toMap() {
    if (!checkSaveSession()) return;
    const current = sRef.current;
    // Keep unsaved progress in memory while the user visits another region.
    // A quota error must not turn map navigation into a rollback.
    setFarms({ ...allFarms(), ...farms, ...(current ? { [current.loc]: current } : {}) });
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
    if (sRef.current) saveFarm(sRef.current);
    saveProfile(profRef.current);
    if (!sRef.current) {
      const existing = { ...allFarms(), ...farms };
      for (const farm of Object.values(existing)) if (farm) saveFarm(farm);
      setFarms(existing);
    }
  }
  const screen = !profile.settings.intro
    ? <Intro onDone={(guide) => {commitProfile({ ...profRef.current, settings: { ...profRef.current.settings, intro: true, guide } });if(guide)setTutorial(true);}} />
    : !s ? <MapScreen onTutorial={()=>setTutorial(true)} profile={profile} farms={farms} onOpen={open} onNew={startNew} onTest={(loc)=>{setTestRegion(loc ?? 'chernozem');setTesting(true);}} /> : (
      <FarmScreen
        s={s}
        dispatch={dispatch}
        profile={profile}
        fast={profile.settings.fast}
        onFast={() => commitProfile({ ...profRef.current, settings: { ...profRef.current.settings, fast: !profRef.current.settings.fast } })}
        onMap={toMap}
        onRestart={() => startNew(s.loc)}
        error={error}
        onTest={()=>{setTestRegion(s.loc);setTesting(true);}}
      />
    );
  if(tutorial)return <Tutorial profile={profile} onExit={()=>{commitProfile({...profRef.current,settings:{...profRef.current.settings,intro:true}});setTutorial(false);if(window.location.hash==='#learn')history.replaceState(null,'',location.pathname+location.search);}}/>;
  if(testing)return <TestLab initialLoc={testRegion} onExit={()=>{setTesting(false);if(window.location.hash==='#test')window.history.replaceState(null,'',window.location.pathname+window.location.search);}}/>;
  return (
    <>
      {saveStatus && <aside role="status" aria-live="polite" style={{ position: 'relative', width: 'min(94vw, 470px)', margin: '8px auto', background: '#fff3d6', color: '#562b18', border: '2px solid #b85e36', borderRadius: '10px', padding: '7px 10px', fontSize: '12px', boxShadow: '0 3px 12px #0003' }}>
        <span>{saveStatus}</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
          <Btn small onClick={retrySave}>Сохранить</Btn>
          {profileRecoveryRequired() && <Btn small onClick={() => setRecoverProfile(true)}>Восстановление профиля</Btn>}
        </div>
      </aside>}
      {screen}
      {recoverProfile && <Sheet title="Восстановление профиля" onClose={() => setRecoverProfile(false)}>
        <p>Повреждённый профиль не удалось прочитать. Сохраним его отдельной копией и запишем текущий профиль. Ранее заработанные награды могут отсутствовать в текущем профиле.</p>
        <div class="btn-row"><Btn tone="danger" onClick={() => { if (saveProfile(profRef.current, true)) setRecoverProfile(false); }}>Записать текущий профиль</Btn><Btn tone="ghost" onClick={() => setRecoverProfile(false)}>Отмена</Btn></div>
      </Sheet>}
    </>
  );
}
