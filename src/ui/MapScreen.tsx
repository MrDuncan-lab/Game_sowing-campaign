import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { CROPS, EXPEDITION_IDS, LOCATIONS, LOCATION_IDS, LocationId, SEASON_NAMES, rankOf, type ExpeditionId } from '../engine/data';
import { CONDITIONS, type PlotOffer } from '../engine/run';
import { departProblem, type Cart } from '../engine/meta';
import { Departure, RelicChip } from './Run';
import type { GameState } from '../engine/game';
import { money } from '../engine/game';
import { Icon } from '../art/icons';
import { Pet } from '../art/extra';
import { P } from '../art/palette';
import { Btn, Sheet } from './common';
import { hasFarmData, type Profile } from './persist';
import cover from '../assets/cover.webp';
import { MAP_PINS } from '../art/mapLayout';
import { MapLive } from '../art/mapLive';
import { PORTRAIT_IMAGES } from '../art/portraits';
import { TUTORIAL_KEY, TUTORIAL_STEPS } from '../engine/tutorial';
import mapBase from '../assets/map-base.webp';

const PIN: Record<LocationId, readonly [number, number]> = MAP_PINS;
const SIGN: Record<LocationId, CropId2> = { chernozem: 'wheat', kuban: 'watermelon', altai: 'seabuckthorn', rent: 'pumpkin' };
const isExp = (l: LocationId): l is ExpeditionId => (EXPEDITION_IDS as LocationId[]).includes(l);
type CropId2 = keyof typeof CROPS;

function RegionMap({ farms, open, onPick }: { farms: Partial<Record<LocationId, GameState>>; open: (l: LocationId) => boolean; onPick: (l: LocationId) => void }) {
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <svg viewBox="0 0 400 300" class="region-map" role="group" aria-label="Карта ферм">
      <image href={mapBase} x={0} y={0} width={400} height={300} preserveAspectRatio="none" />
      <MapLive still={still} />
      {LOCATION_IDS.map((l) => {
        const [x, y] = PIN[l];
        const ok = open(l);
        const name = LOCATIONS[l].name, hw = name.length * 3.05 + 9;
        return (
          <g transform={`translate(${x} ${y})`} class={`pin${ok ? '' : ' locked'}${farms[l] ? ' has' : ''}`} role="button" tabindex={0} onClick={() => onPick(l)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(l); } }} aria-label={`${name}${ok ? '' : ', пока закрыто'}`} aria-haspopup="dialog">
            <ellipse cx={3} cy={24} rx={22} ry={5} fill="rgba(60,36,14,0.28)" />
            <circle class="pin-halo" r={31} fill="#fff6dc" opacity={.4} />
            <g class="pin-medal">
              <circle r={25} fill={ok ? '#c9973a' : '#a89c88'} stroke={P.ink} stroke-width={1.6} />
              <circle r={22.4} fill={ok ? '#fff6e0' : '#e6dfd0'} stroke={P.ink} stroke-width={1} />
              <circle r={19.6} fill="none" stroke={ok ? '#d9b25e' : '#c3b9a6'} stroke-width={1.1} stroke-dasharray="1.6 1.6" />
              <svg x={-16} y={-18} width={32} height={32} viewBox="10 6 80 82" class={ok ? '' : 'pin-sprite-locked'}><CropSpriteMap id={SIGN[l]} /></svg>
              {!ok && <g transform="translate(8 4) scale(0.42)">{lockIcon()}</g>}
            </g>
            <g class="pin-ribbon" transform="translate(0 30)">
              <path d={`M${-hw + 3} 4 L${-hw - 9} 4 L${-hw - 5} 10.5 L${-hw - 9} 17 L${-hw + 3} 17 Z`} fill={ok ? '#d9c08a' : '#cbc2b0'} stroke={P.ink} stroke-width={.9} stroke-linejoin="round" />
              <path d={`M${hw - 3} 4 L${hw + 9} 4 L${hw + 5} 10.5 L${hw + 9} 17 L${hw - 3} 17 Z`} fill={ok ? '#d9c08a' : '#cbc2b0'} stroke={P.ink} stroke-width={.9} stroke-linejoin="round" />
              <path d={`M${-hw} 1 Q0 -2.6 ${hw} 1 L${hw} 15 Q0 11.4 ${-hw} 15 Z`} fill={ok ? '#f6e9c6' : '#e3dccd'} stroke={P.ink} stroke-width={1} stroke-linejoin="round" />
              <path d={`M${-hw + 3} 3.6 Q0 .4 ${hw - 3} 3.6 M${-hw + 3} 12.6 Q0 9.4 ${hw - 3} 12.6`} fill="none" stroke={ok ? '#c9a55a' : '#bdb3a0'} stroke-width={.5} />
              <text y={10.6} text-anchor="middle" class="pin-label">{name}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
import { CropSprite } from '../art/crops';
import { icons } from '../art/icons';
const CropSpriteMap = ({ id }: { id: CropId2 }) => <CropSprite id={id} stage={2} />;
const lockIcon = () => icons.lock();

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const SEASON_SHORT = ['весна', 'лето', 'осень', 'зима'];

// a round seal in the same metal-and-paper make as the medallions on the map
function Seal({ size, children, muted }: { size: number; children: ComponentChildren; muted?: boolean }) {
  return (
    <svg viewBox="-28 -28 56 56" width={size} height={size} class="atlas-seal" aria-hidden="true">
      <circle r={26.4} fill={muted ? '#a89c88' : '#c9973a'} stroke={P.ink} stroke-width={1.6} />
      <circle r={23.6} fill={muted ? '#e6dfd0' : '#fff6e0'} stroke={P.ink} stroke-width={1} />
      <circle r={20.6} fill="none" stroke={muted ? '#c3b9a6' : '#d9b25e'} stroke-width={1.1} stroke-dasharray="1.6 1.6" />
      {children}
    </svg>
  );
}
// the rank seal: two laurel branches rising from a bow around the rank number
function RankSeal({ index }: { index: number }) {
  const R = 15.2;
  const leaf = (deg: number, side: 1 | -1) => {
    const r = (deg * Math.PI) / 180, x = Math.cos(r) * R, y = Math.sin(r) * R;
    return <ellipse cx={x} cy={y} rx={3.3} ry={1.45} transform={`rotate(${deg + 90 + side * 28} ${x} ${y})`} />;
  };
  const left = [118, 138, 158, 178, 198, 218, 238], right = [62, 42, 22, 2, -18, -38, -58];
  return (
    <Seal size={58}>
      <path d={`M${Math.cos(2.06) * R} ${Math.sin(2.06) * R} A${R} ${R} 0 0 1 ${Math.cos(4.15) * R} ${Math.sin(4.15) * R} M${Math.cos(1.08) * R} ${Math.sin(1.08) * R} A${R} ${R} 0 0 0 ${Math.cos(-1.01) * R} ${Math.sin(-1.01) * R}`} fill="none" stroke="#4d6328" stroke-width={.8} />
      <g fill="#86a24f" stroke="#4d6328" stroke-width={.55}>{left.map((d) => leaf(d, 1))}{right.map((d) => leaf(d, -1))}</g>
      <path d="M-1.6 15.6 l-3.4 5 M1.6 15.6 l3.4 5" stroke="#8a3a26" stroke-width={1.6} stroke-linecap="round" />
      <circle cy={14.6} r={1.9} fill="#a8452c" stroke="#5e2414" stroke-width={.5} />
      <text y={5.4} text-anchor="middle" class="seal-num">{ROMAN[index] ?? index + 1}</text>
    </Seal>
  );
}

// the lesson entry shows how far the player got: a ribbon of progress and the current lesson
function LessonButton({ onClick }: { onClick: () => void }) {
  let step: string | null = null;
  try { step = JSON.parse(localStorage.getItem(TUTORIAL_KEY) || 'null')?.step ?? null; } catch {}
  const i = step ? TUTORIAL_STEPS.indexOf(step as never) : -1, of = TUTORIAL_STEPS.length - 1;
  const done = step === 'done', started = i > 0, firstDone = step === 'chapter';
  const chapter = i > TUTORIAL_STEPS.indexOf('chapter') ? 'II' : 'I';
  return (
    <button class={`atlas-lesson${started ? ' started' : ''}${done ? ' done' : ''}`} onClick={onClick}>
      <span class="al-face"><img src={PORTRAIT_IMAGES.palych} alt="" /></span>
      <span class="al-text"><b>Учебная ферма</b><small>{done ? 'Пройдена — можно заглянуть ещё раз' : firstDone ? 'Глава I пройдена · глава II по желанию' : started ? `Продолжить · глава ${chapter}` : 'Первый урожай за пять минут — Палыч покажет'}</small>
        {started && <span class="al-bar" aria-hidden="true"><i style={{ width: `${Math.round((i / of) * 100)}%` }} /></span>}</span>
      <span class="al-go" aria-hidden="true"><svg viewBox="0 0 16 16" width="16" height="16"><path d={done ? 'M3.5 8.5 L6.8 11.5 L12.5 4.8' : 'M6 3.5 L10.5 8 L6 12.5'} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>
    </button>
  );
}

const deg = (t: number) => `${t < 0 ? '−' : ''}${Math.abs(t)}°`;

const LAST_FARM = 'posevnaya.v4.lastFarm';
function farmState(f: GameState | undefined | null) {
  if (!f || f.phase === 'gameover') return null;
  return `${SEASON_SHORT[f.season] ?? SEASON_NAMES[f.season]}, ${f.year}-й год`;
}

export function MapScreen({ profile, farms, onOpen, onNew, onTest, onTutorial, onDepart, departFor = null }: { profile: Profile; farms: Partial<Record<LocationId, GameState>>; onOpen: (l: LocationId) => void; onNew: (l: LocationId) => void; onTest:(loc?:LocationId)=>void; onTutorial?:()=>void;
  /** v3 · a cart leaves the home for an expedition; the arrest screen sends the player here with a region */
  onDepart?: (loc: ExpeditionId, offer: PlotOffer, cart: Cart, seed: string) => void; departFor?: { loc: ExpeditionId; key: number } | null }) {
  const [pick, setPick] = useState<LocationId | null>(null);
  const [confirm, setConfirm] = useState<LocationId | null>(null);
  const [depart, setDepart] = useState<ExpeditionId | null>(null);
  const [replace, setReplace] = useState<ExpeditionId | null>(null);
  // a departure asked from elsewhere (the arrest, a finished farm) asks the same questions as one from the map
  useEffect(() => { if (departFor) askDepart(departFor.loc); }, [departFor?.key]);
  const home = farms.chernozem && farms.chernozem.phase !== 'gameover' ? farms.chernozem : null;
  // why a cart cannot leave for `l` now (null: it can)
  const departWhy = (l: ExpeditionId) => !home ? 'Сначала заведите родной дом в Черноземье: обоз собирается из дома' : departProblem(home, l, profile.glory);
  function askDepart(l: ExpeditionId) {
    setPick(null);
    const f = farms[l];
    if (f && f.phase !== 'gameover') setReplace(l); else setDepart(l);
  }
  const r = rankOf(profile.glory);
  const open = (l: LocationId) => profile.glory >= LOCATIONS[l].glory;
  const L = pick ? LOCATIONS[pick] : null;
  const f = pick ? farms[pick] : null;
  function askNew(l: LocationId) {
    setPick(null);
    try { localStorage.setItem(LAST_FARM, l); } catch { /* fine */ }
    if (farms[l] || hasFarmData(l)) setConfirm(l);
    else onNew(l);
  }
  const span = r.next ? r.next.min - r.min : 1, got = r.next ? profile.glory - r.min : 1;
  // №12 · a returning player sees the game they left first; the big cover is for the first meeting
  const last = (() => {
    try { const l = localStorage.getItem(LAST_FARM) as LocationId | null; if (l && farmState(farms[l])) return l; } catch { /* storage may be blocked */ }
    return LOCATION_IDS.find((l) => farmState(farms[l])) ?? null;
  })();
  const go = (l: LocationId) => { try { localStorage.setItem(LAST_FARM, l); } catch { /* fine */ } onOpen(l); };
  const lf = last ? farms[last] : null;
  return (
    <div class={`map-screen atlas${lf ? ' returning' : ''}`}>
      <header class="atlas-head">
        <img src={cover} alt="" class="cover" />
        <div class="atlas-title">
          <small class="atlas-kicker">атлас хозяйств</small>
          <h1>Посевная</h1>
          <p>карточная ферма: выкупите родной дом, поднимите деревню и обойдите Пряхина</p>
        </div>
      </header>
      <div class="atlas-grid">
        {last && lf && <section class="atlas-continue" aria-label="Продолжить игру">
          <Seal size={52}><svg x={-17} y={-19} width={34} height={34} viewBox="10 6 80 82"><CropSpriteMap id={SIGN[last]} /></svg></Seal>
          <div class="ac-text"><small>Ваша ферма</small><b>{LOCATIONS[last].name}</b><span>{SEASON_NAMES[lf.season]} · {lf.weekInSeason}/{LOCATIONS[last].seasons[lf.season]} · {lf.year}-й год · {money(lf.money)}</span></div>
          <button type="button" class="ac-go" onClick={() => go(last)}>Продолжить</button>
        </section>}
        <section class="atlas-rank" aria-label="Звание">
          <RankSeal index={r.index} />
          <div class="rank-body">
            <div class="rank-line"><b>{r.name}</b><span>слава {profile.glory}</span></div>
            {r.next ? <>
              <div class="rank-scale" role="progressbar" aria-valuemin={r.min} aria-valuemax={r.next.min} aria-valuenow={profile.glory} aria-label={`До звания «${r.next.name}»`}>
                <i style={{ ['--p' as string]: `${Math.max(0, Math.min(1, got / span)) * 100}%` }} />
              </div>
              <div class="rank-ticks"><span>{r.min}</span><em>до «{r.next.name}» — ещё {r.next.min - profile.glory}: {r.next.opens}</em><span>{r.next.min}</span></div>
            </> : <div class="rank-ticks"><em>высшее звание</em></div>}
          </div>
          {profile.pets.length > 0 && <div class="rank-pets">{profile.pets.slice(0, 3).map((p) => <span class="rank-pet"><Pet id={p} size={30} /></span>)}</div>}
        </section>
        {onTutorial&&<LessonButton onClick={onTutorial}/>}
        <figure class="atlas-plate">
          <RegionMap farms={farms} open={open} onPick={setPick} />
          <figcaption><span>Лист I.</span> Нажмите на медальон, чтобы узнать о регионе и открыть ферму.</figcaption>
        </figure>
        <section class="atlas-index" aria-labelledby="atlas-index-h">
          <h2 id="atlas-index-h">Указатель хозяйств</h2>
          <ol>
            {LOCATION_IDS.map((l) => {
              const ok = open(l), st = farmState(farms[l]), Ld = LOCATIONS[l];
              return (
                <li>
                  <button type="button" class={`ix-row${ok ? '' : ' locked'}${st ? ' has' : ''}`} onClick={() => setPick(l)} aria-haspopup="dialog">
                    <Seal size={44} muted={!ok}><svg x={-16} y={-18} width={32} height={32} viewBox="10 6 80 82" class={ok ? '' : 'pin-sprite-locked'}><CropSpriteMap id={SIGN[l]} /></svg></Seal>
                    <span class="ix-name"><b>{Ld.name}</b><small>{Ld.place}</small></span>
                    <span class="ix-lead" aria-hidden="true" />
                    <span class="ix-state">{st ? <><b>{st}</b><small>{money(farms[l]!.money)}</small></> : ok ? <b class="ix-free">открыто</b> : <><b class="ix-lock"><Icon name="lock" size={14} /> слава {Ld.glory}</b><small>«{rankOf(Ld.glory).name}»</small></>}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p class="atlas-note"><sup>*</sup> Черноземье — родной дом. Остальное — вылазки: обоз из дома, свой участок, свои заказчики; одна вылазка за раз. Слава, грамоты, питомцы, семенной фонд и знание культур общие. Главная цель — летопись родного дома: выкуп, подворье, соседи, клуб, победа над Пряхиным, первое место в районе.</p>
          <div class="atlas-test"><button type="button" class="atlas-stamp" onClick={()=>onTest(pick ?? undefined)}>Режим проверки</button></div>
        </section>
      </div>
      {pick && L && <Sheet variant="atlas" title={L.name} onClose={() => setPick(null)}>
        <div class="loc-hero">
          <Seal size={64} muted={!open(pick)}><svg x={-17} y={-19} width={34} height={34} viewBox="10 6 80 82" class={open(pick) ? '' : 'pin-sprite-locked'}><CropSpriteMap id={SIGN[pick]} /></svg></Seal>
          <p><i>{L.place}</i><b>{L.tagline}</b></p>
        </div>
        <p class="loc-text">{L.text}</p>
        <dl class="loc-facts">
          <div><dt><Icon name="sun" size={18} />лето</dt><dd>{L.seasons[1]} нед. · до {deg(L.temp.summer[1])}</dd></div>
          <div><dt><Icon name="frost" size={18} />зима</dt><dd>{L.seasons[3]} нед. · до {deg(L.temp.winter[1])}</dd></div>
        </dl>
        <ul class="loc-unique">{L.unique.map((u) => <li>{u}</li>)}</ul>
        {pick === 'chernozem' && f && <HomeStatus f={f} />}
        {isExp(pick) ? (f && f.phase !== 'gameover' ? <div class="loc-save">
          <span><b>{SEASON_NAMES[f.season]}, {f.year}-й год</b> · {money(f.money)} · слава с фермы {f.glory}</span>
          {f.run ? <span class="loc-run">Участок «{CONDITIONS[f.run.cond].name}»{f.run.relics.length ? <> · {f.run.relics.map((r) => <RelicChip id={r} />)}</> : null}</span>
            : <span class="small muted">Старая ферма, без обоза из дома. Её можно доиграть; новая начнётся как вылазка.</span>}
          <div class="btn-row"><Btn tone="primary" onClick={() => go(pick)}>{f.run ? 'Продолжить вылазку' : 'Продолжить'}</Btn>{!f.run && <Btn tone="ghost" small disabled={departWhy(pick)} onClick={() => askDepart(pick)}>Новая вылазка</Btn>}</div>
        </div> : open(pick) ? <>
          <Btn tone="primary" disabled={departWhy(pick)} onClick={() => askDepart(pick)}><Icon name="cart" size={20} /> Собрать обоз</Btn>
          {departWhy(pick) && <p class="small muted">{departWhy(pick)}</p>}
        </> : <p class="loc-locked"><Icon name="lock" size={16} /> Откроется со славой {L.glory} (звание «{rankOf(L.glory).name}»)</p>)
        : f && f.phase === 'gameover' && f.over?.work ? <div class="loc-save">
          <span><b>Дом в залоге у банка</b> · {f.over.reason}</span>
          <div class="btn-row"><Btn tone="primary" onClick={() => go(pick)}>Решить судьбу дома</Btn><Btn tone="ghost" small onClick={() => askNew(pick)}>Заново</Btn></div>
        </div>
        : f && f.phase !== 'gameover' ? <div class="loc-save">
          <span><b>{SEASON_NAMES[f.season]}, {f.year}-й год</b> · {money(f.money)} · слава с фермы {f.glory}</span>
          <div class="btn-row"><Btn tone="primary" onClick={() => go(pick)}>{f.phase === 'arrest' ? 'К дому под арестом' : 'Продолжить'}</Btn><Btn tone="ghost" small onClick={() => askNew(pick)}>Заново</Btn></div>
        </div> : open(pick) ? <Btn tone="primary" onClick={() => askNew(pick)}>{f ? 'Начать новую ферму' : 'Играть'}</Btn> : <p class="loc-locked"><Icon name="lock" size={16} /> Откроется со славой {L.glory} (звание «{rankOf(L.glory).name}»)</p>}
      </Sheet>}
      {replace && (
        <Sheet title="Новая вылазка?" onClose={() => setReplace(null)}>
          <p>Старая ферма «{LOCATIONS[replace].name}» будет закрыта и уйдёт в историю. Её слава и награды останутся в профиле.</p>
          <div class="btn-row">
            <Btn tone="danger" onClick={() => { const l = replace; setReplace(null); setDepart(l); }}>Да, собрать обоз</Btn>
            <Btn tone="ghost" onClick={() => setReplace(null)}>Отмена</Btn>
          </div>
        </Sheet>
      )}
      {depart && home && onDepart && <Departure home={home} loc={depart} glory={profile.glory} onCancel={() => setDepart(null)} onGo={(offer, cart, seed) => { const l = depart; setDepart(null); onDepart(l, offer, cart, seed); }} />}
      {confirm && (
        <Sheet title="Начать заново?" onClose={() => setConfirm(null)}>
          <p>Ферма «{LOCATIONS[confirm].name}» будет закрыта, начнётся новая. Сохраним предыдущую партию резервной копией. Слава и награды профиля сохранятся.{confirm === 'chernozem' && farms.chernozem?.away ? ' Обоз, что сейчас на вылазке, в новый дом не вернётся.' : ''}</p>
          <div class="btn-row">
            <Btn tone="danger" onClick={() => { const l = confirm; setConfirm(null); onNew(l); }}>Да, заново</Btn>
            <Btn tone="ghost" onClick={() => setConfirm(null)}>Отмена</Btn>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** the home's standing on its location sheet: the mortgage, the cart away, the arrest */
function HomeStatus({ f }: { f: GameState }) {
  if (f.phase === 'gameover') return null;
  const lines = [
    f.phase === 'arrest' && f.arrest ? `Под арестом: долг ${money(f.arrest.debt)}, вылазок осталось ${f.arrest.runs}` : f.owned ? 'Дом выкуплен' : `Залог: выплачено ${f.paidYears ?? 0} из 3 осенних платежей`,
    f.away ? `Обоз на вылазке: ${LOCATIONS[f.away.loc].name}` : '',
  ].filter(Boolean);
  return <p class="loc-home small">{lines.join(' · ')}</p>;
}
