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
  for(const key of [null,'posevnaya.v4.profile','posevnaya.v4.farm.chernozem','posevnaya.v4.farm.kuban','posevnaya.v4.farm.altai','posevnaya.tutorial.atlas.v3','posevnaya.tutorial.active'])assert.equal(isPersistentGameKey(key),true);
  for(const key of ['posevnaya.v4.profile.backup','posevnaya.v4.farm.chernozem.previous','posevnaya.v4.farm.chernozem.recovery','other.app'])assert.equal(isPersistentGameKey(key),false);
});
