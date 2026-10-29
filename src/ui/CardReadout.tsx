import type { ComponentChildren } from 'preact';
import { CARDS, CROPS } from '../engine/data';
import type { Card, GameState } from '../engine/game';
import { useState } from 'preact/hooks';
import { airTemp, cardCells, cardDaysShown, cropMinT, plural, rub, wlvl } from '../engine/game';
import { CardArt, cardDescription, cardPrice, cardStat, daysWord, seedWeeks } from './Card';
import { Sheet } from './common';

/** The second reading level of a card: the picked (or browsed) card, read in full at sizes that never
 *  shrink with the fan. The fan itself only needs the culture, the name start and the cost. */
export interface ReadoutStatus { text: string; tone: 'instr' | 'up' | 'down' }

const tStr = (t: number) => `${t > 0 ? '+' : ''}${t}°`;

export function cardFacts(s: GameState, card: Card): { text: string; tone?: 'warm' | 'cold' | 'bad' }[] {
  const d = CARDS[card.def];
  if (d.kind === 'seed') {
    const crop = d.crop!, info = CROPS[crop];
    const cells = cardCells(card).length;
    const per = info.yield + (card.traits?.includes('yield') ? 1 : 0) + (wlvl(s, 'agronomist') >= 3 ? 2 : wlvl(s, 'agronomist') >= 1 ? 1 : 0);
    const weeks = seedWeeks(s, crop, card.traits);
    const minT = cropMinT(crop, card.traits);
    const out: { text: string; tone?: 'warm' | 'cold' | 'bad' }[] = [
      weeks === null ? { text: 'не успеет до холодов', tone: 'bad' } : { text: `рост ${weeks} ${plural(weeks, 'неделя', 'недели', 'недель')}` },
      { text: `урожай ${per * cells} ед.` },
      { text: `почва от ${tStr(minT)}`, tone: minT > airTemp(s) ? 'cold' : minT >= 12 ? 'warm' : undefined },
    ];
    if (info.greenhouseOnly) out.push({ text: 'только в теплице' });
    if (info.perennial) out.push({ text: `плодоносит ${info.perennial} ${plural(info.perennial, 'год', 'года', 'лет')}` });
    return out;
  }
  const st = cardStat(s, card);
  return [{ text: `${st.main} ${st.sub}`.trim() }];
}

/** the facts as a sentence for the «about» sheet: «Рост 3 недели, урожай 5 ед., почва от +5°.» */
const factsLine = (facts: { text: string }[]) => {
  const t = facts.map((f) => f.text).join(', ');
  return t ? `${t[0].toUpperCase()}${t.slice(1)}.` : '';
};

export function CardReadout({ s, card, status, browsing, desc, children }: { s: GameState; card: Card; status: ReadoutStatus | null; browsing?: boolean; desc?: boolean; children?: ComponentChildren }) {
  const d = CARDS[card.def];
  const days = cardDaysShown(s, card);
  // PSV-034 · when the dock is too low for the full rule, it is one tap away, never gone
  const [about, setAbout] = useState(false);
  const price = cardPrice(s, card);
  const facts = cardFacts(s, card);
  // a preview or a refusal is the freshest news: on a low dock it takes the facts' place
  const urgent = !!status && status.tone !== 'instr';
  return (
    <div class={`card-readout${urgent ? ' urgent' : ''}${status?.tone === 'down' ? ' bad' : ''}${browsing ? ' browsing' : ''}`} role="status" aria-live="polite">
      <span class="ro-icon" aria-hidden="true"><CardArt def={card.def} size={26} /></span>
      <div class="ro-head">
        <strong class="ro-name">{d.name}</strong>
        <span class="ro-cost">
          <span class="ro-days">{card.def === 'fertilizer' ? 'от ' : ''}{days} {daysWord(days, card.def === 'fertilizer')}</span>
          {price > 0 && <span class={`ro-money${d.kind === 'seed' && s.money < price ? ' short' : ''}`}>{rub(price)} ₽</span>}
          {!desc && !browsing && <button type="button" class="ro-about" onClick={() => setAbout(true)} aria-label={`О карте «${d.name}»`} title="О карте">?</button>}
        </span>
      </div>
      <div class="ro-facts">{facts.map((f) => <span class={`ro-fact${f.tone ? ` ${f.tone}` : ''}`}>{f.text}</span>)}</div>
      {status && <div class={`ro-status ${status.tone}`}>{status.text}</div>}
      {desc && <div class="ro-desc">{cardDescription(s, card.def)}</div>}
      {children}
      {about && <Sheet title={d.name} variant="info" onClose={() => setAbout(false)}>
        <p>{cardDescription(s, card.def)}</p>
        <p class="small muted">{days > 0 ? `Занимает ${card.def === 'fertilizer' ? 'от ' : ''}${days} ${daysWord(days, card.def === 'fertilizer')}.` : 'Не занимает рабочих дней.'}{price > 0 ? ` Цена: ${rub(price)} ₽.` : ''} {factsLine(facts)}</p>
      </Sheet>}
    </div>
  );
}
