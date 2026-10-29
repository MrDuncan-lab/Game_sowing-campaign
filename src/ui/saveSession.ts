// One browser tab owns all persistent game state. The lock is held for the
// document's lifetime, so synchronous gameplay never races another writer.
export type SaveSessionState = 'checking' | 'owner' | 'busy' | 'unsupported' | 'stale';
export interface SaveSessionStatus { state: SaveSessionState; generation: number }
export interface SessionLocks {
  request(name: string, options: { mode: 'exclusive'; ifAvailable?: true; steal?: true }, callback: (lock: unknown | null) => Promise<void>): Promise<unknown>;
}
const LOCK = 'posevnaya.saved-session.v4';
export function createSaveSession(locks?: SessionLocks) {
  let current: SaveSessionStatus = { state: 'checking', generation: 0 };
  let releaseHold: (() => void) | null = null;
  let pending: Promise<boolean> | null = null;
  let epoch = 0;
  const listeners = new Set<() => void>();
  const update = (state: SaveSessionState) => {
    current = { state, generation: current.generation + (state === 'owner' ? 1 : 0) };
    for (const fn of listeners) fn();
  };
  function request(steal: boolean): Promise<boolean> {
    if (current.state === 'owner') return Promise.resolve(true);
    if (current.state === 'stale') return Promise.resolve(false);
    if (pending && !steal) return pending;
    if (!locks) { update('unsupported'); return Promise.resolve(false); }
    if (steal) epoch++; // a polite request still in flight must not become a second owner
    const ticket = epoch;
    update('checking');
    let finish!: (ok: boolean) => void;
    const result = new Promise<boolean>(resolve => { finish = resolve; });
    pending = result;
    let owned = false;
    try {
      void locks.request(LOCK, steal ? { mode: 'exclusive', steal: true } : { mode: 'exclusive', ifAvailable: true }, async lock => {
        if (ticket !== epoch) { finish(false); return; }
        if (!lock) { update('busy'); finish(false); return; }
        const held = new Promise<void>(resolve => { releaseHold = resolve; });
        owned = true;
        update('owner');
        finish(true);
        await held;
      }).catch(() => {
        // the lock was taken over by another document: stop writing, the save there is newer
        if (owned) { releaseHold = null; if (current.state === 'owner') update('stale'); return; }
        if (ticket === epoch) update('unsupported');
        finish(false);
      });
    } catch {
      update('unsupported');
      finish(false);
    }
    void result.then(() => { if (pending === result) pending = null; });
    return result;
  }
  return {
    status: () => current,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    writable: () => current.state === 'owner',
    invalidate() { if (current.state === 'owner') update('stale'); },
    release() {
      epoch++;
      const release = releaseHold;
      releaseHold = null;
      update('busy');
      release?.();
    },
    /** Ask politely: the lock is taken only if no other document holds it. */
    acquire(): Promise<boolean> { return request(false); },
    /** «Продолжить здесь»: take the lock from the document that holds it (a second tab, or a mini app that Telegram
     *  minimised or kept alive after closing). That document stops writing at once and asks to reload. */
    takeOver(): Promise<boolean> { return request(true); },
  };
}

export const managedSaveSession = typeof window !== 'undefined';
const locks = typeof navigator !== 'undefined' ? navigator.locks as SessionLocks | undefined : undefined;
export const saveSession = createSaveSession(locks);
export const canWriteSession = () => !managedSaveSession || saveSession.writable();
export const isPersistentGameKey = (key: string | null) => key === null
  || key === 'posevnaya.v4.profile'
  || /^posevnaya\.v4\.farm\.(chernozem|kuban|altai)$/.test(key)
  || key === 'posevnaya.tutorial.atlas.v3'
  || key === 'posevnaya.tutorial.atlas.v4'
  || key === 'posevnaya.tutorial.active';

if (managedSaveSession) {
  // Older game versions do not know about Web Locks. Refuse further actions if
  // one of them changes a live save while this document owns the new lock.
  window.addEventListener('storage', e => {
    // ST-10 · key null is storage.clear(): nothing was written; persist.checkSaveSession() handles a wiped store
    if (e.key !== null && isPersistentGameKey(e.key)) saveSession.invalidate();
  });
  window.addEventListener('pagehide', () => saveSession.release());
}
