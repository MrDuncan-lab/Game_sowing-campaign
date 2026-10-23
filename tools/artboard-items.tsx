/** @jsxImportSource preact */
import type { JSX } from 'preact';
import { Animal } from '../src/art/animals';
import { KidRunner, WatchmanRunner, KidsPeek, SeatedWorker } from '../src/art/people';
import { LabDesk, LabBlueprint } from '../src/art/lab';
import { Room } from '../src/art/room';
import { CompostHeap } from '../src/art/compost';
import { BarnInside } from '../src/art/barnInside';
import { WORKER_IDS } from '../src/engine/data';
const noop = () => {};
const run = (el: JSX.Element) => <svg viewBox="-40 -100 80 110">{el}</svg>;
export const BOARD: [string, JSX.Element, number, number, string?][] = [
  ['гуси', <Animal id="geese" size={200} pose="act" />, 200, 200],
  ['ёж', <Animal id="hedgehog" size={200} pose="act" />, 200, 200],
  ['коза', <Animal id="goat" size={200} pose="act" />, 200, 200],
  ['дети', <svg viewBox="-60 -100 120 110"><g transform="translate(-24 0)"><KidRunner sack /></g><g transform="translate(24 0) scale(.9)"><KidRunner variant={1} /></g></svg>, 220, 200],
  ['сторож', run(<WatchmanRunner />), 160, 200],
  ['над забором', <svg viewBox="-4 0 60 34"><KidsPeek /></svg>, 180, 102],
  ...WORKER_IDS.map(id => [id, <svg viewBox="0 0 64 76"><SeatedWorker id={id} /></svg>, 128, 152] as [string, JSX.Element, number, number]),
  ['компост', <svg viewBox="-4 -8 100 72"><CompostHeap built /></svg>, 240, 172],
  ['компост пустой', <svg viewBox="-4 -8 100 72"><CompostHeap built={false} /></svg>, 240, 172],
  ['компост строится', <svg viewBox="-4 -8 100 72"><CompostHeap built={false} building /></svg>, 240, 172],
  ['лаборатория', <LabDesk level={3} busy />, 640, 300],
  ['чертёж', <LabBlueprint />, 640, 300],
  ['дом', <Room winter={false} certs={2} cat dog seats={[{ kind: 'worker', id: 'agronomist', title: 'Агроном', level: 2, label: '', onOpen: noop }, { kind: 'worker', id: 'watchman', title: 'Сторож', level: 1, label: '', onOpen: noop }, { kind: 'away', id: 'foreman', title: 'Бригадир', weeks: 2, label: '', onOpen: noop }, { kind: 'free', label: '', onOpen: noop }]} />, 720, 392],
  ['амбар', <BarnInside lots={[['potato', 20], ['radish', 8], ['tomato', 2]]} used={30} cap={40} yard={14} />, 680, 232],
];
