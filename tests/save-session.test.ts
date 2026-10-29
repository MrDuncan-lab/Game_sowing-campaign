import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveSession, isPersistentGameKey, type SessionLocks } from '../src/ui/saveSession';

class SharedLocks implements SessionLocks {
  held = false;
  async request(_name: string, _options: {mode:'exclusive';ifAvailable:true}, callback: (lock:unknown|null)=>Promise<void>) {
    if(this.held) return callback(null);
    this.held=true;
    try { await callback({name:_name}); }
    finally { this.held=false; }
  }
}
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));

test('simultaneous tabs get exactly one writer, including profile and other farms',async()=>{
  const locks=new SharedLocks(),tabs=Array.from({length:24},()=>createSaveSession(locks));
  const acquired=await Promise.all(tabs.map(t=>t.acquire()));
  assert.equal(acquired.filter(Boolean).length,1);
  assert.equal(tabs.filter(t=>t.writable()).length,1);
  assert.equal(tabs.filter(t=>t.status().state==='busy').length,23);
  tabs.forEach(t=>t.release());await settle();
});
test('closing the owner lets another tab acquire; ownership is never stolen',async()=>{
  const locks=new SharedLocks(),a=createSaveSession(locks),b=createSaveSession(locks);
  assert.equal(await a.acquire(),true);
  for(let i=0;i<4;i++)assert.equal(await b.acquire(),false);
  assert.equal(a.writable(),true);
  a.release();assert.equal(a.writable(),false);await settle();
  assert.equal(await b.acquire(),true);assert.equal(b.status().generation,1);
  b.release();await settle();
});
test('reacquiring a restored document advances generation so UI state is loaded again',async()=>{
  const s=createSaveSession(new SharedLocks());
  await s.acquire();const before=s.status().generation;s.release();await settle();
  await s.acquire();assert.equal(s.status().generation,before+1);s.release();await settle();
});
test('external-save conflict stops writes and requires reload rather than stale retry',async()=>{
  const locks=new SharedLocks(),a=createSaveSession(locks),b=createSaveSession(locks);
  await a.acquire();a.invalidate();
  assert.equal(a.status().state,'stale');assert.equal(a.writable(),false);
  assert.equal(await a.acquire(),false);assert.equal(await b.acquire(),false);
  a.release();await settle();assert.equal(await b.acquire(),true);b.release();await settle();
});
test('missing or rejected Web Locks fail closed, never to an unsafe localStorage lease',async()=>{
  const absent=createSaveSession();assert.equal(await absent.acquire(),false);assert.equal(absent.status().state,'unsupported');
  const rejected=createSaveSession({request:async()=>{throw new Error('denied');}});
  assert.equal(await rejected.acquire(),false);assert.equal(rejected.writable(),false);assert.equal(rejected.status().state,'unsupported');
});
test('leaving the document during acquisition cannot create a late owner',async()=>{
  let callback:((lock:unknown|null)=>Promise<void>)|undefined;
  const s=createSaveSession({request:async(_n,_o,cb)=>{callback=cb;}});
  const pending=s.acquire();s.release();await callback!({name:'late'});
  assert.equal(await pending,false);assert.equal(s.writable(),false);assert.equal(s.status().state,'busy');
});
test('repeated clicks share a single pending ownership request',async()=>{
  let calls=0,callback:((lock:unknown|null)=>Promise<void>)|undefined;
  const s=createSaveSession({request:async(_n,_o,cb)=>{calls++;callback=cb;}});
  const a=s.acquire(),b=s.acquire();assert.equal(a,b);assert.equal(calls,1);
  await callback!(null);assert.equal(await a,false);
});
test('foreign live saves invalidate ownership; rolling backups and unrelated keys do not',()=>{
  for(const key of [null,'posevnaya.v4.profile','posevnaya.v4.farm.chernozem','posevnaya.v4.farm.kuban','posevnaya.v4.farm.altai','posevnaya.tutorial.atlas.v3','posevnaya.tutorial.atlas.v4','posevnaya.tutorial.active'])assert.equal(isPersistentGameKey(key),true);
  for(const key of ['posevnaya.v4.profile.backup','posevnaya.v4.farm.chernozem.previous','posevnaya.v4.farm.chernozem.recovery','other.app'])assert.equal(isPersistentGameKey(key),false);
});

/** Web Locks with steal: a stealing request releases the holder, whose request() rejects with AbortError */
class StealLocks implements SessionLocks {
  holder: { reject: (e: Error) => void } | null = null;
  request(_name: string, options: { mode: 'exclusive'; ifAvailable?: true; steal?: true }, callback: (lock: unknown | null) => Promise<void>) {
    if (this.holder && !options.steal) return callback(null);
    if (this.holder && options.steal) { const h = this.holder; this.holder = null; h.reject(Object.assign(new Error('stolen'), { name: 'AbortError' })); }
    return new Promise<void>((resolve, reject) => {
      const me = { reject };
      this.holder = me;
      callback({ name: _name }).then(() => { if (this.holder === me) this.holder = null; resolve(); }, reject);
    });
  }
}

test('«Продолжить здесь» takes the save from a document that never let go; that one stops writing', async () => {
  const locks = new StealLocks(), minimised = createSaveSession(locks), opened = createSaveSession(locks);
  assert.equal(await minimised.acquire(), true);
  assert.equal(await opened.acquire(), false); assert.equal(opened.status().state, 'busy');
  assert.equal(await opened.takeOver(), true); await settle();
  assert.equal(opened.writable(), true); assert.equal(opened.status().state, 'owner');
  assert.equal(minimised.writable(), false); assert.equal(minimised.status().state, 'stale');
  // the stopped document cannot take it back by retrying, only by reloading
  assert.equal(await minimised.acquire(), false); assert.equal(await minimised.takeOver(), false);
  assert.equal(opened.writable(), true);
  opened.release(); await settle();
});
test('taking over while a polite request is still pending leaves exactly one owner', async () => {
  let politeCb: ((lock: unknown | null) => Promise<void>) | undefined;
  let stealCb: ((lock: unknown | null) => Promise<void>) | undefined;
  const s = createSaveSession({ request: async (_n, o, cb) => { if (o.steal) stealCb = cb; else politeCb = cb; } });
  const polite = s.acquire(); const steal = s.takeOver();
  void stealCb!({ name: 'stolen' }); assert.equal(await steal, true);
  void politeCb!({ name: 'late' }); assert.equal(await polite, false);
  assert.equal(s.status().state, 'owner'); assert.equal(s.status().generation, 1);
});
test('takeOver without Web Locks fails closed', async () => {
  const s = createSaveSession(); assert.equal(await s.takeOver(), false); assert.equal(s.status().state, 'unsupported');
});

test('a frozen Cloudflare upload address points the bot to the project main address', async () => {
  const { frozenDeploymentOrigin } = await import('../src/ui/autoUpdate');
  assert.equal(frozenDeploymentOrigin('d59a8da1.posevnaya-game.pages.dev'), 'https://posevnaya-game.pages.dev');
  assert.equal(frozenDeploymentOrigin('posevnaya-game.pages.dev'), null);
  assert.equal(frozenDeploymentOrigin('main.posevnaya-game.pages.dev'), null);
  assert.equal(frozenDeploymentOrigin('1-2-3-4.sslip.io'), null);
});
