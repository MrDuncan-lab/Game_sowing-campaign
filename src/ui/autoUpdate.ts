// Auto-update: the build id is baked into the game (vite.config.ts) and written next to it as version.json. The game
// asks the server which build it has now — bypassing every cache — and moves onto a newer one:
//  · at start and on returning from the background: reload at once (every action is already saved);
//  · during play (a check every 10 minutes): offer «Обновить», so a reload never lands under the player's finger.
// Telegram's WebView keeps old pages hard, so the reload goes to the same address with ?v=<build>, keeping the hash
// (Telegram's launch parameters live there).
import { launchedFromTelegram } from './telegram';

declare const __BUILD_ID__: string | undefined;
export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

const TRIED = 'posevnaya.update.tried';
const EVERY_MS = 10 * 60_000;

const served = () => typeof location !== 'undefined' && (location.protocol === 'https:' || location.protocol === 'http:');

async function serverBuild(): Promise<string | null> {
  try {
    const url = new URL('version.json', location.href);
    url.searchParams.set('t', String(Date.now()));
    const r = await fetch(url.href, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json() as { build?: unknown };
    return typeof j.build === 'string' && j.build ? j.build : null;
  } catch { return null; }
}

function storage(): Storage | null { try { return sessionStorage; } catch { return null; } }

/** go to the same page for build `build`; at most once per build in this session unless asked by the player,
 *  so a CDN that is still spreading the new file cannot cause a reload loop */
export function reloadOnto(build: string, force = false, origin?: string): boolean {
  const ss = storage();
  if (!force && ss?.getItem(TRIED) === build) return false;
  ss?.setItem(TRIED, build);
  const u = new URL(location.href);
  if (origin) { const o = new URL(origin); u.protocol = o.protocol; u.host = o.host; }
  u.searchParams.set('v', build);
  location.replace(u.href);
  return true;
}

/** Cloudflare Pages gives every upload its own address (<hash>.<project>.pages.dev) frozen on that upload. A bot set
 *  to such an address would show one build forever: inside Telegram, go to the project's main address instead. */
export function frozenDeploymentOrigin(host: string): string | null {
  const m = /^[0-9a-f]{8}\.([a-z0-9-]+\.pages\.dev)$/i.exec(host);
  return m ? `https://${m[1]}` : null;
}

export function startAutoUpdate(onAvailable: (apply: () => void) => void): () => void {
  if (!served() || BUILD_ID === 'dev') return () => {};
  const main = launchedFromTelegram() ? frozenDeploymentOrigin(location.hostname) : null;
  if (main && reloadOnto(BUILD_ID, false, main)) return () => {};

  let checking = false;
  const check = async (mode: 'now' | 'offer') => {
    if (checking) return;
    checking = true;
    const build = await serverBuild();
    checking = false;
    if (!build || build === BUILD_ID) return;
    if (mode === 'now' && reloadOnto(build)) return;
    onAvailable(() => { reloadOnto(build, true); });
  };
  void check('now');
  const onVisible = () => { if (document.visibilityState === 'visible') void check('now'); };
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void check('offer'); }, EVERY_MS);
  return () => { document.removeEventListener('visibilitychange', onVisible); clearInterval(timer); };
}
