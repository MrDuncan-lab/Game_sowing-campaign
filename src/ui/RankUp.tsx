// A new rank on the profile (29.10): what it opens, told by Палыч. Its own module so the app's tests can stub it.
import { RANKS } from '../engine/data';
import { Btn } from './common';
import { VisitLine } from './Story';

/** a new rank on the profile (glory crossed a threshold): what it opens, told by Палыч */
const RANK_LINES: Record<number, string> = {
  1: 'Слыхали? В районе вас теперь «Хозяином» зовут. Кубань открыта: у дороги указатель — собирайте обоз, если дом не подведёт.',
  2: '«Крепкий хозяин»! До Алтая теперь рукой подать: тайга, медведи, кедровый орех. Пряхин там не бывал — то-то позлится.',
  3: '«Мастер урожая». На телегу теперь четыре карты влезет — я ей борта нарастил.',
  4: '«Лучший садовод района». В обоз теперь можно брать вдвое больше денег из дома: с таким именем и на новом месте развернуться не грех.',
  5: '«Гордость области». Пряхин, говорят, вашу страницу в тетради дважды подчеркнул.',
};
export function RankUp({ index, onClose }: { index: number; onClose: () => void }) {
  const r = RANKS[index];
  if (!r) return null;
  // 29.10 · announced the way the game's dialogues are: Палыч steps up at the bottom (a visual-novel visit)
  return (
    <VisitLine who="palych" name="Палыч" caption={`Новое звание: «${r.name}»`} text={RANK_LINES[index] ?? `Звание «${r.name}»: ${r.opens}.`} note={`Открылось: ${r.opens}.`} onClose={onClose}>
      <Btn tone="primary" onClick={onClose}>Понятно</Btn>
    </VisitLine>
  );
}
