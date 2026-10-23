import type { ComponentChildren } from 'preact';
import { CARDS, CROPS } from '../engine/data';
import type { Card, GameState } from '../engine/game';
import { airTemp, cardCells, cardNeedDays, cropMinT, plural, rub, wlvl } from '../engine/game';
import { CardArt, cardDescription, cardPrice, cardStat, seedWeeks } from './Card';

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
      weeks === null ? { text: 'до холодов не успеет', tone: 'bad' } : { text: `рост ${weeks} нед.` },
      { text: `${per * cells} ед.` },
      { text: `почва от ${tStr(minT)}`, tone: minT > airTemp(s) ? 'cold' : minT >= 12 ? 'warm' : undefined },
    ];
    if (info.greenhouseOnly) out.push({ text: 'только в теплице' });
    if (info.perennial) out.push({ text: `плодоносит ${info.perennial} г.` });
    return out;
  }
  const st = cardStat(s, card);
  return [{ text: `${st.main} ${st.sub}`.trim() }];
}

export function CardReadout({ s, card, status, browsing, desc, children }: { s: GameState; card: Card; status: ReadoutStatus | null; browsing?: boolean; desc?: boolean; children?: ComponentChildren }) {
  const d = CARDS[card.def];
  const days = cardNeedDays(s, card);
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
          <span class="ro-days">{card.def === 'fertilizer' ? 'от ' : ''}{days} {plural(days, 'день', 'дня', 'дней')}</span>
          {price > 0 && <span class={`ro-money${d.kind === 'seed' && s.money < price ? ' short' : ''}`}>{rub(price)} ₽</span>}
        </span>
      </div>
      <div class="ro-facts">{facts.map((f) => <span class={`ro-fact${f.tone ? ` ${f.tone}` : ''}`}>{f.text}</span>)}</div>
      {status && <div class={`ro-status ${status.tone}`}>{status.text}</div>}
      {desc && <div class="ro-desc">{cardDescription(s, card.def)}</div>}
      {children}
    </div>
  );
}
