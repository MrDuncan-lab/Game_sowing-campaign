import type { JSX } from 'preact';
import { CARDS, CROPS, TRAITS } from '../engine/data';
import type { CropId, TraitId } from '../engine/data';
import {
  CardLike, GameState, cardCells, cardCost, cardDaysShown, cardShape, cropGrow, cropMinT, plural, rub, round2, seedCost, shapeRotations,
  sidejobPay, wlvl, maxExtra, ripenIn, tile, inGrid, sowingSoil, lvl, soilHarvestCost,
} from '../engine/game';
import { CropIcon, CropSprite } from '../art/crops';
import { Icon } from '../art/icons';

const ART: Record<string, string> = {
  water: 'water', fertilizer: 'fertilizer', mulch: 'mulch', care: 'care', weeding: 'weeding', early: 'early', helpers: 'helpers',
  sidejob: 'sidejob', shelter: 'shelter', compost: 'compost', bio: 'bio', snow: 'snow', forage: 'forage',
};
// kept for older callers that print a name with soft hyphens
export const SHY: Record<string, string> = {
  seed_sunflower: 'Подсол­нечник', sidejob: 'Под­работка', fertilizer: 'Под­кормка', seed_potato: 'Карто­фель', seed_corn: 'Куку­руза',
  seed_wheat: 'Пше­ница', seed_seabuckthorn: 'Обле­пиха', seed_strawberry: 'Клуб­ника', seed_watermelon: 'Арбуз', snow: 'Снего­задер­жание', helpers: 'Помощь соседей',
  seed_rye: 'Озимая рожь', compost: 'Ком­пост', bio: 'Био­препарат',
};
const asCard = (c: CardLike) => (typeof c === 'string' ? { def: c } : c);
export function cardDescription(s: GameState, def: string) {
  if(def==='mulch')return 'На 3 недели убирает обычную потерю влаги и смягчает холод и жару. Не поливает; засуха всё ещё сушит.';
  if(def==='care')return 'Урожай каждой растущей грядки в ряду +1. Эффект суммируется.';
  if(def==='weeding')return 'Убирает сорняки в линии и сохраняет её чистой 4 недели. Нужен хотя бы один сорняк.';
  if(def==='snow')return 'Весной: вода 3/3, плодородие +1 и мульча в выбранном ряду.';
  if(def==='compost')return `Плодородие +${wlvl(s,'soilsci')>=2?2:1} на грядке и соседях по стороне, до 5.`;
  if(def==='bio')return `Плодородие +${wlvl(s,'soilsci')>=2?2:1} в квадрате 2×2, до 5.`;
  if(def==='fertilizer')return 'Базовый урожай посадки ×1,5. Каждая грядка — один раз. Зимой только в отапливаемой теплице.';
  if(def==='water')return wlvl(s,'irrigator')?'Влага +2 во всём ряду и столбце.':'Влага +2 на выбранной грядке и соседях по стороне.';
  const d=CARDS[def];return d.kind==='seed'?CROPS[d.crop!].note+(soilHarvestCost(s,d.crop!)?' После сбора: плодородие −1, не ниже 1.':''):d.text;
}

export function cardPrice(s: GameState, c: CardLike): number {
  const k = asCard(c);
  const d = CARDS[k.def];
  return d.kind === 'seed' ? round2(seedCost(s, d.crop!) * cardCells(k).length) : cardCost(s, k.def);
}

// Without a selected bed this is a crop requirement, not a promise about harvest.
// A selected footprint uses the real bed/greenhouse rules, assuming continued watering.
export function seedWeeks(s: GameState, crop: CropId, traits: TraitId[] = [], cells?: [number, number][]): number | null {
  if (!cells) return cropGrow(s, crop, traits);
  if (!cells.length || cells.some(([x, y]) => !inGrid(x, y))) return null;
  const c = structuredClone(s);
  const shift = sowingSoil(c, { def: `seed_${crop}`, traits }, cells);
  const pid = c.nextPid++;
  for (const [x, y] of cells) {
    const t = tile(c, x, y);
    if (!t.owned || t.crop || (CROPS[crop].greenhouseOnly && t.structure !== 'greenhouse')) return null;
    t.soil = shift.get(`${x},${y}`)?.to ?? t.soil;
    t.crop = { id: crop, grown: 0, bonus: 0, mult: 1, planted: c.absWeek, pid, traits: [...traits], ...(CROPS[crop].perennial ? { years: CROPS[crop].perennial } : {}) };
  }
  const dates = cells.map(([x, y]) => ripenIn(c, x, y, { knownOnly: true }));
  return dates.some((n) => n === null) ? null : Math.max(...dates.map((n) => n! + 1));
}

export function cardStat(s: GameState, c: CardLike): { main: string; sub: string; tone?: 'pos' | 'neg' | 'cold' } {
  const k = asCard(c);
  const d = CARDS[k.def];
  if (d.kind === 'seed') {
    const crop = d.crop!;
    const cells = cardCells(k).length;
    const per = CROPS[crop].yield + (k.traits?.includes('yield') ? 1 : 0) + (wlvl(s, 'agronomist') >= 3 ? 2 : wlvl(s, 'agronomist') >= 1 ? 1 : 0);
    const w = seedWeeks(s, crop, k.traits);
    return { main: `${per * cells} ед.`, sub: `рост ${w} нед.`, tone: 'pos' };
  }
  switch (k.def) {
    case 'water': return { main: '+2', sub: wlvl(s, 'irrigator') ? 'ряд и столбец' : 'влаги крестом' };
    case 'fertilizer': return { main: '×1,5', sub: 'базовый урожай' };
    case 'mulch': return { main: '3 нед.', sub: 'бережёт влагу' };
    case 'care': return { main: '+1', sub: 'к грядкам ряда' };
    case 'weeding': return { main: 'линия', sub: 'без сорняков' };
    case 'early': return { main: lvl(s, 'machinery') >= 3 ? '100%' : '−30%', sub: 'сбор сейчас' };
    case 'helpers': return { main: '+1', sub: 'рабочий день' };
    case 'sidejob': return { main: `+${sidejobPay(s)}₽`, sub: 'сразу' };
    case 'shelter': return { main: '+5°', sub: 'квадрат 2×2' };
    case 'compost': return { main: wlvl(s, 'soilsci') >= 2 ? '+2' : '+1', sub: 'плодородие' };
    case 'bio': return { main: wlvl(s, 'soilsci') >= 2 ? '+2' : '+1', sub: 'плодородие 2×2' };
    case 'snow': return { main: 'ряд', sub: 'вода к весне' };
    case 'forage': return { main: 'грибы', sub: 'из тайги' };
    default: return { main: '', sub: '' };
  }
}

export function CardArt({ def, size = 54 }: { def: string; size?: number }) {
  const d = CARDS[def];
  if (d.kind === 'seed') return <CropIcon id={d.crop!} size={size} />;
  return <Icon name={ART[def] ?? 'star'} size={size} />;
}

// The seed's shape on a card. The grid is square and sized by the longest side of the shape, so a cell
// keeps the same size whichever way the shape is turned; the picture scales with the card (em units).
export function ShapeArt({ card, rot = 0 }: { card: CardLike; rot?: number; box?: [number, number] }) {
  const k = asCard(card);
  const crop = CARDS[k.def].crop!;
  const cells = cardShape(k, rot);
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const C = 30, g = 3;
  const n = Math.max(w, h, 1.45);
  const S = n * C + (n - 1) * g;
  const ox = (S - (w * C + (w - 1) * g)) / 2, oy = (S - (h * C + (h - 1) * g)) / 2;
  return (
    <svg class="shape-art" viewBox={`-2 -2 ${S + 4} ${S + 4}`} aria-hidden="true">
      {cells.map(([x, y]) => (
        <g transform={`translate(${ox + x * (C + g)} ${oy + y * (C + g)})`}>
          <rect width={C} height={C} rx={C * 0.2} class="sa-soil" />
          <svg x={0} y={-C * 0.05} width={C} height={C} viewBox="6 2 88 92">
            <CropSprite id={crop} stage={2} />
          </svg>
        </g>
      ))}
    </svg>
  );
}

export function ShapeGlyph({ def, rot = 0, cell = 7, irrigated = false }: { def: string; rot?: number; cell?: number; irrigated?: boolean }) {
  const d = CARDS[def];
  let cells: [number, number][];
  if (def === 'water' && irrigated) cells = [[2,0],[2,1],[0,2],[1,2],[2,2],[3,2],[4,2],[2,3],[2,4]];
  else if (def === 'water' || def === 'mulch' || def === 'compost') cells = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
  else if (d.target === 'block') cells = [[0, 0], [1, 0], [0, 1], [1, 1]];
  else if (def === 'care' || def === 'snow') cells = [[0, 0], [1, 0], [2, 0]];
  else if (def === 'weeding') cells = rot % 2 ? [[0, 0], [0, 1], [0, 2], [0, 3]] : [[0, 0], [1, 0], [2, 0], [3, 0]];
  else if (def === 'fertilizer') return <span class="whole-planting">вся посадка</span>;
  else if (d.target === 'cropTile') cells = [[0, 0]];
  else return null;
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const g = 1.5;
  return (
    <svg class="shape-glyph" viewBox={`0 0 ${w * cell + (w - 1) * g + 4} ${h * cell + (h - 1) * g + 4}`} style={{ width: `${(w * cell + (w - 1) * g + 4) / 9.2}em`, height: `${(h * cell + (h - 1) * g + 4) / 9.2}em` }} aria-hidden="true">
      {cells.map(([x, y]) => <rect x={2 + x * (cell + g)} y={2 + y * (cell + g)} width={cell} height={cell} rx={1.6} />)}
    </svg>
  );
}

export function TraitBadges({ traits, size = 14 }: { traits?: TraitId[]; size?: number }) {
  if (!traits?.length) return null;
  return (
    <span class="trait-badges">
      {traits.map((t) => (
        <span class={`trait t-${t}`} title={TRAITS[t].name}>
          <Icon name={TRAITS[t].icon} size={size} />
        </span>
      ))}
    </span>
  );
}

// One structure for every card, readable in a tight fan: the corner gem (days), one line of name,
// the picture, and the main effect pinned to the left edge — the part a neighbour never covers.
function nameFit(name: string): number {
  return Math.max(0.8, Math.min(1.36, 7.7 / (name.length * 0.63)));
}
// PSV-012 · a long name takes two lines at a steady size instead of shrinking to micro-text;
// a single long word breaks at the soft hyphens of SHY
const TWO_LINE = 13;
const nameLines = (name: string) => (name.length >= TWO_LINE ? 2 : 1);
const SHORT_SUB: Record<string, string> = {
  water: 'влаги', fertilizer: 'урожай', mulch: 'бережёт влагу', care: 'в ряду', weeding: 'прополка', early: 'сбор сейчас', helpers: 'рабочий день',
  sidejob: 'раз в неделю', shelter: 'от града · тепло', compost: 'плодородие', bio: 'почва 2×2', snow: 'вода к весне', forage: 'из тайги',
};
/** PSV-002 · one day cost for the card face, its spoken label and every description (shop, inventory): the same
 *  calculation the engine charges — seeds by area and machinery, fertilizer by the size of the planting it feeds. */
export function cardDaysText(s: GameState, card: CardLike): string {
  const d = cardDaysShown(s, card), def = typeof card === 'string' ? card : card.def;
  return def === 'fertilizer' ? `от ${d} дн. — по размеру посадки` : `${d} дн.`;
}

export function CardView({
  s, card, selected, blocked, onClick, compact, rot = 0, onPointerDown, rotHint, mini, noPrice,
}: {
  s: GameState;
  card: { def: string; extra?: [number, number][]; traits?: TraitId[]; temp?: boolean };
  noPrice?: boolean;
  selected?: boolean;
  blocked?: string | null;
  onClick?: () => void;
  compact?: boolean;
  mini?: boolean;
  rot?: number;
  rotHint?: boolean;
  onPointerDown?: (e: JSX.TargetedPointerEvent<HTMLButtonElement>) => void;
}) {
  const d = CARDS[card.def];
  const days = cardDaysShown(s, card);
  const price = cardPrice(s, card);
  const st = cardStat(s, card);
  const rotatable = d.target === 'line' || (d.kind === 'seed' && shapeRotations(card).length > 1);
  const minT = d.crop ? cropMinT(d.crop, card.traits) : null;
  const sub = d.kind === 'seed' ? st.sub.replace('рост ', 'за ') : SHORT_SUB[card.def] ?? st.sub;
  return (
    <button
      type="button"
      data-card-uid={'uid' in card?String(card.uid):undefined}
      class={`card pc kind-${d.kind}${card.temp ? ' temp' : ' perm'}${selected ? ' selected' : ''}${blocked ? ' blocked' : ''}${compact ? ' compact' : ''}${mini ? ' mini' : ''}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-pressed={selected}
      aria-label={`${d.name}. ${card.def==='fertilizer'?'От ':''}${days} ${plural(days, 'день', 'дня', 'дней')}${price > 0 ? `, ${rub(price)} ₽` : ''}${blocked ? `. ${blocked}` : ''}`}
      title={`${d.name}. ${cardDescription(s,card.def)}${blocked ? ` — ${blocked}` : ''}`}
    >
      <span class="pc-face">
        <span class="pc-band">{nameLines(d.name) === 2
          ? <span class="pc-name two">{SHY[card.def] ?? d.name}</span>
          : <span class="pc-name" style={{ fontSize: `${nameFit(d.name)}em` }}>{d.name}</span>}</span>
        <span class="pc-art">
          {d.kind === 'seed' ? (
            <span key={rot} class={selected && rotHint ? 'shape-turn' : 'shape-still'}>
              <ShapeArt card={card} rot={rot} />
            </span>
          ) : (
            <>
              <CardArt def={card.def} size={compact || mini ? 30 : 38} />
              <span key={rot} class={selected && rotHint ? 'shape-turn' : 'shape-still'}>
                <ShapeGlyph def={card.def} rot={rot} cell={6} irrigated={wlvl(s,'irrigator')>0} />
              </span>
            </>
          )}
        </span>
        <span class={`pc-stat${st.tone ? ` ${st.tone}` : ''}`}>
          <b>{st.main}</b>
          <small>{sub}</small>
        </span>
      </span>
      {/* the culture at the card's left edge — the part a neighbour in the fan never covers */}
      <span class="pc-index" aria-hidden="true"><CardArt def={card.def} size={20} /></span>
      <span class="gem gem-day" aria-hidden="true">{card.def === 'fertilizer' ? `${days}+` : days}</span>
      {price > 0 && !noPrice && <span class={`gem gem-money${d.kind === 'seed' && s.money < price ? ' debt' : ''}`} aria-hidden="true">{rub(price)}</span>}
      {minT !== null && <span class={`pc-temp${minT >= 12 ? ' warm' : minT <= 3 ? ' cold' : ''}`} title={`Растёт, когда почва не холоднее ${minT}°`}>от {minT > 0 ? '+' : ''}{minT}°</span>}
      <TraitBadges traits={card.traits} />
      {!!card.extra?.length && <span class="up-tag" title={`Селекция: +${card.extra.length} кл. (до ${maxExtra(s)})`}>+{card.extra.length}</span>}
      {selected && rotatable && rotHint && <span class="rot-pill" aria-hidden="true">⟳ ещё раз</span>}
      {card.temp && <span class="temp-card-tag">разовая</span>}
    </button>
  );
}
