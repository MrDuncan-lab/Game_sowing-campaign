// 29.10 · the words agree with the game: the tutorial points at buttons that exist, the harvest's unit is written out
// in sentences, the home's card tells the truth after the buyout, a find that speeds the uprooting shows in its text.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import * as G from '../src/engine/game';
import * as D from '../src/engine/data';

const ui=readdirSync('src/ui').filter(f=>f.endsWith('.tsx')&&f!=='Guide.tsx').map(f=>readFileSync(`src/ui/${f}`,'utf8')).join('\n');

test('every button the tutorial points at is labelled so somewhere in the interface',()=>{
 const guide=readFileSync('src/ui/Guide.tsx','utf8');
 const wanted=[...guide.matchAll(/button\('([^']+)'\)/g)].map(m=>m[1]);
 assert.ok(wanted.length>10);
 for(const w of wanted)assert.ok(ui.includes(w),`обучение ищет кнопку «${w}», а в интерфейсе её нет`);
});

test('the unit is declined in sentences',()=>{
 assert.equal(G.units(1),'1 единица');assert.equal(G.units(3),'3 единицы');assert.equal(G.units(12),'12 единиц');assert.equal(G.units(21),'21 единица');
 assert.equal(G.unitsAcc(1),'1 единицу');assert.equal(G.unitsAcc(4),'4 единицы');assert.equal(G.unitsAcc(11),'11 единиц');
});

test('the home\'s card has its own words once the house is bought out and while it is under arrest',()=>{
 const L=D.LOCATIONS.chernozem;
 assert.match(L.text,/залоге/);
 assert.ok(L.states?.owned&&!/залог/.test(L.states.owned.text+L.states.owned.tagline+L.states.owned.unique.join(' ')));
 assert.ok(L.states?.arrest&&/арест/.test(L.states.arrest.text));
});

test('the uprooting takes a day less with the find «Дедов топор»',()=>{
 const s=G.newGame({loc:'altai',seed:'COPY-AXE',run:{cond:'cedar',relics:['axe']}});
 assert.equal(G.chopDays(s),G.TREE_CHOP-1);
 assert.equal(G.chopDays(G.newGame({loc:'altai',seed:'COPY-NOAXE',run:{cond:'cedar',relics:[]}})),G.TREE_CHOP);
});
