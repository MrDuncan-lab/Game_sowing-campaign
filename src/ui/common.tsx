import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Icon } from '../art/icons';
import { CropIcon } from '../art/crops';
import type { CropId } from '../engine/data';
import { CROPS } from '../engine/data';
import type { Action, GameState } from '../engine/game';
import { rub } from '../engine/game';

export type Dispatch = (a: Action) => GameState | null;
let sheetId = 0;

// a sheet that slides up from the bottom; Escape and the backdrop close it, focus stays inside
// №14 · one blocking surface at a time: a sheet opened over another hides it until it closes
const openSheets: HTMLElement[] = [];
const restack = () => openSheets.forEach((el, i) => { el.dataset.covered = i < openSheets.length - 1 ? 'true' : 'false'; });
/** `info` — a small explanation (a bed, the weather, the week): a light paper card over a barely dimmed farm. */
export function Sheet({ title, onClose, children, footer, wide, icon, variant }: { title: ComponentChildren; onClose?: () => void; children: ComponentChildren; footer?: ComponentChildren; wide?: boolean; icon?: string; variant?: 'visit' | 'book' | 'atlas' | 'info' }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useRef(`sheet-title-${++sheetId}`).current;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    const backdrop = dialog.parentElement!;
    // Inert every sibling along the ancestor path, preserving pre-existing
    // inert state. This also works when Sheet is nested in a panel.
    const hidden: { node: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = backdrop;
    while (branch.parentElement) {
      for (const node of Array.from(branch.parentElement.children)) {
        if (node !== branch && node instanceof HTMLElement) { hidden.push({ node, inert: node.inert }); node.inert = true; }
      }
      branch = branch.parentElement;
    }
    openSheets.push(backdrop); restack();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')).filter((el) => !el.hasAttribute('disabled') && el.tabIndex >= 0 && !el.closest('[inert]') && el.getClientRects().length > 0);
    (focusable()[0] ?? dialog).focus({preventScroll:true});
    const key = (e: KeyboardEvent) => {
      if (backdrop.closest('[inert]')) return;
      if (e.key === 'Escape' && closeRef.current) { e.preventDefault(); e.stopImmediatePropagation(); closeRef.current(); }
      if (e.key === 'Tab') {
        const targets = focusable();
        const first = targets[0], last = targets[targets.length - 1];
        if (!first) { e.preventDefault(); dialog.focus(); }
        else if (e.shiftKey && (document.activeElement === first || !targets.includes(document.activeElement as HTMLElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !targets.includes(document.activeElement as HTMLElement))) { e.preventDefault(); first.focus(); }
      }
    };
    const keepFocus = (e: FocusEvent) => {
      if (!backdrop.closest('[inert]') && !dialog.contains(e.target as Node)) (focusable()[0] ?? dialog).focus({preventScroll:true});
    };
    window.addEventListener('keydown', key, true);
    document.addEventListener('focusin', keepFocus);
    return () => {
      window.removeEventListener('keydown', key, true);
      document.removeEventListener('focusin', keepFocus);
      for (const { node, inert } of hidden) node.inert = inert;
      const at = openSheets.indexOf(backdrop); if (at >= 0) openSheets.splice(at, 1); restack();
      document.body.style.overflow = previousOverflow;
      if (prev?.isConnected && !prev.closest('[inert]')) prev.focus?.({preventScroll:true});
    };
  }, []);
  return (
    <div class={variant==='visit'?'sheet-back visit-back':variant==='book'?'sheet-back book-back':variant==='info'?'sheet-back info-back':'sheet-back'} onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div class={`sheet${wide ? ' wide' : ''}${variant==='visit'?' visit-sheet':variant==='book'?' book-sheet':variant==='atlas'?' atlas-sheet':variant==='info'?' info-sheet':''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={ref}>
        <header class="sheet-head">
          {icon && <Icon name={icon} size={26} />}
          <h2 id={titleId}>{title}</h2>
          {onClose && <button type="button" class="icon-btn close" onClick={onClose} aria-label="Закрыть">✕</button>}
        </header>
        <div class="sheet-body">{children}</div>
        {footer && <footer class="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Money({ v, size = 18 }: { v: number; size?: number }) {
  return (
    <span class="money">
      <Icon name="coin" size={size} />
      {rub(v)}
    </span>
  );
}
export function compactMoney(v: number): string {
  if (Math.abs(v) >= 10000) return `${String(Math.round(v / 100) / 10).replace('.', ',')} тыс. ₽`;
  return `${rub(v)} ₽`;
}

// level pips: ●●●○○
export function Pips({ n, of, tone }: { n: number; of: number; tone?: string }) {
  return (
    <span class={`pips${tone ? ` ${tone}` : ''}`} aria-label={`${n} из ${of}`}>
      {Array.from({ length: of }, (_, i) => <i class={i < n ? 'on' : ''} />)}
    </span>
  );
}

export function Bar({ value, max, tone, label }: { value: number; max: number; tone?: string; label?: string }) {
  const k = Math.max(0, Math.min(1, value / Math.max(1e-9, max)));
  return (
    <span class={`bar${tone ? ` ${tone}` : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <i style={{ width: `${k * 100}%` }} />
    </span>
  );
}

export function CropChip({ c, qty, have, size = 24 }: { c: CropId; qty?: number; have?: number; size?: number }) {
  const ok = have === undefined || qty === undefined || have >= qty;
  return (
    <span class={`crop-chip${ok ? '' : ' short'}`}>
      <CropIcon id={c} size={size} />
      <span>
        {qty !== undefined && <b>{qty}</b>} {CROPS[c].name.toLowerCase()}
        {have !== undefined && qty !== undefined && <small> · есть {have}</small>}
      </span>
    </span>
  );
}

export function Section({ title, icon, children, extra, id }: { title: ComponentChildren; icon?: string; children: ComponentChildren; extra?: ComponentChildren; id?: string }) {
  return (
    <section class="panel" id={id}>
      <header class="panel-head">
        {icon && <Icon name={icon} size={24} />}
        <h3>{title}</h3>
        {extra && <span class="panel-extra">{extra}</span>}
      </header>
      {children}
    </section>
  );
}

export function Btn({ children, onClick, disabled, tone, small, title, class: cls }: { children: ComponentChildren; onClick?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void; disabled?: boolean | string | null; tone?: 'primary' | 'ghost' | 'danger' | 'good'; small?: boolean; title?: string; class?: string }) {
  const button = (
    <button type="button" class={`btn${tone ? ` ${tone}` : ''}${small ? ' small' : ''}${cls ? ` ${cls}` : ''}`} disabled={!!disabled} title={typeof disabled === 'string' ? disabled : title} onClick={onClick}>
      {children}
    </button>
  );
  return typeof disabled === 'string' && disabled !== children ? <span class="btn-with-reason">{button}<small class="button-reason">{disabled}</small></span> : button;
}

export const weeksTxt = (n: number) => `${n} ${n % 10 === 1 && n % 100 !== 11 ? 'неделя' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'недели' : 'недель'}`;
export const weeksShort = (n: number) => `${n} нед.`;
