// The through-line on screen (29.10): story beats raised by the engine (game.ts `beat`, texts in content/story.ts).
// A sheet beat is read once: people speak in turn, one line at a time, under the portraits. A remark beat is one line
// in the field's voice bubble (FieldVoice). Both are remembered on this device by the farm's seed, and only the
// beats of the last two weeks are shown, so a wiped storage never replays the whole story.
import { createPortal } from 'preact/compat';
import { useState } from 'preact/hooks';
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
  try { localStorage.setItem(k, '1'); } catch { /* the session remembers it */ }
}
/** the recent beats of a kind not yet seen, oldest first */
export function pendingBeats(s: GameState, kind: StoryBeat['kind']): string[] {
  return (s.beats ?? []).filter((b) => b.week >= s.absWeek - 1 && STORY[b.id]?.kind === kind && !beatSeen(s, b.id)).map((b) => b.id);
}

export function Face({ who, size }: { who: PersonId; size: number }) {
  const img = PORTRAIT_IMAGES[who];
  return img ? <img class="story-face" src={img} alt="" width={size} height={size} /> : <Portrait id={who} size={size} />;
}

/** one sheet beat: its lines one after another, «Дальше» to go on */
export function StorySheet({ id, onClose }: { id: string; onClose: () => void }) {
  const b = STORY[id];
  const [i, setI] = useState(0);
  if (!b) return null;
  const line = b.lines[Math.min(i, b.lines.length - 1)];
  const last = i >= b.lines.length - 1;
  return createPortal(
    <Sheet title={b.title ?? ''} icon="journal" onClose={onClose}>
      <div class="story-sheet" aria-live="polite">
        <div class="story-cast" aria-hidden="true">
          {[...new Map(b.lines.map((l) => [l.who, l])).values()].map((l) => (
            <span class={`story-member${l.who === line.who ? ' on' : ''}`}><Face who={l.who} size={64} /><small>{l.name}</small></span>
          ))}
        </div>
        <div class="nb-head story-line" key={i}>
          <Face who={line.who} size={96} />
          <div class="nb-say"><small>{line.name}</small><p>{line.text}</p></div>
        </div>
        {last && b.note && <p class="story-note"><Icon name="star" size={18} /> {b.note}</p>}
        <div class="btn-row">
          {last ? <Btn tone="primary" onClick={onClose}>Понятно</Btn> : <Btn tone="primary" onClick={() => setI(i + 1)}>Дальше</Btn>}
          {!last && <Btn tone="ghost" onClick={onClose}>Пропустить</Btn>}
        </div>
      </div>
    </Sheet>, document.body);
}

/** the next unseen sheet beat of this farm, shown over the farm when nothing else is open */
export function StoryLayer({ s, blocked }: { s: GameState; blocked: boolean }) {
  const [, setTick] = useState(0);
  if (blocked) return null;
  const id = pendingBeats(s, 'sheet')[0];
  if (!id) return null;
  return <StorySheet id={id} onClose={() => { markBeat(s, id); setTick((t) => t + 1); }} />;
}
