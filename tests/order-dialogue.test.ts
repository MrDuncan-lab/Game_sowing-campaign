import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUYERS,CHILDREN,introDialogue,isMet,orderDialogue,pendingOrderVoices} from '../src/content/orderDialogue';
import {ORG_IDS,ORGS,LOCATION_IDS} from '../src/engine/data';
import {newGame,endWeek,apply} from '../src/engine/game';
import {testOrderFixture} from '../src/engine/testLab';

test('every organisation has its own named customer and all story steps have short dialogue',()=>{
 assert.deepEqual(Object.keys(BUYERS).sort(),[...ORG_IDS].sort());
 assert.equal(new Set(ORG_IDS.map(o=>BUYERS[o].person)).size,ORG_IDS.length);
 for(const o of ORG_IDS){const b=BUYERS[o];assert.equal(b.story.length,ORGS[o].steps.length);assert.ok(b.arrival.length<=45);
  for(let step=0;step<=b.story.length;step++){const s=testOrderFixture(o,step),q=s.orgs[o]!.offer!,before=JSON.stringify(s),lines=orderDialogue(q);assert.equal(lines[0].who,b.person);assert.ok(lines.every(l=>l.text.length<130&&l.text.length>15));assert.equal(JSON.stringify(s),before);assert.equal(pendingOrderVoices(s)[0].org,o);}
 }
});
test('orphanage has an adult responsible for requests and two distinct children across the chain',()=>{
 const children=new Set<string>();for(let i=0;i<4;i++){const q=testOrderFixture('orphanage',i).orgs.orphanage!.offer!,lines=orderDialogue(q);assert.equal(lines[0].who,'olga');assert.equal(lines.length,2);children.add(lines[1].who);}
 assert.deepEqual([...children].sort(),Object.keys(CHILDREN).sort());
});
test('order announcement eligibility expires, legacy offers remain readable, active orders are not new offers',()=>{
 const s=testOrderFixture('bakery');assert.equal(pendingOrderVoices(s).length,1);s.absWeek+=1;assert.equal(pendingOrderVoices(s).length,1);s.absWeek+=1;assert.equal(pendingOrderVoices(s).length,0);
 delete s.orgs.bakery!.offer!.createdWeek;assert.equal(pendingOrderVoices(s).length,1);s.orgs.bakery!.active=s.orgs.bakery!.offer;s.orgs.bakery!.offer=null;assert.equal(pendingOrderVoices(s).length,0);
});
test('genuine generated orders record their arrival week without automatically accepting them',()=>{
 let generated=0;for(const loc of LOCATION_IDS){let s=newGame({loc,seed:'dialogue-arrival'});s.money=1000;for(let i=0;i<3;i++){s=endWeek(s);for(const st of Object.values(s.orgs)){assert.equal(st?.active,null);if(st?.offer){assert.ok(Number.isInteger(st.offer.createdWeek));assert.ok(st.offer.createdWeek!<=s.absWeek);generated++;}}}}
 assert.ok(generated>0);
});

test('every buyer introduces themselves first: a short hello in the field, two marked intro lines, no greeting left in the first request',()=>{
 for(const o of ORG_IDS){
  const b=BUYERS[o];
  assert.ok(b.hello.length>=12&&b.hello.length<=45,`${o}: hello ${b.hello.length}`);
  assert.equal(b.intro.length,2);
  for(const l of b.intro)assert.ok(l.length>=16&&l.length<=129,`${o}: intro line ${l.length}: ${l}`);
  assert.notEqual(b.hello,b.arrival);
  assert.ok(!/^(Здравствуй|Добр|Привет)/.test(b.story[0]),`${o}: the first request must not greet again`);
  const lines=introDialogue(o);
  assert.equal(lines[0].who,b.person);
  assert.equal(lines.length,o==='orphanage'?4:2);
 }
 assert.deepEqual(introDialogue('orphanage').slice(2).map(l=>l.who),['katya','misha']);
});
test('the field voice says hello until the buyer is met, then the usual arrival line; taking an order or meetOrg makes them known',()=>{
 let s=testOrderFixture('bakery');
 s.orgs.bakery!.met=undefined;s.orgs.bakery!.rel=0;s.orgs.bakery!.step=0;
 assert.equal(isMet(s.orgs.bakery),false);
 assert.equal(pendingOrderVoices(s)[0].text,BUYERS.bakery.hello);
 const m=apply(s,{t:'meetOrg',org:'bakery'});
 assert.equal(m.orgs.bakery!.met,true);assert.equal(isMet(m.orgs.bakery),true);
 assert.equal(pendingOrderVoices(m)[0].text,BUYERS.bakery.arrival);
 assert.equal(s.orgs.bakery!.met,undefined,'apply works on a copy');
 const taken=apply(s,{t:'accept',org:'bakery'});assert.equal(taken.orgs.bakery!.met,true);
 // an old save with a story behind it counts as acquainted
 s.orgs.bakery!.step=1;assert.equal(isMet(s.orgs.bakery),true);
});
