// The year's ordeal in the interface: its announcement (a painted card with a stamp), the omen in the sky that
// counts down to it, the call to light the fires, and the tally when it is over.
import { useRef } from 'preact/hooks';
import type { GameState, Trial } from '../engine/game';
import { SEASON_GEN } from '../engine/data';
import {
  deckList, firePits, firesLit, firewoodCost, fireLightDays, lightFiresProblem, lvl, money, trialEnd, trialKnown, trialLead, frostVictims, weekInfo, buildStock, dripRows,
  plural,
} from '../engine/game';
import { TRIALS, TRIAL_GLORY, TRIAL_GRADE_NAME, TRIAL_PASS, TRIAL_HOLD } from '../engine/trials';
import { Icon } from '../art/icons';
import { Btn, useModal, type Dispatch } from './common';

const arts = import.meta.glob<string>('../assets/bosses/*.webp', { eager: true, import: 'default' });
const artOf = (t: Trial) => arts[`../assets/bosses/${TRIALS[t.kind].art}.webp`];

// ---------- what the player has seen ----------
const seenNow = new Set<string>();
const seenKey = (s: GameState, t: Trial, what: 'announce' | 'result') => `posevnaya.trial.${s.loc}.${s.seed}.${t.id}.${what}`;
export function trialSeen(s: GameState, t: Trial, what: 'announce' | 'result', memoryOnly = false): boolean {
  const k = seenKey(s, t, what);
  if (seenNow.has(k) || memoryOnly) return seenNow.has(k);
  try { return !!localStorage.getItem(k); } catch { return false; }
}
export function markTrialSeen(s: GameState, t: Trial, what: 'announce' | 'result', memoryOnly = false) {
  const k = seenKey(s, t, what);
  seenNow.add(k);
  if (!memoryOnly) try { localStorage.setItem(k, '1'); } catch { /* the session remembers it */ }
}

// ---------- when it comes, in words ----------
const weekName = (s: GameState, abs: number) => {
  const w = weekInfo(s, abs - s.absWeek);
  return `${w.weekInSeason}-я неделя ${SEASON_GEN[w.season]}`;
};
export function trialWhen(s: GameState, t: Trial): { short: string; long: string; state: 'far' | 'near' | 'now' | 'done' } {
  if (t.result) return { short: TRIAL_GRADE_NAME[t.result.grade], long: `Испытание позади: ${TRIAL_GRADE_NAME[t.result.grade].toLowerCase()}.`, state: 'done' };
  if (s.absWeek >= t.week && s.absWeek <= trialEnd(t)) {
    const wave = s.absWeek - t.week + 1;
    const short = t.kind === 'frost' ? 'этой ночью' : t.kind === 'locust' ? `волна ${wave} из ${t.len}` : `сушь: ${Math.min(wave, t.len)}-я неделя`;
    return { short, long: t.kind === 'frost' ? 'Заморозок ударит в конце этой недели.' : t.kind === 'locust' ? `Туча на поле: волна ${wave} из ${t.len} — в конце этой недели.` : `Сушь идёт: ${Math.min(wave, t.len)}-я неделя из ${t.len}.`, state: 'now' };
  }
  const ahead = t.week - s.absWeek;
  if (trialKnown(s, t)) return { short: `через ${ahead} нед.`, long: `Точно известно: ${weekName(s, t.week)}, через ${ahead} нед.`, state: 'near' };
  const a = Math.max(1, t.from - s.absWeek), b = Math.max(a, t.to - s.absWeek);
  const span = a === b ? `через ${a} нед.` : `через ${a}–${b} нед.`;
  return { short: span, long: `${span[0].toUpperCase()}${span.slice(1)} Точную неделю узнаете за ${trialLead(s, t)} нед.`, state: 'far' };
}

// ---------- readiness: what already helps against this one ----------
function readiness(s: GameState, t: Trial): { ok: boolean; text: string }[] {
  const deck = [...deckList(s), ...s.hand];
  const count = (def: string) => deck.filter((c) => c.def === def).length;
  const pits = firePits(s).length, have = buildStock(s).fire.have;
  const out: { ok: boolean; text: string }[] = [];
  if (t.kind !== 'drought') out.push(have
    ? { ok: pits > 0, text: pits ? `Кострищ на поле: ${pits} из ${have}` : `Кострища построены, но не поставлены на поле (${have})` }
    : { ok: false, text: 'Кострищ нет — их строят в «Доме» → «Стройки» («Костры»)' });
  if (t.kind === 'frost') {
    out.push({ ok: count('shelter') > 0, text: `Укрытий в колоде: ${count('shelter')}` });
    out.push({ ok: lvl(s, 'greenhouse') > 0, text: lvl(s, 'greenhouse') ? 'Теплицы стоят: внутри на 8° теплее' : 'Теплиц нет' });
  } else if (t.kind === 'locust') {
    out.push({ ok: true, text: 'Охрана грядки под ударом: 1 рабочий день' });
    out.push({ ok: s.tiles.some((x) => x.crop?.id === 'garlic'), text: 'Чеснок отпугивает саранчу от соседей' });
    out.push({ ok: false, text: 'Дрон против тучи бессилен' });
  } else {
    out.push({ ok: dripRows(s) > 0, text: `Капельных линий: ${dripRows(s)}` });
    out.push({ ok: count('mulch') > 0, text: `Мульчи в колоде: ${count('mulch')}` });
    out.push({ ok: lvl(s, 'irrigation') >= 3, text: lvl(s, 'irrigation') >= 3 ? 'Дождеватель поливает сам' : 'Дождевателя нет' });
  }
  out.push({ ok: lvl(s, 'meteo') > 0 || t.kind === 'locust', text: `Точный срок станет известен за ${trialLead(s, t)} нед.` });
  return out;
}

function ArtFx({ t }: { t: Trial }) {
  if (t.kind === 'frost') return <div class="ta-fx frost">{Array.from({ length: 18 }, (_, i) => <i class="mote" style={{ left: `${(i * 53) % 100}%`, animationDelay: `${-(i * 0.37) % 5.2}s`, animationDuration: `${4.4 + (i % 4) * 0.6}s` }} />)}</div>;
  if (t.kind === 'locust') return <div class="ta-fx locust">{Array.from({ length: 46 }, (_, i) => <i class="bug" style={{ top: `${8 + ((i * 29) % 70)}%`, left: `${-((i * 41) % 60)}%`, animationDelay: `${-(i * 0.23) % 3.1}s`, animationDuration: `${2.4 + (i % 5) * 0.35}s` }} />)}</div>;
  return <div class="ta-fx drought"><i class="haze" /><i class="haze" style={{ animationDelay: '-1.4s' }} /></div>;
}

/** The announcement (and, opened later from the omen, the same card with the countdown and the readiness). */
export function TrialCard({ s, t, intro, onClose, act, onWorkshop }: { s: GameState; t: Trial; intro: boolean; onClose: () => void; act: Dispatch; onWorkshop: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, onClose);
  const def = TRIALS[t.kind];
  const when = trialWhen(s, t);
  const fire = firePits(s).length > 0 && t.kind !== 'drought' && when.state === 'now';
  const why = lightFiresProblem(s);
  return (
    <div class={`ta-back tk-${t.kind}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="ta-card" role="dialog" aria-modal="true" aria-labelledby="ta-title" tabIndex={-1} ref={ref}>
        <div class="ta-art">
          {artOf(t) && <img src={artOf(t)} alt="" />}
          <ArtFx t={t} />
          <span class="ta-stamp">Испытание года</span>
          <span class="ta-year">{t.year}-й год</span>
        </div>
        <div class="ta-body">
          <h2 class="ta-title" id="ta-title">{def.name}</h2>
          <p class="ta-omen">{def.omen}</p>
          <div class="ta-when"><Icon name="calendar" size={30} /><div><b>{when.state === 'now' ? when.short[0].toUpperCase() + when.short.slice(1) : intro || when.state === 'far' ? `${def.window[0].toUpperCase()}${def.window.slice(1)}` : when.short[0].toUpperCase() + when.short.slice(1)}</b><span>{when.long}</span></div></div>
          {!intro && <><p class="ta-sub">Готовность</p><div class="ta-ready">{readiness(s, t).map((r) => <p class={r.ok ? 'ok' : 'no'}>{r.text}</p>)}</div></>}
          <p class="ta-sub">Как выстоять</p>
          <ul class="ta-counters">{def.counters.map((c, i) => <li style={{ ['--i' as string]: String(i) }}><span class="ico"><Icon name={c.icon} size={26} /></span>{c.text}</li>)}</ul>
          <p class="ta-reward">Сохраните {Math.round(TRIAL_PASS * 100)}% урожая — <b>+{TRIAL_GLORY[3]} славы</b>{s.certs.includes(def.cert) ? '' : <> и грамота «{def.cert}»</>}. Больше {Math.round(TRIAL_HOLD * 100)}% — +{TRIAL_GLORY[2]}. Если на поле меньше четырёх грядок, испытание пройдёт мимо.</p>
          <div class="ta-acts">
            {t.kind !== 'drought' && !lvl(s, 'fires') && <Btn tone="ghost" onClick={() => { onClose(); onWorkshop(); }}>В мастерскую</Btn>}
            {fire && <Btn tone="primary" disabled={why} onClick={() => { if (act({ t: 'lightFires' })) onClose(); }}>{firesLit(s) ? 'Костры горят' : `Разжечь костры · ${fireLightDays(s) ? '1 д. · ' : ''}${money(firewoodCost(s))}`}</Btn>}
            <Btn tone={fire ? undefined : 'primary'} onClick={onClose}>{intro ? 'Готовиться' : 'Понятно'}</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The tally once the ordeal is over. */
export function TrialResultCard({ s, t, onClose }: { s: GameState; t: Trial; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useModal(ref, onClose);
  const r = t.result!;
  const def = TRIALS[t.kind];
  const pct = Math.round(r.saved * 100);
  return (
    <div class={`ta-back tk-${t.kind} result g${r.grade}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="ta-card" role="dialog" aria-modal="true" aria-labelledby="tr-title" tabIndex={-1} ref={ref}>
        <div class="ta-art">{artOf(t) && <img src={artOf(t)} alt="" style={r.grade >= 2 ? { filter: 'saturate(1.05) brightness(1.02)' } : undefined} />}<span class="ta-year">{t.year}-й год</span></div>
        <div class="ta-body">
          <h2 class="ta-title" id="tr-title">{def.name}</h2>
          <div class="ta-meter">
            <div class="ta-ring" style={{ ['--p' as string]: String(r.grade === 0 ? 0 : r.saved), ['--ring' as string]: r.grade >= 3 ? '#2f6b2a' : r.grade === 2 ? '#c8931f' : '#a92e25' }}><b>{r.grade === 0 ? '—' : `${pct}%`}</b></div>
            <div>
              <span class={`ta-result-stamp g${r.grade}`}>{TRIAL_GRADE_NAME[r.grade]}</span>
              <p class="ta-omen" style={{ marginTop: '8px' }}>{r.grade === 0
                ? `На поле было ${r.beds} ${plural(r.beds, 'грядка', 'грядки', 'грядок')} — испытание прошло мимо.`
                : `Под ударом было ${r.beds} ${plural(r.beds, 'грядка', 'грядки', 'грядок')} с урожаем на ${money(Math.round(r.risk))}. Потеряно ${r.lostUnits} ед. на ${money(Math.round(r.lostValue))}.`}</p>
            </div>
          </div>
          <p class="ta-reward">{r.glory ? <>Слава: <b>+{r.glory}</b>.</> : 'Славы за это испытание нет.'} {r.grade < 3 ? 'Следующий год принесёт новое испытание — готовьтесь заранее: костры, укрытия, сорта.' : 'Округа заговорила о вашей ферме.'}</p>
          {r.cert && <div class="ta-cert"><Icon name="cert" size={32} />Грамота «{r.cert}»: ещё +15 славы</div>}
          <div class="ta-acts"><Btn tone="primary" onClick={onClose}>Дальше</Btn></div>
        </div>
      </div>
    </div>
  );
}

/** The omen in the sky: the ordeal ahead, counting down. */
export function TrialOmen({ s, t, onOpen }: { s: GameState; t: Trial; onOpen: () => void }) {
  const when = trialWhen(s, t);
  return (
    <button type="button" class={`trial-omen ${when.state}`} onClick={onOpen} aria-label={`Испытание года: ${TRIALS[t.kind].name}, ${when.short}`}>
      <span class="omen-ico"><Icon name={t.kind === 'frost' ? 'frost' : t.kind === 'locust' ? 'locust' : 'sun'} size={20} /></span>
      <span>{TRIALS[t.kind].name}<small>{when.short}</small></span>
    </button>
  );
}

/** The call to light the fires on a night that needs them (the ordeal's, or an ordinary frost). */
export function fireCallNeeded(s: GameState, t: Trial | null): boolean {
  if (!firePits(s).length || s.phase !== 'week' || s.season === 3) return false;
  if (firesLit(s)) return true;
  const strike = !!t && !t.result && ((t.kind === 'frost' && t.week === s.absWeek) || (t.kind === 'locust' && s.strikes.some((x) => x.trial && x.week === s.absWeek)));
  return strike || frostVictims(s).length > 0;
}
export function FireCall({ s, act }: { s: GameState; act: Dispatch }) {
  const lit = firesLit(s);
  const why = lit ? null : lightFiresProblem(s);
  return (
    <button type="button" class={`fire-call${lit ? ' lit' : ''}`} disabled={!lit && !!why} title={why ?? undefined} onClick={() => { if (!lit) act({ t: 'lightFires' }); }}
      aria-label={lit ? 'Костры горят этой ночью' : `Разжечь костры: ${why ?? `${fireLightDays(s) ? '1 рабочий день, ' : ''}${money(firewoodCost(s))} на дрова`}`}>
      <Icon name="fire" size={28} />
      <span>{lit ? 'Костры горят' : 'Разжечь костры'}<small>{lit ? 'до утра' : why ?? `${fireLightDays(s) ? '1 д. · ' : ''}${money(firewoodCost(s))}`}</small></span>
    </button>
  );
}
