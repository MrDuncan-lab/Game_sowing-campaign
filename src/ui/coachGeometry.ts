type Point = [number, number];
type Polygon = Point[];
export interface CardFocus {
  path: string;
  point: Point;
}
const focusCache = new WeakMap<HTMLElement, {key: string; value: CardFocus}>();
const cross = (a: Point, b: Point, p: Point) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const area = (p: Polygon) => Math.abs(p.reduce((sum, a, i) => {
  const b = p[(i + 1) % p.length];
  return sum + a[0] * b[1] - a[1] * b[0];
}, 0)) / 2;

// CSS transforms place each card in the fan. Their linear part gives its four
// screen-space corners; the measured bounds supply the translation/origin.
function corners(el: HTMLElement, padding = 0): Polygon {
  let matrix = new DOMMatrix();
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const transform = getComputedStyle(node).transform;
    if (transform !== 'none') matrix = new DOMMatrix(transform).multiply(matrix);
  }
  const w = el.offsetWidth, h = el.offsetHeight, r = el.getBoundingClientRect();
  const raw: Polygon = [[0, 0], [matrix.a * w, matrix.b * w], [matrix.a * w + matrix.c * h, matrix.b * w + matrix.d * h], [matrix.c * h, matrix.d * h]];
  const minX = Math.min(...raw.map(p => p[0])), minY = Math.min(...raw.map(p => p[1]));
  const spanX = Math.max(...raw.map(p => p[0])) - minX, spanY = Math.max(...raw.map(p => p[1])) - minY;
  const padded: Polygon = [[-padding, -padding], [w + padding, -padding], [w + padding, h + padding], [-padding, h + padding]];
  return padded.map(([x, y]) => [r.left + (matrix.a * x + matrix.c * y - minX) * r.width / (spanX || 1), r.top + (matrix.b * x + matrix.d * y - minY) * r.height / (spanY || 1)]);
}

function halfPlane(polygon: Polygon, a: Point, b: Point, inside: boolean): Polygon {
  const result: Polygon = [];
  const side = (p: Point) => (inside ? 1 : -1) * cross(a, b, p);
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i], q = polygon[(i + 1) % polygon.length], dp = side(p), dq = side(q);
    if (dp >= -0.001) result.push(p);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
      const t = dp / (dp - dq);
      result.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return result;
}

function subtract(polygon: Polygon, cover: Polygon): Polygon[] {
  if (cover.some((a, i) => polygon.every(p => cross(a, cover[(i + 1) % cover.length], p) < -0.001))) return [polygon];
  const pieces: Polygon[] = [];
  let remainder = polygon;
  for (let i = 0; i < cover.length && remainder.length; i++) {
    const a = cover[i], b = cover[(i + 1) % cover.length];
    const outside = halfPlane(remainder, a, b, false);
    if (outside.length >= 3 && area(outside) > 1) pieces.push(outside);
    remainder = halfPlane(remainder, a, b, true);
  }
  return pieces;
}

function center(polygon: Polygon): Point {
  let sum = 0, x = 0, y = 0;
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length], weight = a[0] * b[1] - b[0] * a[1];
    sum += weight; x += (a[0] + b[0]) * weight; y += (a[1] + b[1]) * weight;
  });
  return sum ? [x / (3 * sum), y / (3 * sum)] : polygon[0];
}

/** Visible face only: a full bounding rectangle would light the neighbouring cards. */
export function visibleCardFocus(card: HTMLElement): CardFocus | null {
  const occluders: HTMLElement[] = [];
  const slot = card.closest<HTMLElement>('.fan-slot'), fan = slot?.parentElement;
  if (slot && fan) {
    const layer = (el: HTMLElement) => Number(el.classList.contains('leaving') ? getComputedStyle(el).zIndex : el.style.zIndex || getComputedStyle(el).zIndex) || 0;
    const z = layer(slot);
    for (const other of fan.querySelectorAll<HTMLElement>('.fan-slot')) {
      if (other === slot) continue;
      const oz = layer(other);
      if (oz < z || (oz === z && !(slot.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING))) continue;
      const cover = other.querySelector<HTMLElement>('.card');
      if (!cover || !cover.getBoundingClientRect().width || getComputedStyle(other).visibility === 'hidden') continue;
      occluders.push(cover, ...cover.querySelectorAll<HTMLElement>('.gem, .rot-pill'));
    }
  }
  // The fan usually stands still. Recompute polygons only while its measured
  // geometry changes (resize, card lift, reorder); still verify the live hit.
  const stamp = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height].join(',');
  };
  const key = [innerWidth, innerHeight, card.dataset.cardUid, slot?.getAttribute('style'), stamp(card), ...occluders.map(stamp)].join('|');
  const hitsCard = ([x, y]: Point) => document.elementFromPoint(x, y)?.closest('.card') === card;
  const cached = focusCache.get(card);
  if (cached?.key === key && hitsCard(cached.value.point)) return cached.value;
  let pieces: Polygon[] = [corners(card)];
  for (const face of occluders) {
    // Keep the cutout just inside the front card's edge: offsetWidth rounds
    // fractional CSS pixels, and antialiased borders must remain shaded.
    if (face.getBoundingClientRect().width) pieces = pieces.flatMap(piece => subtract(piece, corners(face, 1.5)));
  }
  const viewport: Polygon = [[0, 0], [innerWidth, 0], [innerWidth, innerHeight], [0, innerHeight]];
  for (let i = 0; i < viewport.length; i++) pieces = pieces.map(p => halfPlane(p, viewport[i], viewport[(i + 1) % 4], true)).filter(p => p.length >= 3 && area(p) > 1);
  pieces.sort((a, b) => area(b) - area(a));
  let point: Point | undefined;
  for (const polygon of pieces) {
    const mid = center(polygon);
    // Normally the centroid is safely inside the visible strip. Try inset
    // alternatives too, e.g. when a badge or rounded corner covers its edge.
    point = [mid, ...polygon.map(([x, y]): Point => [(x + mid[0]) / 2, (y + mid[1]) / 2])].find(p => hitsCard(p) && hitsCard([p[0] - 2, p[1]]) && hitsCard([p[0] + 2, p[1]]));
    if (point) break;
  }
  if (!point) return null;
  const value = {point, path: pieces.map(p => `M${p.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join('L')}Z`).join(' ')};
  focusCache.set(card, {key, value});
  return value;
}
