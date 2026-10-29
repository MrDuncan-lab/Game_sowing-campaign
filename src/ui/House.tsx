import { useEffect, useRef, useState } from 'preact/hooks';
import { COMMON_TRACKS, PETS, TRACKS, WORKERS, TrackId, WorkerId, DECK_MIN } from '../engine/data';
import {
  GameState, deckCount, deckLimit, deckList, hirePrice, lvl, money, trackAvailable, trackCost, trackProblem, trackWeeks, trainPrice, trainWeeks,
  workerSlots, workshopBusy, workshopSlots, locOf, houseBeds, lodging, isHome, yardHelpProblem, buildStock, buildSpots, buildStage, trackDef, trackLevels, trackMats, matsList, helpProblem,
} from '../engine/game';
import { HOUSE_BEDS } from '../engine/data';
import { ShedChips } from './Fair';
import type { BuildItem } from '../engine/game';
import { Icon } from '../art/icons';
import { Pet } from '../art/extra';
import { Room, RoomSeat } from '../art/room';
import { Estate } from '../art/estate';
import { Portrait, PersonId } from '../art/portraits';
import { Bar, Btn, Dispatch, Pips, Section, Sheet, scrollBehavior, weeksIn, weeksShort, weeksTxt } from './common';
import { levelText } from '../content/rules';
import { CardView, cardDescription } from './Card';
import { useLessonWeeks } from './lesson';
import { NeighbourRow, NeighbourSheet, COMMON_ICON, type NeighbourKey } from './Neighbours';
import { COMMONS, YARDS, YARD_IDS } from '../engine/neighbours';
import { Chronicle, FestivalStandings } from './Festival';
import { districtPlace, hasAntonovka, plural } from '../engine/game';

/** «Осталась 1 неделя», «Осталось 3 недели», «Осталось 5 недель» */

const PLACE: Partial<Record<TrackId, BuildItem>> = { greenhouse: 'greenhouse', apiary: 'hive', irrigation: 'drip', guard: 'scarecrow', canal: 'canal', fires: 'fire' };

function WorkerSheet({ s, id, act, onClose }: { s: GameState; id: WorkerId; act: Dispatch; onClose: () => void }) {
  const d = WORKERS[id];
  const w = s.team.find((x) => x.id === id);
  const level = w?.level ?? 0;
  const price = w ? trainPrice(s, id) : hirePrice(s, id);
  const salary = money(Math.round(d.salary * Math.pow(1.2, s.year - 1)));
  const next = level < 3 ? d.levels[level] : null;
  const [firing, setFiring] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (firing) confirmRef.current?.focus({ preventScroll: false }); }, [firing]);
  return (
    <Sheet title={d.name} onClose={onClose}>
      <div class="person-head">
        <Portrait id={d.portrait as PersonId} size={72} />
        <div>
          <b>{d.title}</b>
          {w ? <span class="person-level">уровень {level} из 3 <Pips n={level} of={3} /></span> : <span class="muted">кандидат</span>}
          <small>зарплата {salary} в неделю</small>
        </div>
      </div>
      {w?.away ? <p class="person-away"><Icon name="study" size={18} /> На учёбе ещё {weeksIn(w.away)}. Умения пока не действуют.</p> : null}
      <dl class="effect-list">
        {w && <><dt>Сейчас</dt><dd>{d.levels[level - 1]}</dd></>}
        {next && <><dt>{w ? 'После учёбы' : 'Умеет'}</dt><dd>{next}</dd></>}
      </dl>
      {!w && (
        <Btn tone="primary" disabled={s.team.length >= workerSlots(s) ? 'Свободных кроватей нет' : s.money < price ? `Нужно ${money(price)}` : null} onClick={() => { if (act({ t: 'hire', id })) onClose(); }}>
          Нанять · {price ? money(price) : 'бесплатно'}
        </Btn>
      )}
      {w && next && (
        <Btn tone="primary" disabled={w.away ? 'Уже учится' : s.money < price ? `Нужно ${money(price)}` : null} onClick={() => act({ t: 'train', id })}>
          <Icon name="study" size={18} /> На учёбу · {money(price)} · {weeksShort(trainWeeks(s, id))}
        </Btn>
      )}
      <details class="more">
        <summary>Все уровни</summary>
        <ol class="levels">
          {d.levels.map((t, i) => <li class={i < level ? 'got' : i === level ? 'next' : ''}><b>{i + 1}.</b> {t}</li>)}
        </ol>
        {w && level < 3 && <p class="small muted">Пока работник учится, зарплата идёт, а умения не действуют.</p>}
      </details>
      {w && (firing ? (
        // PSV-027 · letting someone go loses their level and training: say so, and ask once more
        <div class="fire-confirm" role="group" aria-labelledby="fire-confirm-text" ref={confirmRef} tabIndex={-1}>
          <p id="fire-confirm-text"><b>Уволить: {d.name}?</b> {level > 1 ? `Уровень ${level} и пройденная учёба пропадут.` : 'Работник уйдёт с фермы.'}{w.away ? ' Оплаченная учёба не вернётся.' : ''} Вернуть работника в команду можно, только если он снова появится среди кандидатов, и начнёт он с первого уровня.</p>
          <div class="btn-row">
            <Btn tone="danger" small onClick={() => { if (act({ t: 'fire', id })) onClose(); }}>Да, уволить</Btn>
            <Btn small onClick={() => setFiring(false)}>Оставить</Btn>
          </div>
        </div>
      ) : <Btn tone="ghost" small class="fire-btn" onClick={() => setFiring(true)}>Уволить…</Btn>)}
    </Sheet>
  );
}

function Interior({ s, onWorker, onHire }: { s: GameState; onWorker: (id: WorkerId) => void; onHire: () => void }) {
  // the room has the house's own beds; those who sleep at the neighbours' (v3 §7 · постой) are listed under it
  const slots = houseBeds(s);
  const seats: RoomSeat[] = [];
  const lodgers = s.team.slice(slots);
  const lodgeFree = Math.max(0, lodging(s) - lodgers.length);
  for (let i = 0; i < slots; i++) {
    const w = s.team[i];
    if (w && w.away > 0) seats.push({ kind: 'away', id: w.id, title: WORKERS[w.id].title, weeks: w.away, label: `${WORKERS[w.id].name}, ${WORKERS[w.id].title}: на учёбе ещё ${weeksIn(w.away)}`, onOpen: () => onWorker(w.id) });
    else if (w) seats.push({ kind: 'worker', id: w.id, title: WORKERS[w.id].title, level: w.level, label: `${WORKERS[w.id].name}, ${WORKERS[w.id].title}, уровень ${w.level}`, onOpen: () => onWorker(w.id) });
    else seats.push({ kind: 'free', label: 'Свободная кровать. Нажмите, чтобы нанять работника', onOpen: onHire });
  }
  const house = lvl(s, 'house');
  // v3 · beds come with the house: the next level that adds one
  const levels = trackLevels(s, 'house');
  const more = levels.findIndex((_, i) => i >= house && HOUSE_BEDS[i] > HOUSE_BEDS[house - 1]);
  return (
    <div class="room">
      <Room seats={seats} certs={s.certs.length} cat={s.pets.includes('cat')} dog={s.pets.includes('dog')} winter={s.season === 3} camp={isHome(s) ? 0 : lvl(s, 'house')} region={s.loc} />
      {more >= 0 && <p class="room-next">Ещё одна кровать появится с уровнем «{levels[more].name}»</p>}
      {lodging(s) > 0 && (
        <p class="room-lodge">
          <Icon name="village" size={18} /> На постое у соседей:{' '}
          {lodgers.map((w) => <button type="button" class="link" onClick={() => onWorker(w.id)}>{WORKERS[w.id].name}</button>)}
          {lodgeFree > 0 && <button type="button" class="link" onClick={onHire}>{lodgeFree} {plural(lodgeFree, 'свободная кровать', 'свободные кровати', 'свободных кроватей')}</button>}
        </p>
      )}
    </div>
  );
}

function TrackCard({ s, t, act, onPlace, onFair, open, onToggle }: { s: GameState; t: TrackId; act: Dispatch; onPlace: (item: BuildItem) => void; onFair: () => void; open: boolean; onToggle: () => void }) {
  const def = trackDef(s, t);
  const lessonWeeks = useLessonWeeks();
  const now = lvl(s, t);
  const max = def.levels.length;
  const next = def.levels[now];
  const proj = s.projects.find((p) => p.kind === 'track' && p.track === t);
  const why = trackProblem(s, t);
  const equipment = !!TRACKS[t].equipment;
  const need = next ? trackMats(s, t, now + 1) : {};
  const help = proj ? helpProblem(s, t) : null;
  const item = PLACE[t];
  const stock = item ? buildStock(s)[item] : null;
  const unplaced = stock ? Math.max(0, stock.have - stock.used) : 0;
  const note = t === 'barn' && s.pets.includes('cat') && now === 1 ? 'Кот уже защищает от мышей; этот уровень добавит места.'
    : t === 'guard' && now === 2 ? 'Сторож и сторожка вместе отгоняют одну стаю за лето.'
    : t === 'greenhouse' ? 'Дождь теплицу не поливает.'
    : t === 'apiary' && now === 2 ? 'Для мёда рядом нужен растущий медонос.' : null;
  return (
    <div data-track={t} class={`track2${proj ? ' busy' : ''}${!next ? ' done' : ''}${open ? ' open' : ''}`}>
      <button type="button" class="track2-head" aria-expanded={open} onClick={onToggle}>
        <span class="track2-icon"><Icon name={def.icon} size={34} /></span>
        <span class="track2-title"><b>{def.name}</b><small>{now ? `${def.levels[now - 1].name} · ${now}/${max}` : `0/${max}`}</small></span>
      </button>
      <p class="track2-effect">{proj && proj.kind === 'track' ? `Строим «${def.levels[proj.level - 1].name}»` : next ? levelText(t, now) : levelText(t, now - 1)}</p>
      {item && unplaced > 0 && <Btn small tone="good" disabled={!buildSpots(s, item).length ? 'На поле нет подходящего места' : null} onClick={() => onPlace(item)}>Разместить на поле · {unplaced}</Btn>}
      {next && !proj && !equipment && matsList(need).length > 0 && <div class="track2-mats"><small>Материалы:</small><ShedChips s={s} need={need} /></div>}
      <div class="track2-foot">
        {proj && proj.kind === 'track' ? (
          <div class="track2-progress"><Bar value={proj.total - proj.weeks} max={proj.total} tone="good" /><small>ещё {weeksShort(proj.weeks)}</small>
            {!help && <Btn small tone="ghost" onClick={() => act({ t: 'helpBuild', track: t })}>Помочь · 1 день</Btn>}</div>
        ) : next && equipment ? (
          <Btn small onClick={onFair}><Icon name="fair" size={18} /> На ярмарке</Btn>
        ) : next ? (
          <Btn small tone={why ? undefined : 'primary'} disabled={why} onClick={() => act({ t: 'track', track: t })}>
            {money(trackCost(s, t, now + 1))} · {weeksShort(lessonWeeks(trackWeeks(s, t, now + 1)))}
          </Btn>
        ) : (
          <span class="track2-done">{equipment ? 'Лучший уровень' : 'Всё построено'}</span>
        )}
      </div>

      {open && (
        <div class="track2-more">
          <ol class="levels">
            {def.levels.map((l, i) => <li class={i < now ? 'got' : i === now ? 'next' : ''}><b>{l.name}.</b> {levelText(t, i)}</li>)}
          </ol>
          {stock && stock.have > 0 && <small class="muted">Размещено на поле: {stock.used} из {stock.have}</small>}
          {note && <small class="muted">{note}</small>}
        </div>
      )}
    </div>
  );
}

export function HouseView({ s, act, onPlace, onFair }: { s: GameState; act: Dispatch; onPlace: (item: BuildItem) => void; onFair: () => void }) {
  const lessonWeeks = useLessonWeeks();
  const [worker, setWorker] = useState<WorkerId | null>(null);
  const [inv, setInv] = useState<'deck' | 'spare'>('deck');
  const [editingDeck, setEditingDeck] = useState(false);
  const [inventoryPick, setInventoryPick] = useState<number | null>(null);
  const [catalogue, setCatalogue] = useState(false);
  const [openTrack, setOpenTrack] = useState<TrackId | null>(null);
  const house = lvl(s, 'house');
  const tracks = [...COMMON_TRACKS, ...locOf(s).extra].filter((t) => trackAvailable(s, t));
  const ownedTracks = tracks.filter((t) => lvl(s, t) > 0 || s.projects.some((p) => p.kind === 'track' && p.track === t));
  // v3 · equipment is not built: it is bought at the fair, so the workshop's catalogue has buildings only
  const newTracks = tracks.filter((t) => !ownedTracks.includes(t) && !TRACKS[t].equipment);
  const hdef = trackDef(s, 'house'), hmax = hdef.levels.length;
  const houseProj = s.projects.find((p) => p.kind === 'track' && p.track === 'house');
  const busy = workshopBusy(s);
  const deck = deckList(s);
  const deckSize = deckCount(s);
  const winter = s.season === 3;
  useEffect(() => { setEditingDeck(false); setInventoryPick(null); }, [s.season]);
  const rearranging = winter && editingDeck;
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  const buildingNow = s.projects.filter((p) => p.kind === 'track' && p.track !== 'house');
  const villageNow = s.projects.filter((p) => p.kind === 'yard' || p.kind === 'common');
  const [neighbour, setNeighbour] = useState<NeighbourKey | null>(null);
  const helpers = isHome(s) ? YARD_IDS.filter((y) => !yardHelpProblem(s, y)) : [];
  const toPlace = ownedTracks.flatMap((t) => { const item = PLACE[t]; const st = item ? buildStock(s)[item] : null; const n = st ? Math.max(0, st.have - st.used) : 0; return item && n > 0 ? [[t, item, n] as const] : []; });
  return (
    <div class="pane-inner house-pane">
      {/* the estate, big: the house at its level with what the farm owns around it, and the ways into the house */}
      <div class="hero house-hero estate-hero">
        <div class="estate-art">
          <Estate level={house} camp={s.loc !== 'chernozem'} region={s.loc} building={buildStage(s, 'house')} season={s.season} owns={{ hive: lvl(s, 'apiary') > 0, greenhouse: lvl(s, 'greenhouse') > 0, scarecrow: lvl(s, 'guard') > 0, irrigation: lvl(s, 'irrigation') > 0, meteo: lvl(s, 'meteo') > 0, compost: lvl(s, 'compost') > 0, antonovka: hasAntonovka(s) }} />
          <div class="estate-plaque"><h2>{hdef.levels[house - 1].name}</h2><Pips n={house} of={hmax} /></div>
          {houseProj && houseProj.kind === 'track' && <div class="estate-build"><span>Строим «{hdef.levels[houseProj.level - 1].name}». Будет готово через {weeksIn(houseProj.weeks)}.{s.season === 3 ? ' Зимой стройка идёт вдвое медленнее.' : ''}</span><Bar value={houseProj.total - houseProj.weeks} max={houseProj.total} tone="good" /></div>}
        </div>
        <nav class="estate-links" aria-label="Разделы дома">
            <button type="button" onClick={() => jump('hire')}><Icon name="team" size={18} /><span>Кровати</span><b>{s.team.length}/{workerSlots(s)}</b></button>
            <button type="button" onClick={() => jump('workshop')}><Icon name="build" size={18} /><span>Стройки</span><b>{busy}/{workshopSlots(s)}</b></button>
            <button type="button" onClick={() => jump('inventory')}><Icon name="seeds" size={18} /><span>Колода</span><b>{deckSize}/{deckLimit(s)}</b></button>
        </nav>
        <div class="hero-text">
          {/* №6 · first what is being built now, then the next action */}
          {buildingNow.map((p) => p.kind === 'track' && (
            <div class="stack tight now-line">
              <span class="small"><Icon name={TRACKS[p.track].icon} size={16} /> Строим «{trackLevels(s, p.track)[p.level - 1].name}». Будет готово через {weeksIn(p.weeks)}.</span>
              <Bar value={p.total - p.weeks} max={p.total} tone="good" />
              {!helpProblem(s, p.track) && <Btn small tone="ghost" onClick={() => act({ t: 'helpBuild', track: p.track })}>Помочь на стройке · 1 день</Btn>}
            </div>
          ))}
          {villageNow.map((p) => (p.kind === 'yard' || p.kind === 'common') && (
            <div class="stack tight now-line">
              <button type="button" class="link small" onClick={() => setNeighbour(p.kind === 'yard' ? p.yard : 'commons')}>
                <Icon name={p.kind === 'yard' ? 'village' : COMMON_ICON[p.id]} size={16} /> {p.kind === 'yard' ? `${YARDS[p.yard].name}: «${YARDS[p.yard].stages[p.stage - 1].name}»` : `Толока: «${COMMONS[p.id].name}»`} · ещё {weeksShort(p.weeks)}
              </button>
              <Bar value={p.total - p.weeks} max={p.total} tone="good" />
            </div>
          ))}
          {toPlace.length > 0 && <div class="place-chips" role="group" aria-label="Ждут места на поле">
            <small>Ждут места на поле:</small>
            {toPlace.map(([t, item, n]) => (
              <button type="button" class="place-chip" disabled={!buildSpots(s, item).length} title={!buildSpots(s, item).length ? 'На поле нет подходящего места' : undefined} aria-label={`Разместить на поле: ${TRACKS[t].name} (${n})`} onClick={() => onPlace(item)}><Icon name={TRACKS[t].icon} size={18} /><span>{TRACKS[t].name}</span><b>{n}</b></button>
            ))}
          </div>}
          {houseProj && houseProj.kind === 'track' ? (
            !helpProblem(s, 'house') ? <Btn small tone="ghost" onClick={() => act({ t: 'helpBuild', track: 'house' })}>Помочь на стройке: 1 день, на неделю быстрее</Btn> : null
          ) : house < hmax ? (
            <div class="stack tight">
              <span class="small">Дальше: <b>{hdef.levels[house].name}</b> — {hdef.levels[house].text}</span>
              <div class="track2-mats"><small>Материалы:</small><ShedChips s={s} need={trackMats(s, 'house', house + 1)} /></div>
              <Btn small tone="primary" disabled={trackProblem(s, 'house')} onClick={() => act({ t: 'track', track: 'house' })}>
                Строить · {money(trackCost(s, 'house', house + 1))} · {weeksShort(lessonWeeks(trackWeeks(s, 'house', house + 1)))}
              </Btn>
              {trackProblem(s, 'house')?.startsWith('Не хватает') && <p class="small"><button type="button" class="link" onClick={onFair}>Материалы продаются на ярмарке</button></p>}
            </div>
          ) : (
            <span class="small up">{s.loc === 'chernozem' ? 'Лучший дом в округе' : 'Лагерь обустроен'}</span>
          )}
        </div>
      </div>

      <Interior s={s} onWorker={setWorker} onHire={() => document.getElementById('hire')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })} />

      <Section id="workshop" title="Стройки" icon="build" extra={<span class={`slots${busy >= workshopSlots(s) ? ' full' : ''}`}>бригада {busy}/{workshopSlots(s)}</span>}>
        <div class="shed-row"><span>В сарае</span><ShedChips s={s} /><button type="button" class="link" onClick={onFair}>Ярмарка</button></div>
        <p class="small muted">Стройке нужны деньги, материалы и время; зимой стройки идут вдвое медленнее. Технику, дрон и метеоприборы продают на ярмарке.</p>
        <div class="tracks">
          {ownedTracks.map((t) => <TrackCard s={s} t={t} act={act} onPlace={onPlace} onFair={onFair} open={openTrack === t} onToggle={() => setOpenTrack(openTrack === t ? null : t)} />)}
        </div>
        {!ownedTracks.length && <p class="small muted">Пока ничего не построено.</p>}
        {newTracks.length > 0 && <Btn onClick={() => setCatalogue(true)}><Icon name="build" size={20} /> Новая постройка</Btn>}
      </Section>

      {isHome(s) && !s.quiet && (
        <Section id="chronicle" title="Летопись хозяйства" icon="journal" extra={<span class="slots">район: {districtPlace(s)}-е место</span>}>
          <Chronicle s={s} />
          <FestivalStandings s={s} />
        </Section>
      )}

      {isHome(s) && (
        <Section id="neighbours" title="Соседи" icon="village" extra={helpers.length ? <span class="slots up">подмога: {helpers.length}</span> : undefined}>
          <p class="small muted">В деревне пять дворов. Каждую их стадию строит ваша бригада за деньги, материалы и урожай. Взамен сосед предлагает мену, кровать для работника и подмогу. Когда три двора встанут на ноги, деревня возьмётся за общее дело.</p>
          <NeighbourRow s={s} onOpen={setNeighbour} />
        </Section>
      )}

      <Section title="Команда" icon="team" id="hire" extra={<span class="slots">{s.team.length}/{workerSlots(s)}</span>}>
        <p class="small muted">Новые работники появляются на ярмарке, в наградах за заказы, у соседей и на вылазках. Нанять можно только на свободную кровать. Кроватей становится больше с ростом дома и при постое у соседей.</p>
        <div class="candidates">
          {s.candidates.map((id) => (
            <button type="button" class="candidate" onClick={() => setWorker(id)}>
              <Portrait id={WORKERS[id].portrait as PersonId} size={52} />
              <span>
                <b>{WORKERS[id].name}</b>
                <small>{WORKERS[id].title}</small>
                <small class="muted">{WORKERS[id].levels[0]}</small>
              </span>
              <span class="price">{hirePrice(s, id) ? money(hirePrice(s, id)) : <b class="up">даром</b>}</span>
            </button>
          ))}
          {!s.candidates.length && <p class="small muted">Кандидатов нет. <button type="button" class="link" onClick={onFair}>Посмотреть на ярмарке, кто ищет работу</button></p>}
        </div>
      </Section>

      <Section id="inventory" title="Инвентарь" icon="seeds" extra={<span class="slots">колода {deckSize}/{deckLimit(s)}</span>}>
        <div class="seg">
          <button type="button" class={inv === 'deck' ? 'on' : ''} onClick={() => setInv('deck')}>Колода {deckSize}</button>
          <button type="button" class={inv === 'spare' ? 'on' : ''} onClick={() => setInv('spare')}>Запас {s.spare.length}</button>
        </div>
        {winter && <Btn small tone={rearranging?'primary':undefined} onClick={()=>{setEditingDeck(!editingDeck);setInventoryPick(null);}}>{rearranging?'Готово':'Перебрать колоду'}</Btn>}
        <p class="small muted">{rearranging ? `Коснитесь карты: ${inv==='deck'?'в запас':'в колоду'}. В колоде ${DECK_MIN}–${deckLimit(s)} карт.` : winter ? 'Коснитесь карты, чтобы прочитать описание.' : 'Перебрать колоду можно зимой.'}</p>
        <details class="small muted"><summary>Какие карты входят в лимит</summary>Карты, которые сейчас в лаборатории, тоже входят в лимит. Одноразовые карты места не занимают.</details>
        <div class={`card-grid inventory-grid${rearranging?' rearranging':''}`}>
          {(inv === 'deck' ? deck : s.spare).map((c) => (
            <div class={`grid-card${s.hand.includes(c) ? ' in-hand' : ''}`}>
              <CardView s={s} card={c} mini selected={inventoryPick===c.uid} onClick={rearranging ? () => act(inv === 'deck' ? { t: 'deckOut', uid: c.uid } : { t: 'deckIn', uid: c.uid }) : () => setInventoryPick(inventoryPick===c.uid?null:c.uid)} />
              {!rearranging && s.hand.includes(c) && <small class="tag">в руке</small>}
              {inventoryPick===c.uid && <p class="small">{cardDescription(s,c.def)}</p>}
            </div>
          ))}
          {inv === 'spare' && !s.spare.length && <p class="small muted">Запас пуст.</p>}
        </div>
        <div class="inv-row">
          <div>
            <h4><Icon name="paw" size={18} /> Питомцы</h4>
            {s.pets.length ? s.pets.map((p) => (
              <p class="pet-line"><Pet id={p} size={34} /> <span><b>{PETS[p].kind} {PETS[p].name}</b><small>{PETS[p].text}</small></span></p>
            )) : <p class="small muted">Питомцев дарят в награду за некоторые заказы.</p>}
          </div>
          <div>
            <h4><Icon name="cert" size={18} /> Грамоты этой фермы</h4>
            {s.certs.length ? s.certs.map((c) => <p class="small">🏅 {c}</p>) : <p class="small muted">Пока нет.</p>}
          </div>
        </div>
      </Section>
      {worker && <WorkerSheet s={s} id={worker} act={act} onClose={() => setWorker(null)} />}
      {neighbour && <NeighbourSheet s={s} who={neighbour} act={act} onClose={() => setNeighbour(null)} onFair={() => { setNeighbour(null); onFair(); }} />}
      {catalogue && <Sheet title="Новая постройка" onClose={() => setCatalogue(false)}>
        <p class="small muted">Одновременно можно строить: {workshopSlots(s)}.</p>
        <div class="shed-row"><span>В сарае</span><ShedChips s={s} /></div>
        <div class="tracks">{newTracks.map((t) => <TrackCard s={s} t={t} act={act} onFair={() => { setCatalogue(false); onFair(); }} onPlace={(item) => { setCatalogue(false); onPlace(item); }} open={openTrack === t} onToggle={() => setOpenTrack(openTrack === t ? null : t)} />)}</div>
        {!newTracks.length && <p class="small muted">Все постройки уже заложены.</p>}
      </Sheet>}
    </div>
  );
}
