// Telegram Mini App: when the game is opened from a bot, tell Telegram it is ready, take the full height,
// paint Telegram's header in the paper colour and stop the downward swipe from closing the app while a card
// is dragged. Outside Telegram (a browser, the HTML file) the SDK has no initData and nothing happens.

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  isVersionAtLeast(v: string): boolean;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
}

const PAPER_TOP = '#fbf3df';
const PAPER_BOTTOM = '#f1e2c4';

function webApp(): TelegramWebApp | null {
  const w = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return w && w.initData ? w : null;
}

let done = false;
function init(): boolean {
  if (done) return true;
  const tg = webApp();
  if (!tg) return false;
  done = true;
  try {
    tg.ready();
    tg.expand();
    if (tg.isVersionAtLeast('6.1')) { tg.setHeaderColor?.(PAPER_TOP); tg.setBackgroundColor?.(PAPER_BOTTOM); }
    if (tg.isVersionAtLeast('7.7')) tg.disableVerticalSwipes?.();
    if (tg.isVersionAtLeast('7.10')) tg.setBottomBarColor?.(PAPER_BOTTOM);
    document.documentElement.classList.add('in-telegram');
  } catch { /* an old client: the game works as in a browser */ }
  return true;
}

/** The SDK script loads async (the game must not wait for telegram.org when opened as a file): try now and on load. */
export function initTelegram() {
  if (init()) return;
  const sdk = document.getElementById('tg-sdk');
  sdk?.addEventListener('load', () => { init(); }, { once: true });
}

/** Opened from a bot: Telegram passes launch parameters in the URL hash (the SDK may move them to sessionStorage),
 *  so this is known at once, before the async SDK arrives. */
export function launchedFromTelegram(): boolean {
  try {
    if (/tgWebApp(Data|Version|Platform)=/.test(window.location.hash)) return true;
    if (webApp()) return true;
    return !!sessionStorage.getItem('__telegram__initParams');
  } catch { return false; }
}
