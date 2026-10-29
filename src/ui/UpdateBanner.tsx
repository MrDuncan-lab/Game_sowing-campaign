import { useEffect, useState } from 'preact/hooks';
import { startAutoUpdate } from './autoUpdate';

/** A newer build came out while the player is in the game: a quiet offer at the top, never a reload under the finger. */
export function UpdateBanner() {
  const [apply, setApply] = useState<(() => void) | null>(null);
  useEffect(() => startAutoUpdate((go) => setApply(() => go)), []);
  if (!apply) return null;
  return (
    <div class="update-banner" role="status">
      <span>Вышла новая версия игры</span>
      <button type="button" onClick={() => apply()}>Обновить</button>
      <button type="button" class="update-later" aria-label="Позже" onClick={() => setApply(null)}>×</button>
    </div>
  );
}
