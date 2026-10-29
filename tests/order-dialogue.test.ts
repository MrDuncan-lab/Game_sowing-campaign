import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BUYERS,CHILDREN,orderDialogue,pendingOrderVoices} from '../src/content/orderDialogue';
import {ORG_IDS,ORGS,LOCATION_IDS} from '../src/engine/data';
import {newGame,endWeek} from '../src/engine/game';
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
