// A new rank on the profile (29.10): what it opens, told by Палыч. Its own module so the app's tests can stub it.
import { createPortal } from 'preact/compat';
import { RANKS } from '../engine/data';
import { Icon } from '../art/icons';
import { Btn, Sheet } from './common';
import { Face } from './Story';

/** a new rank on the profile (glory crossed a threshold): what it opens, told by Палыч */
const RANK_LINES: Record<number, string> = {
  1: 'Слыхал? В районе вас теперь «Хозяином» зовут. Кубань открыта: у дороги указатель — собирайте обоз, если дом не подведёт.',
  2: '«Крепкий хозяин»! До Алтая теперь рукой подать: тайга, медведи, кедровый орех. Пряхин там не бывал — то-то позлится.',
  3: '«Мастер урожая». На телегу теперь четыре карты влезет — я ей борта нарастил.',
  4: '«Лучший садовод района». Банк подъёмные вдвое даёт: под такое имя не жалко.',
  5: '«Гордость области». Пряхин, говорят, вашу страницу в тетради дважды подчеркнул.',
};
export function RankUp({ index, onClose }: { index: number; onClose: () => void }) {
  const r = RANKS[index];
  if (!r) return null;
  return createPortal(
    <Sheet title={`Новое звание: «${r.name}»`} icon="trophy" onClose={onClose}>
      <div class="story-sheet">
        <div class="nb-head story-line">
          <Face who="palych" size={96} />
          <div class="nb-say"><small>Палыч</small><p>{RANK_LINES[index] ?? `Звание «${r.name}»: ${r.opens}.`}</p></div>
        </div>
        <p class="story-note"><Icon name="star" size={18} /> Открылось: {r.opens}.</p>
        <div class="btn-row"><Btn tone="primary" onClick={onClose}>Понятно</Btn></div>
      </div>
    </Sheet>, document.body);
}
