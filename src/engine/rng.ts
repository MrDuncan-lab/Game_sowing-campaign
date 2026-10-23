// Deterministic PRNG (mulberry32). The state lives inside the game state so every run can be replayed.

export function nextU32(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function rand(state: { rng: number }): number {
  return nextU32(state) / 4294967296;
}

export function randInt(state: { rng: number }, n: number): number {
  return Math.floor(rand(state) * n);
}

export function gauss(state: { rng: number }): number {
  const u = Math.max(rand(state), 1e-9);
  const v = rand(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickWeighted<T>(state: { rng: number }, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = rand(state) * total;
  for (const [item, w] of items) {
    r -= Math.max(0, w);
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

export function shuffle<T>(state: { rng: number }, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(state, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
