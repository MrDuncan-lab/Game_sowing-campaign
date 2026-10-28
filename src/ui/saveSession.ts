// One browser tab owns all persistent game state. The lock is held for the
// document's lifetime, so synchronous gameplay never races another writer.
export type SaveSessionState = 'checking' | 'owner' | 'busy' | 'unsupported' | 'stale';
export interface SaveSessionStatus { state: SaveSessionState; generation: number }
export interface SessionLocks {
  request(name: string, options: { mode: 'exclusive'; ifAvailable: true }, callback: (lock: unknown | null) => Promise<void>): Promise<unknown>;
}
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
    acquire(): Promise<boolean> {
      if (current.state === 'owner') return Promise.resolve(true);
      if (current.state === 'stale') return Promise.resolve(false);
      if (pending) return pending;
      if (!locks) { update('unsupported'); return Promise.resolve(false); }
      const ticket = epoch;
      update('checking');
      let finish!: (ok: boolean) => void;
      const result = new Promise<boolean>(resolve => { finish = resolve; });
      pending = result;
      try {
        void locks.request('posevnaya.saved-session.v4', { mode: 'exclusive', ifAvailable: true }, async lock => {
          if (ticket !== epoch) { finish(false); return; }
          if (!lock) { update('busy'); finish(false); return; }
          const held = new Promise<void>(resolve => { releaseHold = resolve; });
          update('owner');
          finish(true);
          await held;
        }).catch(() => {
          if (ticket === epoch) update('unsupported');
          finish(false);
        });
      } catch {
        update('unsupported');
        finish(false);
      }
      void result.then(() => { if (pending === result) pending = null; });
      return result;
    },
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
