// The through-line on screen (29.10): story beats raised by the engine (game.ts `beat`, texts in content/story.ts).
// Every beat is shown the way the game's global dialogues are: as a visit in the manner of a visual novel — the
// speaker steps up at the bottom of the screen beside a speech box, the farm visible behind. A beat of several people
// brings them in turn («Дальше»); a remark is one person and one line. Beats are remembered on this device by the
// farm's seed, and only the beats of the last two weeks are shown, so a wiped storage never replays the whole story.
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { GameState } from '../engine/game';
import { STORY, type StoryBeat } from '../content/story';
import { PORTRAIT_IMAGES, Portrait, type PersonId } from '../art/portraits';
import { Icon } from '../art/icons';
import { Btn, Sheet } from './common';

const key = (s: GameState, id: string) => `posevnaya.beat.${s.loc}.${s.seed}.${id}`;
const seenNow = new Set<string>();
export function beatSeen(s: GameState, id: string) {
  const k = key(s, id);
  if (seenNow.has(k)) return true;
  try { return !!localStorage.getItem(k); } catch { return false; }
}
export function markBeat(s: GameState, id: string) {
  const k = key(s, id);
  seenNow.add(k);
  // a test-mode farm (seed TEST-…) is thrown away: its marks live only in this session
  if (s.seed.startsWith('TEST')) return;
  try { localStorage.setItem(k, '1'); } catch { /* the session remembers it */ }
}
/** the recent beats of a kind not yet seen, oldest first */
export function pendingBeats(s: GameState, kind: StoryBeat['kind']): string[] {
  return (s.beats ?? []).filter((b) => b.week >= s.absWeek - 1 && STORY[b.id]?.kind === kind && !beatSeen(s, b.id)).map((b) => b.id);
}
/** what is still to be shown: the sheets first (the story's turns), then the remarks */
export const pendingStory = (s: GameState): string[] => [...pendingBeats(s, 'sheet'), ...pendingBeats(s, 'remark')];

export function Face({ who, size }: { who: PersonId; size: number }) {
  const img = PORTRAIT_IMAGES[who];
  return img ? <img class="story-face" src={img} alt="" width={size} height={size} /> : <Portrait id={who} size={size} />;
}

/** who a speaker is, under the name in a visit */
const ROLE: Partial<Record<PersonId, string>> = { pryakhin: 'Сосед из Заречья', marat: 'Банк', palych: 'Сосед, бывший агроном', zina: 'Соседка через забор', trader: 'Перекупщик' };

/** one speaker in the visual-novel manner: the figure at the bottom, the speech box beside it */
export function VisitLine({ who, name, caption, text, note, children, onClose }: { who: PersonId; name: string; caption?: string; text: string; note?: string; children: ComponentChildren; onClose: () => void }) {
  const img = PORTRAIT_IMAGES[who];
  return createPortal(
    <Sheet variant="visit" title={name} onClose={onClose}>
      <div class="order-meeting story-visit" aria-live="polite">
        <div class="meeting-stage" aria-hidden="true" key={who}>
          {img ? <img class="meeting-person" src={img} alt="" /> : <span class="meeting-person vector"><Portrait id={who} size={170} ring={false} /></span>}
        </div>
        <section class="meeting-speech">
          <small class="meeting-org">{caption ?? ROLE[who] ?? ''}</small>
          <div class="meeting-lines" key={text}><p>{text}</p></div>
          {note && <p class="story-note"><Icon name="star" size={18} /> {note}</p>}
          <div class="meeting-actions">{children}</div>
        </section>
      </div>
    </Sheet>, document.body);
}

/** one beat: its people one after another, «Дальше» to go on */
export function StoryVisit({ id, onClose }: { id: string; onClose: () => void }) {
  const b = STORY[id];
  const [i, setI] = useState(0);
  if (!b) return null;
  const line = b.lines[Math.min(i, b.lines.length - 1)];
  const last = i >= b.lines.length - 1;
  return (
    <VisitLine who={line.who} name={line.name} caption={b.title ? `${b.title}${b.lines.length > 1 ? ` · ${i + 1} из ${b.lines.length}` : ''}` : undefined} text={line.text} note={last ? b.note : undefined} onClose={onClose}>
      {!last && <Btn tone="ghost" onClick={onClose}>Пропустить</Btn>}
      {last ? <Btn tone="primary" onClick={onClose}>Понятно</Btn> : <Btn tone="primary" onClick={() => setI(i + 1)}>Дальше</Btn>}
    </VisitLine>
  );
}
/** the old name, for the places that showed a beat as a sheet */
export const StorySheet = StoryVisit;

/** the next unseen beat of this farm (a story turn or a remark), shown over the farm when nothing else is open */
export function StoryLayer({ s, blocked, onSeen }: { s: GameState; blocked: boolean; onSeen?: () => void }) {
  const [, setTick] = useState(0);
  if (blocked) return null;
  const id = pendingStory(s)[0];
  if (!id) return null;
  return <StoryVisit key={id} id={id} onClose={() => { markBeat(s, id); setTick((t) => t + 1); onSeen?.(); }} />;
}

