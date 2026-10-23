import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { CARDS, CROPS, TRACKS, TRAITS, TRAIT_IDS, TraitId, isSeed } from '../engine/data';
import {
  Card, GameState, bioPrice, cardCells, cellPrice, labBusy, labCrops, labProblem, labSlots, labWeeksFor, lvl, maxExtra, maxTraits, money, trackCost,
  trackProblem, trackWeeks, traitPrice, upgradeSpots, varietyPrice, isLabProject, wlvl, cardDays, seedCost, cardShape, placements, heated, cropMinT,
} from '../engine/game';
import { Icon } from '../art/icons';
import { CropIcon, CropSprite } from '../art/crops';
import { Bar, Btn, Dispatch, Pips, Section, weeksShort } from './common';
import { levelText } from '../content/rules';
import { CardView, TraitBadges, cardPrice, cardStat } from './Card';
import { useLessonWeeks } from './lesson';
import { P } from '../art/palette';
import { LabDesk, LabBlueprint } from '../art/lab';
import { LabRoom, type LabStation } from '../art/labRoom';
import { PORTRAIT_IMAGES } from '../art/portraits';
import type { Project } from '../engine/game';

function LabScene({ built, busy, level }: { built: boolean; busy: number; level: number }) {
  return built ? <LabDesk level={level} busy={busy > 0} /> : <LabBlueprint />;
}

function ShapeEditor({ s, card, onPick, chosen }: { s: GameState; card: Card; onPick: (cell: [number, number]) => void; chosen: [number,number] | null }) {
  const cells = cardCells(card);
  const spots = upgradeSpots(s, card);
  const all = [...cells, ...spots];
  const minX = Math.min(...all.map((c) => c[0])), minY = Math.min(...all.map((c) => c[1]));
  const maxX = Math.max(...all.map((c) => c[0])), maxY = Math.max(...all.map((c) => c[1]));
  const C = 48;
  const crop = CARDS[card.def].crop!;
  return (
    <svg viewBox={`0 0 ${(maxX - minX + 1) * C + 8} ${(maxY - minY + 1) * C + 8}`} class="shape-editor" style={{ maxWidth: `${(maxX - minX + 1) * C + 8}px` }}>
      {cells.map(([x, y]) => (
        <g transform={`translate(${(x - minX) * C + 4} ${(y - minY) * C + 4})`}>
          <rect width={C - 4} height={C - 4} rx={7} fill={P.soil} stroke={P.ink} stroke-width={1.6} />
          <svg x={2} y={0} width={C - 8} height={C - 6} viewBox="-4 -6 108 108"><CropSprite id={crop} stage={2} /></svg>
        </g>
      ))}
      {spots.map(([x, y]) => (
        <g transform={`translate(${(x - minX) * C + 4} ${(y - minY) * C + 4})`} class={`spot${chosen?.[0]===x&&chosen?.[1]===y?' chosen':''}`} role="button" tabindex={0} onClick={() => onPick([x, y])} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick([x, y]); } }} aria-label="Добавить клетку сюда">
          <rect width={C - 4} height={C - 4} rx={7} fill="#fff8d6" stroke="#c8931f" stroke-width={2} stroke-dasharray="4 3" />
          <text x={(C - 4) / 2} y={(C - 4) / 2 + 6} text-anchor="middle" class="plus">+</text>
        </g>
      ))}
    </svg>
  );
}

function ProjectPreview({s,card,cell}:{s:GameState;card:Card;cell:[number,number]}) {
 const next={...card,extra:[...(card.extra??[]),cell]},crop=CARDS[card.def].crop!;
 const winter:GameState={...s,season:3,tiles:s.tiles.map(t=>({...t,crop:null}))};
 const before=cardCells(card).length,after=cardCells(next).length;
 return <div class="project-preview">
  <dl><dt>Грядки</dt><dd>{before} → {after}</dd><dt>Дни на посев</dt><dd>{cardDays(s,card)} → {cardDays(s,next)}</dd><dt>Цена посева</dt><dd>{money(seedCost(s,crop)*before)} → {money(seedCost(s,crop)*after)}</dd><dt>Базовый урожай</dt><dd>{CROPS[crop].yield*before} → {CROPS[crop].yield*after} ед.</dd></dl>
  <p>Итоговый урожай зависит от почвы и ухода.</p>
  <p>{placements(s,next).length?'Сейчас фигура помещается на свободных грядках.':'Сейчас фигура не помещается на свободных грядках.'}</p>
  <p class={!heated(s)||placements(winter,next).length?'':'bad'}>{!heated(s)?'Зимой нужен подогрев теплицы.':placements(winter,next).length?'Зимой фигура поместится под отоплением, если освободить грядки.':'Зимой эта фигура не поместится под имеющимся отоплением.'}</p>
  {s.hand.some(c=>c.uid===card.uid)&&<p>Эта карта уйдёт из руки на время проекта.</p>}
 </div>;
}

export function LabView({ s, act, active = true, teaching = false }: { s: GameState; act: Dispatch; active?: boolean; teaching?: boolean }) {
  const lessonWeeks = useLessonWeeks();
  const [visible, setVisible] = useState(() => !document.hidden);
  const [sceneVisible, setSceneVisible] = useState(true);
  const stage = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const lastPick = useRef<number | null>(null);
  const seedList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  const [tab, setTab] = useState<'breed' | 'variety' | 'soil'>('breed');
  const [pick, setPick] = useState<number | null>(null);
  const [talk, setTalk] = useState(0);
  const [cellPick,setCellPick]=useState<[number,number]|null>(null);
  const [traitPick,setTraitPick]=useState<TraitId|null>(null);
  const built = lvl(s, 'lab') >= 1;
  useEffect(() => {
    if (!stage.current) return;
    const observer = new IntersectionObserver(([entry]) => setSceneVisible(entry.isIntersecting));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, [built]);
  const labProj = s.projects.find((p) => p.kind === 'track' && p.track === 'lab');
  const projects = s.projects.filter(isLabProject);
  const why = labProblem(s);
  const seeds = [...s.hand, ...s.draw, ...s.discard, ...s.spare].filter((c) => isSeed(c.def));
  const chosen = seeds.find((c) => c.uid === pick) ?? null;
  useLayoutEffect(() => {
    if (chosen) {
      lastPick.current = chosen.uid;
      editor.current?.scrollIntoView({ block: 'start', inline: 'nearest' });
    } else if (lastPick.current !== null) {
      const previous = seedList.current?.querySelector<HTMLElement>(`[data-card-uid="${lastPick.current}"]`);
      previous?.focus({ preventScroll: true });
      previous?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      lastPick.current = null;
    }
  }, [chosen?.uid]);
  const L = lvl(s, 'lab');
  // №5 · the room is a small picture beside the work; expanding the lab is a secondary action at the end
  const expansion = labProj && labProj.kind === 'track' ? (
    <div class="stack tight">
      <span class="small">Строим «{TRACKS.lab.levels[labProj.level - 1].name}» · ещё {weeksShort(labProj.weeks)}</span>
      <Bar value={labProj.total - labProj.weeks} max={labProj.total} tone="good" />
    </div>
  ) : L < 3 ? (
    <div class="stack tight">
      <span class="small">{built ? <>Дальше: <b>{TRACKS.lab.levels[L].name}</b> — </> : 'Проект готов. Первый стол: '}{levelText('lab', L)}</span>
      <Btn small tone={built ? undefined : 'primary'} disabled={trackProblem(s, 'lab')} onClick={() => act({ t: 'track', track: 'lab' })}>
        {built ? 'Расширить' : 'Построить'} · {money(trackCost(s, 'lab', L + 1))} · {weeksShort(lessonWeeks(trackWeeks(s, 'lab', L + 1)))}
      </Btn>
      {trackProblem(s, 'lab') && <p class="why">{trackProblem(s, 'lab')}</p>}
    </div>
  ) : null;
  const busyNow = labBusy(s), slots = labSlots(s);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start', inline: 'nearest' });
  const toDesks = () => scrollTo('lab-desks');
  const toNew = () => scrollTo('lab-new');
  const projectCrop = (p: Project) => p.kind === 'cell' || p.kind === 'trait' ? CARDS[p.card.def].crop : p.kind === 'variety' ? p.crop : undefined;
  const projectLabel = (p: Project) => p.kind === 'cell' ? '+1 клетка' : p.kind === 'trait' ? '+свойство' : p.kind === 'variety' ? 'новый сорт' : 'биопрепарат';
  // №5 · the tables themselves show the work: one station per lab table
  const stations: LabStation[] = [
    ...projects.map((p, i) => ({ key: `p${i}`, crop: projectCrop(p), bio: p.kind === 'bio', label: projectLabel(p), weeks: p.weeks, progress: (p.total - p.weeks) / Math.max(1, p.total),
      onOpen: toDesks, aria: `${projectLabel(p)}: ещё ${weeksShort(p.weeks)}` })),
    ...Array.from({ length: Math.max(0, slots - projects.length) }, (_, i) => ({ key: `f${i}`, label: 'свободно ›', onOpen: toNew, aria: 'Свободный стол — выбрать семена для проекта' })),
  ];
  const lines = [
    ...projects.map((p) => `Готово через ${weeksShort(p.weeks)}`),
    ...(busyNow < slots ? ['Выберите семена ниже.'] : ['Сроки работы — на бирках.']),
    'Больше клеток — дороже посев.',
    'Свойство останется у карты.',
    'Карта на столе — посев ждёт.',
    ...(wlvl(s, 'breeder') ? ['Мария ускорит работу.'] : []),
  ];
  const line = lines[talk % lines.length];
  return (
    <div class="pane-inner lab-pane" data-paused={!active || !visible || !sceneVisible ? 'true' : undefined}>
      <div class="hero lab-hero lab-stage">
        {built ? (
          <div class="lab-stage-art" ref={stage}>
            <LabRoom level={L} stations={stations} mood={projects.length ? 'work' : 'wait'} />
            {/* Лёва talks about what is on the tables; a tap gives the next useful thing */}
            {!teaching && <button type="button" class="lab-talk" onClick={() => setTalk((n) => n + 1)} aria-label={`Лёва: ${line} Ещё совет`}>
              {PORTRAIT_IMAGES.scientist && <img src={PORTRAIT_IMAGES.scientist} alt="" />}
              <span><b>Лёва</b><span class="lab-tip">{line}</span></span>
            </button>}
          </div>
        ) : <div class="lab-stage-art" ref={stage}><LabScene built={built} busy={projects.length} level={L} /></div>}
        <div class="hero-text">
          <div class="hero-title">
            <h2>{built ? TRACKS.lab.levels[L - 1].name : 'Лаборатория селекции'}</h2>
            {built && <span class={`desk-chip${busyNow >= slots ? ' full' : ''}`}><Icon name="flask" size={16} /> столы {busyNow}/{slots}</span>}
          </div>
          <p class="lab-now">{!built ? 'Лаборатории ещё нет: сначала постройте первый стол.' : projects.length ? `На столах ${projects.length} ${projects.length === 1 ? 'проект' : 'проекта'} · ближайший готов через ${weeksShort(Math.min(...projects.map((p) => p.weeks)))}` : busyNow < slots ? 'Столы свободны — выберите семена ниже.' : 'Все столы заняты.'}</p>
          {!built && expansion}
        </div>
      </div>

      {!built && (
        <ul class="lab-promise">
          <li><Icon name="seed" size={22} /><span><b>Новая клетка</b> — из двух грядок фасоли получится три</span></li>
          <li><Icon name="fast" size={22} /><span><b>Свойство сорта</b> — скороспелость, холодостойкость, урожайность</span></li>
          <li><Icon name="bio" size={22} /><span><b>Биопрепарат</b> — оживляет почву квадратом 2×2</span></li>
        </ul>
      )}

      {built && projects.length > 0 && (
        <Section id="lab-desks" title="На столах" icon="flask" extra={<span class={`slots${labBusy(s) >= labSlots(s) ? ' full' : ''}`}>{labBusy(s)}/{labSlots(s)}</span>}>
          {projects.length ? (
            <div class="lab-projects">
              {projects.map((p) => (
                <div class="lab-proj">
                  {(p.kind === 'cell' || p.kind === 'trait') && <CropIcon id={CARDS[p.card.def].crop!} size={40} />}
                  {p.kind === 'variety' && <CropIcon id={p.crop} size={40} />}
                  {p.kind === 'bio' && <Icon name="bio" size={40} />}
                  <div class="grow">
                    <b>
                      {p.kind === 'cell' && `${CARDS[p.card.def].name}: +1 клетка`}
                      {p.kind === 'trait' && `${CARDS[p.card.def].name}: ${TRAITS[p.trait].short}`}
                      {p.kind === 'variety' && `Открываем культуру: ${CROPS[p.crop].name}`}
                      {p.kind === 'bio' && 'Биопрепарат ×2'}
                    </b>
                    <small class="muted"> · ещё {weeksShort(p.weeks)}</small>
                    <Bar value={p.total - p.weeks} max={p.total} tone="good" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p class="small muted">Столы свободны.</p>
          )}
        </Section>
      )}

      {built && (
        <Section id="lab-new" title="Новый проект" icon="seed">
          <div class="seg">
            <button type="button" class={tab === 'breed' ? 'on' : ''} onClick={() => setTab('breed')}>Селекция</button>
            <button type="button" class={tab === 'variety' ? 'on' : ''} onClick={() => setTab('variety')}>Культуры</button>
            <button type="button" class={tab === 'soil' ? 'on' : ''} onClick={() => setTab('soil')}>Почва</button>
          </div>
          {why && <p class="small bad">{why}</p>}
          {tab === 'breed' && (
            <div class="stack">
              {!chosen && <p class="small muted">Выберите экземпляр семян. На время проекта он будет недоступен для посева. До +{maxExtra(s)} кл. и {maxTraits(s)} свойств.</p>}
              {!chosen && <div class="card-grid" ref={seedList}>
                {seeds.map((c) => (
                  <div class={`grid-card${pick === c.uid ? ' picked' : ''}`}>
                    <CardView s={s} card={c} mini selected={pick === c.uid} onClick={() => {setPick(pick===c.uid?null:c.uid);setCellPick(null);setTraitPick(null);}} />
                  </div>
                ))}
              </div>}
              {chosen && (
                <div class="seed-editor" ref={editor}>
                  <div class="seed-passport">
                    <div class="grid-card picked">
                      <CardView s={s} card={chosen} mini selected onClick={() => setPick(null)} />
                    </div>
                    <div class="seed-passport-facts">
                      <h3>{CARDS[chosen.def].name}</h3>
                      <dl>
                        <dt>Грядки</dt><dd>{cardCells(chosen).length}</dd>
                        <dt>Посев</dt><dd>{cardDays(s, chosen)} дн. · {money(cardPrice(s, chosen))}</dd>
                        <dt>Урожай</dt><dd>{cardStat(s, chosen).main}</dd>
                        <dt>Рост</dt><dd>{cardStat(s, chosen).sub.replace('рост ', '')}</dd>
                        <dt>Почва</dt><dd>от {cropMinT(CARDS[chosen.def].crop!, chosen.traits)}°</dd>
                      </dl>
                      {!!chosen.traits?.length && <p class="small">{chosen.traits.map(t => TRAITS[t].name).join(' · ')}</p>}
                      <button type="button" class="seed-change" onClick={() => {setPick(null);setCellPick(null);setTraitPick(null);}}>Выбрать другие семена</button>
                    </div>
                  </div>
                  <div class="breed-panel">
                  <div class="breed-col">
                    <h4>Добавить клетку · {money(cellPrice(s, chosen))} · {weeksShort(lessonWeeks(labWeeksFor(s, 'cell')))}</h4>
                    {upgradeSpots(s, chosen).length ? (
                      <>
                        <p class="small muted">Только эта карта. Посев станет дороже.</p>
                        <ShapeEditor s={s} card={chosen} chosen={cellPick} onPick={setCellPick}/>
                        {cellPick&&<ProjectPreview s={s} card={chosen} cell={cellPick}/>}
                        {cellPick&&<Btn tone="primary" disabled={why || (s.money<cellPrice(s,chosen)?'Не хватает денег':null)} onClick={()=>{if(act({t:'labCell',uid:chosen.uid,cell:cellPick})){setPick(null);setCellPick(null);}}}>Начать · {money(cellPrice(s,chosen))} · {weeksShort(lessonWeeks(labWeeksFor(s,'cell')))}</Btn>}
                      </>
                    ) : (
                      <p class="small muted">Больше клеток эта лаборатория не добавит.</p>
                    )}
                  </div>
                  <div class="breed-col">
                    <h4>Добавить свойство · {money(traitPrice(s, chosen))} · {weeksShort(lessonWeeks(labWeeksFor(s, 'trait')))}</h4>
                    <TraitBadges traits={chosen.traits} size={18} />
                    <div class="traits">
                      {TRAIT_IDS.map((t: TraitId) => (
                        <button type="button" class={`trait-btn${traitPick===t?' chosen':''}`} aria-pressed={traitPick===t} disabled={!!why || (chosen.traits ?? []).includes(t) || (chosen.traits?.length ?? 0) >= maxTraits(s)} onClick={() => setTraitPick(traitPick===t?null:t)}>
                          <Icon name={TRAITS[t].icon} size={22} />
                          <span><b>{TRAITS[t].name}</b><small>{TRAITS[t].text}</small></span>
                        </button>
                      ))}
                    </div>
                    {traitPick==='tough'&&<p class="small muted">В теплице защита от жука и саранчи уже есть. Свойство полезно для открытых посадок.</p>}
                    {traitPick&&<Btn tone="primary" disabled={why || (s.money<traitPrice(s,chosen)?'Не хватает денег':null)} onClick={()=>{if(act({t:'labTrait',uid:chosen.uid,trait:traitPick})){setPick(null);setTraitPick(null);}}}>Начать · {money(traitPrice(s,chosen))} · {weeksShort(lessonWeeks(labWeeksFor(s,'trait')))}</Btn>}
                  </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'variety' && (
            <div class="stack">
              <p class="small muted">Культура появится в лавке, одна карта — в колоду. {money(varietyPrice(s))} · {weeksShort(lessonWeeks(labWeeksFor(s, 'variety')))}.</p>
              <div class="variety-list">
                {labCrops(s).map((c) => (
                  <div class="variety">
                    <CropIcon id={c} size={44} />
                    <span class="grow"><b>{CROPS[c].name}</b><small>{CROPS[c].note}</small><small class="muted">почва от {CROPS[c].minT}°, {CROPS[c].grow} нед.</small></span>
                    <Btn small tone="primary" disabled={why || (s.projects.some((p) => p.kind === 'variety' && p.crop === c) ? 'Уже открывается' : null) || (s.money < varietyPrice(s) ? 'Не хватает денег' : null)} onClick={() => act({ t: 'labVariety', crop: c })}>Открыть</Btn>
                  </div>
                ))}
                {!labCrops(s).length && <p class="small muted">Все культуры, доступные здесь, уже открыты.</p>}
              </div>
            </div>
          )}
          {tab === 'soil' && (
            <div class="stack">
              <div class="variety">
                <Icon name="bio" size={44} />
                <span class="grow"><b>Биопрепарат</b><small>Две карты. Каждая: плодородие +{wlvl(s,'soilsci')>=2?2:1} в квадрате 2×2, до 5.</small></span>
                <Btn small tone="primary" disabled={why || (s.money < bioPrice(s) ? 'Не хватает денег' : null)} onClick={() => act({ t: 'labBio' })}>{money(bioPrice(s))} · {weeksShort(lessonWeeks(labWeeksFor(s, 'bio')))}</Btn>
              </div>
              <details class="more"><summary>Ещё способы поднять почву</summary><p class="small muted">Фасоль после сбора, компост, озимая рожь, запаханная весной, снег, задержанный щитами.</p></details>
            </div>
          )}
        </Section>
      )}

      {built && expansion && (
        <section class="lab-expand">
          <h3><Icon name="build" size={18} /> Расширение лаборатории</h3>
          {expansion}
        </section>
      )}
    </div>
  );
}
