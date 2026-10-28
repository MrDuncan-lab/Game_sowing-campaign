// The estate as one big picture for the house tab: the player's house at its real level in its yard, under the
// season's sky. 28.10 · drawn by the village generator (tools/village, src/art/village/estate.ts), so it is the
// same house the village shows at the same level. What the player owns stands around it (a hive, a greenhouse, a
// scarecrow, a water barrel, a weather mast, a compost box), so the picture itself says what the farm has.
import { ES_SEASON_CSS, ES_SUMMER, ES_VIEW, ES_WINTER, type ESItem } from './village/estate';

export interface EstateOwns { hive?: boolean; greenhouse?: boolean; scarecrow?: boolean; irrigation?: boolean; meteo?: boolean; compost?: boolean }

const ITEMS: [ESItem, keyof EstateOwns][] = [['hive', 'hive'], ['greenhouse', 'greenhouse'], ['scarecrow', 'scarecrow'], ['barrel', 'irrigation'], ['meteo', 'meteo'], ['compost', 'compost']];

export function Estate({ level, building, season, owns, camp = false }: { level: number; building: 0 | 1 | 2 | 3; season: number; owns: EstateOwns; camp?: boolean }) {
  const d = season === 3 ? ES_WINTER : ES_SUMMER;
  // v3 · on an expedition the camp stands in the house's place (tent, hut, field camp); the house is drawn up to its
  // fifth level, higher levels keep the manor's look until they get their own drawing
  const house = camp ? d.camps[Math.max(1, Math.min(3, level)) - 1] : d.houses[Math.max(1, Math.min(5, level)) - 1] ?? d.houses[0];
  if (camp) building = 0;
  const items = ITEMS.filter(([, k]) => owns[k]).map(([item]) => d.items[item]).join('');
  return (
    <svg viewBox={ES_VIEW} class={`estate-scene estate-v season-${season}${building ? ' is-building' : ''}`} aria-hidden="true">
      <style>{ES_SEASON_CSS}</style>
      <defs dangerouslySetInnerHTML={{ __html: d.defs }} />
      <g dangerouslySetInnerHTML={{ __html: d.back }} />
      <g class="es-house" dangerouslySetInnerHTML={{ __html: house }} />
      <g dangerouslySetInnerHTML={{ __html: items }} />
      {building > 0 && <g class="es-scaffold" pointer-events="none" dangerouslySetInnerHTML={{ __html: d.scaffold[building - 1] ?? '' }} />}
      <g dangerouslySetInnerHTML={{ __html: d.front }} />
    </svg>
  );
}
