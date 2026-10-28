import type { ComponentChildren } from 'preact';
import { Icon } from '../art/icons';
import type { TutorialArea } from '../engine/tutorial';
import { useLessonLock } from './lesson';

// What a closed part of the training farm is for: the player peeks behind the frosted glass and reads this.
export const PEEK: Partial<Record<TutorialArea, { title: string; text: string }>> = {
  barn: { title: 'Амбар', text: 'Здесь хранится и продаётся урожай.' },
  orders: { title: 'Заказы', text: 'Соседи и организации деревни заказывают урожай за деньги и подарки.' },
  shop: { title: 'Лавка семян', text: 'Новые карты для колоды: семена и работы.' },
  bank: { title: 'Касса', text: 'Аренда, кредиты и страховка.' },
  house: { title: 'Дом', text: 'Команда работников, мастерская для улучшений и ваша колода.' },
  lab: { title: 'Лаборатория', text: 'Селекция: семенам добавляют клетки и полезные свойства.' },
};

/** A closed part: the page itself under frosted glass (nothing there can be pressed) and a card on top. */
export function Peek({ area, children, onBack, back }: { area: TutorialArea; children: ComponentChildren; onBack?: () => void; back?: string }) {
  const lock = useLessonLock()(area);
  if (!lock) return <>{children}</>;
  const p = PEEK[area];
  return (
    <div class={`peek peek-${area}`}>
      <div class="peek-content" inert aria-hidden="true">{children}</div>
      <div class="peek-card" role="note" aria-label={`${p?.title ?? 'Раздел'} закрыт`}>
        <span class="peek-lock" aria-hidden="true"><Icon name="lock" size={26} /></span>
        {p && <b>{p.title}</b>}
        {p && <p>{p.text}</p>}
        <small>{lock}</small>
        {onBack && <button type="button" class="peek-back" onClick={onBack}>{back ?? 'К полю'}</button>}
      </div>
    </div>
  );
}
