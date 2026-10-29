// Shared geometry of the region map (viewBox 0 0 400 300): the painted base (tools/map) and the live layer
// (src/ui/MapScreen) must agree on where the pins, the windmill, the railway and the sea are.
export const MAP_W = 400, MAP_H = 300;
// rent: Заречье, Пряхин's fields across the Don from the home village
export const MAP_PINS = { chernozem: [150, 96], kuban: [198, 212], altai: [320, 112], rent: [62, 112] } as const;
export const MILL_HUB: [number, number] = [248, 92];
export const RAILWAY = 'M164 108 C178 126 200 140 214 144 C230 149 246 152 262 147 C276 142 288 132 300 118';
export const SEA = 'M11 150 C32 148 50 152 64 157 C82 163 100 164 116 168 C122 170 121 175 115 176 C104 178 94 179 90 186 C88 196 98 206 106 220 C114 234 118 252 124 266 C128 276 132 284 136 289 L11 289 Z';
export const SMOKE: [number, number][] = [[201, 101], [237, 108], [143, 183], [157, 189]];
export const GLINTS: [number, number][] = [[24, 166], [70, 196], [30, 210], [92, 236], [20, 248], [104, 272], [60, 286]];
