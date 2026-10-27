// The field's motion language (src/motion.css, src/ui/PlantMotion.tsx): the troubles' timings, the warnings that
// wait for their own event (W-05) and the week's wind.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {testFixture} from '../src/engine/testLab';
import {endWeek, type GameState} from '../src/engine/game';
import {buildWeekPlayback, eventKinds, pendingKinds} from '../src/ui/weekPlayback';
import {morningStep} from '../src/ui/Morning';
import {windFor, growWave} from '../src/ui/PlantMotion';
const quiet=(s:GameState)=>{for(const o of Object.values(s.orgs))if(o)o.wait=1000;return s;};
const css=readFileSync(new URL('../src/motion.css',import.meta.url),'utf8');
const ms=(re:RegExp)=>Number(css.match(re)?.[1]);

test('a crow raid fits its three acts: the loss shows on the first strike, the layer outlives the departure',()=>{
 const hit=morningStep('crows',[]),miss=morningStep('crowmiss',[]),bugs=morningStep('bugmiss',[]);
 const leave=ms(/\.m-crows \.m-cell \{ --crow-leave: (\d+)ms/),missLeave=ms(/\.m-crowmiss \.m-cell \{ --crow-leave: (\d+)ms/);
 // squat 150 ms, then a 560 ms flight
 assert(hit.dur>=leave+150+560,`crow layer ${hit.dur} ms cuts the departure (${leave+710} ms)`);
 assert(miss.dur>=missLeave+150+560,`miss layer ${miss.dur} ms cuts the departure`);
 assert.equal(hit.reveal,1120,'the loss should show on the first strike');
 // a miss is one beat: shorter than a hit, and much shorter than the old 3.6 s (W-04)
 assert(miss.dur<=hit.dur&&miss.dur<=2400,'a crow miss should be quicker than a hit');
 assert(bugs.dur<=2000,'beetles at an empty bed should not hold the week');
});

test('the warnings of a trouble wait for that trouble (W-05)',()=>{
 const s=quiet(testFixture('collisions')),events=buildWeekPlayback(s,endWeek(s));
 const kinds=events.map(eventKinds);
 const thieves=kinds.findIndex(k=>k.includes('thieves')),crows=kinds.findIndex(k=>k.includes('crows'));
 assert(thieves>0&&crows>0,'the stress week has children and crows after the weather');
 // before the children come, the kids at the yard are still announced
 for(let i=0;i<thieves;i++)assert(pendingKinds(events.slice(i+1)).has('thieves'),`kids vanished before their event (step ${i})`);
 for(let i=0;i<crows;i++)assert(pendingKinds(events.slice(i+1)).has('crows'),`the flock vanished before the crows (step ${i})`);
 assert(!pendingKinds(events.slice(thieves+1)).has('thieves'),'the kids stay after they have come');
});

test('event kinds name what each event answers',()=>{
 assert.deepEqual(eventKinds({id:'a',duration:1,morning:morningStep('crowmiss',[])}),['crows']);
 assert.deepEqual(eventKinds({id:'b',duration:1,morning:morningStep('bugmiss',[{x:0,y:0,pest:'locust'}])}),['locust']);
 assert.deepEqual(eventKinds({id:'c',duration:1,cue:{id:'c',kind:'thieves',week:1,visit:{outcome:'stolen',targets:[],crows:[[0,0]]}} as never}),['thieves','crows']);
 assert.deepEqual(eventKinds({id:'d',duration:1,cue:{id:'d',kind:'drone',week:1} as never}),['beetle','locust']);
});

test('the wind follows the week: rain bends the field, clear weather barely moves it, winter is still',()=>{
 assert.equal(windFor('rain',false),'storm');
 assert.equal(windFor('hail',false),'storm');
 assert.equal(windFor('cloud',false),'breeze');
 assert.equal(windFor('sun',false),'calm');
 assert.equal(windFor('snow',true),'none');
 // the growth wave starts after the calendar has faded and crosses the field column by column
 assert(growWave(0,0)>=150&&growWave(1,0)-growWave(0,0)===90&&growWave(0,1)-growWave(0,0)===45);
});
