// Farmer, house (5 levels), order board and barn. Same outline language as crops.
import type { CropId } from '../engine/data';
import { CropSprite } from './crops';
import { icons } from './icons';
import { P } from './palette';

const SW = 2;

export type FarmerAction =
  | 'idle' | 'plant' | 'water' | 'fertilizer' | 'mulch' | 'care' | 'early' | 'paper' | 'coin' | 'build' | 'harvest';

export { Farmer } from './farmer';

// ---------- house ----------
// Five levels on one frame (ground at y≈146). Every level keeps what the previous ones added, as the bonuses do:
// 1 Изба — log cabin; 2 Погреб — stone footing and a cellar mound; 3 Мастерская — a workshop annex;
// 4 Кабинет — a taller roof with a lit dormer and a carved ridge; 5 Усадьба — painted walls, porch, flowers.
// Prices and labels are never drawn here: the interface shows them in readable HTML.

const LOG = ['#c58a52', '#b27947'];
const TRIM = '#4f7fbf';

function Window({ x, y, w = 24, h = 22, trim = '#f4ead2', lit = true }: { x: number; y: number; w?: number; h?: number; trim?: string; lit?: boolean }) {
  return (
    <g>
      <path d={`M${x - 4} ${y} Q${x + w / 2} ${y - 13} ${x + w + 4} ${y}z`} fill={trim} stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
      <rect x={x - 3} y={y} width={w + 6} height={h + 4} rx={2} fill={trim} stroke={P.ink} stroke-width={1.8} />
      <rect x={x} y={y + 3} width={w} height={h - 2} fill={lit ? '#ffd877' : '#bfe3f2'} stroke={P.ink} stroke-width={1.4} />
      <path d={`M${x + w / 2} ${y + 3} v${h - 2} M${x} ${y + 3 + (h - 2) / 2} h${w}`} stroke={P.ink} stroke-width={1.3} />
      <rect x={x - 5} y={y + h + 3} width={w + 10} height={4} rx={1.5} fill={trim} stroke={P.ink} stroke-width={1.4} />
    </g>
  );
}

function Door({ x, y, w = 22, h = 36, fill = P.woodDark }: { x: number; y: number; w?: number; h?: number; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} stroke={P.ink} stroke-width={SW} />
      <path d={`M${x + w / 3} ${y + 2} v${h - 4} M${x + (2 * w) / 3} ${y + 2} v${h - 4}`} stroke="rgba(0,0,0,0.22)" stroke-width={1.4} />
      <circle cx={x + w - 5} cy={y + h / 2 + 2} r={1.9} fill={P.gold} stroke={P.ink} stroke-width={0.8} />
    </g>
  );
}

function Logs({ x0, x1, y0, y1 }: { x0: number; x1: number; y0: number; y1: number }) {
  const rows = Math.round((y1 - y0) / 9.6);
  const hgt = (y1 - y0) / rows;
  return (
    <g>
      {Array.from({ length: rows }, (_, i) => (
        <g>
          <rect x={x0} y={y0 + i * hgt} width={x1 - x0} height={hgt} rx={hgt / 2} fill={LOG[i % 2]} stroke={P.ink} stroke-width={1.5} />
          <path d={`M${x0 + 6} ${y0 + i * hgt + hgt * 0.35} h${(x1 - x0) * 0.25} M${x0 + (x1 - x0) * 0.55} ${y0 + i * hgt + hgt * 0.62} h${(x1 - x0) * 0.3}`} stroke="rgba(90,55,25,0.35)" stroke-width={1.2} stroke-linecap="round" />
          <circle cx={x0 - 1} cy={y0 + i * hgt + hgt / 2} r={hgt / 2 + 0.6} fill="#e2b27a" stroke={P.ink} stroke-width={1.3} />
          <circle cx={x1 + 1} cy={y0 + i * hgt + hgt / 2} r={hgt / 2 + 0.6} fill="#e2b27a" stroke={P.ink} stroke-width={1.3} />
          <circle cx={x0 - 1} cy={y0 + i * hgt + hgt / 2} r={1.6} fill="none" stroke="#b27947" stroke-width={0.9} />
          <circle cx={x1 + 1} cy={y0 + i * hgt + hgt / 2} r={1.6} fill="none" stroke="#b27947" stroke-width={0.9} />
        </g>
      ))}
    </g>
  );
}

function Roof({ apex, x0, x1, eave }: { apex: number; x0: number; x1: number; eave: number }) {
  const mid = (x0 + x1) / 2;
  const at = (y: number) => [x0 + ((eave - y) * (mid - x0)) / (eave - apex), x1 - ((eave - y) * (x1 - mid)) / (eave - apex)];
  const rows = [eave - 12, eave - 24, eave - 36].filter((y) => y > apex + 8);
  return (
    <g>
      <path d={`M${x0} ${eave} L${mid} ${apex} L${x1} ${eave}z`} fill="#a8432f" stroke={P.ink} stroke-width={SW} stroke-linejoin="round" />
      {rows.map((y) => {
        const [a, b] = at(y);
        return <path d={`M${a + 3} ${y} H${b - 3}`} stroke="#83321f" stroke-width={2.2} stroke-dasharray="7 3" />;
      })}
      <path d={`M${x0 - 4} ${eave + 2} L${mid} ${apex - 4} L${x1 + 4} ${eave + 2}`} fill="none" stroke={P.woodDark} stroke-width={5} stroke-linejoin="round" stroke-linecap="round" />
      <path d={`M${x0 - 4} ${eave + 2} L${mid} ${apex - 4} L${x1 + 4} ${eave + 2}`} fill="none" stroke={P.ink} stroke-width={1.2} stroke-linejoin="round" />
    </g>
  );
}

function Woodpile({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-2} y={14} width={30} height={4} rx={1.5} fill={P.woodDark} stroke={P.ink} stroke-width={1.2} />
      {[[3, 10], [11, 10], [19, 10], [7, 3], [15, 3]].map(([a, b]) => (
        <g>
          <circle cx={a + 1} cy={b} r={4.4} fill="#e2b27a" stroke={P.ink} stroke-width={1.3} />
          <circle cx={a + 1} cy={b} r={1.6} fill="none" stroke="#b27947" stroke-width={0.9} />
        </g>
      ))}
    </g>
  );
}

function Cellar() {
  return (
    <g class="cellar">
      <path d="M-6 146 Q-4 108 18 106 Q40 108 42 146z" fill="#8a6a43" stroke={P.ink} stroke-width={SW} />
      <path class="cellar-turf" d="M-4 128 Q-2 108 18 106 Q38 108 40 128 Q30 118 18 118 Q4 118 -4 128z" fill={P.grassDark} stroke={P.ink} stroke-width={1.4} />
      <path d="M7 146 V128 Q18 116 29 128 V146z" fill={P.woodDark} stroke={P.ink} stroke-width={SW} />
      <path d="M18 122 V146 M7 136 h22" stroke="rgba(0,0,0,0.25)" stroke-width={1.3} />
    </g>
  );
}

function Workshop() {
  return (
    <g class="workshop">
      <path d="M142 98 L198 108 L198 146 L142 146z" fill="#c9965c" stroke={P.ink} stroke-width={SW} />
      {[112, 122, 132].map((y) => <path d={`M144 ${y} H196`} stroke="rgba(63,42,29,0.28)" stroke-width={1.3} />)}
      <path d="M138 95 L202 107" stroke={P.woodDark} stroke-width={7} stroke-linecap="round" />
      <path d="M138 95 L202 107" stroke={P.ink} stroke-width={1.2} stroke-linecap="round" />
      <rect x={156} y={116} width={30} height={30} fill="#3a2618" stroke={P.ink} stroke-width={SW} />
      <path d="M156 116 l-8 3 v27 l8 0z M186 116 l8 3 v27 l-8 0z" fill={P.wood} stroke={P.ink} stroke-width={1.4} />
      <path d="M161 122 h12 l-2 4 h-8z" fill={P.stone} stroke="#d9cbb0" stroke-width={0.9} />
      <path d="M178 121 v14 M174 121 h8" stroke="#d9cbb0" stroke-width={2} stroke-linecap="round" />
      <g transform="translate(170 104)">
        <circle r={6.5} fill={P.gold} stroke={P.ink} stroke-width={1.5} />
        <circle r={2.3} fill="#c8931f" />
        {[0, 60, 120, 180, 240, 300].map((a) => <rect x={-1.6} y={-9} width={3.2} height={3.4} fill={P.gold} stroke={P.ink} stroke-width={0.9} transform={`rotate(${a})`} />)}
      </g>
    </g>
  );
}

function Flowers({ xs, y }: { xs: number[]; y: number }) {
  return (
    <g class="house-flowers">
      {xs.map((x, i) => (
        <g transform={`translate(${x} ${y})`}>
          <path d="M0 4 v6" stroke={P.stem} stroke-width={1.6} />
          <circle r={3.6} fill={[P.flowerPink, P.flowerYellow, P.red, P.flowerWhite][i % 4]} stroke={P.ink} stroke-width={1} />
          <circle r={1.2} fill={P.gold} />
        </g>
      ))}
    </g>
  );
}

export function House({ level, building = false, fresh = false }: { level: number; building?: boolean; fresh?: boolean }) {
  const manor = level >= 5;
  const apex = level >= 4 ? 16 : 26;
  return (
    <g class={`house lv-${level}${building ? ' is-building' : ''}${fresh ? ' fresh' : ''}`}>
      <ellipse cx={100} cy={147} rx={level >= 3 ? 102 : 88} ry={8} fill="rgba(0,0,0,0.14)" />
      {/* chimney behind the roof, smoke above it */}
      <rect x={118} y={level >= 4 ? 22 : 30} width={14} height={34} fill="#9a5a3c" stroke={P.ink} stroke-width={SW} />
      <path d={`M116 ${level >= 4 ? 22 : 30} h18`} stroke={P.ink} stroke-width={4} stroke-linecap="round" />
      {manor && <rect x={52} y={30} width={12} height={26} fill="#9a5a3c" stroke={P.ink} stroke-width={SW} />}
      <g class="smoke">
        <circle cx={126} cy={level >= 4 ? 14 : 22} r={6} fill="#e9e6df" opacity={0.85} />
        <circle cx={133} cy={level >= 4 ? 2 : 10} r={8} fill="#f2efe8" opacity={0.7} />
      </g>
      {level >= 3 && <Workshop />}
      {level >= 2 && <Cellar />}
      {/* footing */}
      {level >= 2 ? (
        <g>
          <rect x={28} y={132} width={124} height={14} rx={3} fill={P.stone} stroke={P.ink} stroke-width={SW} />
          {[36, 54, 72, 90, 108, 126, 142].map((x, i) => <path d={`M${x} ${i % 2 ? 132 : 139} v7`} stroke={P.stoneDark} stroke-width={1.5} />)}
          <path d="M28 139 H152" stroke={P.stoneDark} stroke-width={1.2} />
        </g>
      ) : (
        <rect x={30} y={134} width={120} height={8} rx={2} fill={P.woodDark} stroke={P.ink} stroke-width={1.6} />
      )}
      {/* walls */}
      {manor ? (
        <g>
          <rect x={34} y={76} width={112} height={58} fill="#f4ead2" stroke={P.ink} stroke-width={SW} />
          {[86, 96, 106, 116, 126].map((y) => <path d={`M35 ${y} H145`} stroke="rgba(63,42,29,0.18)" stroke-width={1.3} />)}
          <rect x={31} y={76} width={6} height={58} fill={TRIM} stroke={P.ink} stroke-width={1.4} />
          <rect x={143} y={76} width={6} height={58} fill={TRIM} stroke={P.ink} stroke-width={1.4} />
        </g>
      ) : (
        <Logs x0={34} x1={146} y0={76} y1={134} />
      )}
      <Roof apex={apex} x0={18} x1={162} eave={80} />
      {/* gable: a round attic window, or a lit dormer from the «Кабинет» on */}
      {level >= 4 ? (
        <g>
          <path d="M76 66 L90 50 L104 66z" fill="#8a3524" stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
          <rect x={80} y={64} width={20} height={14} fill={manor ? '#f4ead2' : '#c58a52'} stroke={P.ink} stroke-width={1.6} />
          <rect x={83} y={66} width={14} height={10} fill="#ffd877" stroke={P.ink} stroke-width={1.2} />
          <path d="M90 66 v10" stroke={P.ink} stroke-width={1.1} />
          <circle cx={90} cy={70} r={9} fill="#fff3b0" opacity={0.35} />
          {/* carved ridge horse */}
          <path d="M90 13 q-2 -9 5 -12 q4 -1 6 3 l-3 2 q-1 -2 -3 -1 q-2 2 0 8z" fill={P.woodLight} stroke={P.ink} stroke-width={1.4} stroke-linejoin="round" />
        </g>
      ) : (
        <g>
          <circle cx={90} cy={60} r={8} fill="#e2b27a" stroke={P.ink} stroke-width={1.6} />
          <circle cx={90} cy={60} r={5} fill="#ffd877" stroke={P.ink} stroke-width={1.2} />
          <path d="M90 55 v10 M85 60 h10" stroke={P.ink} stroke-width={1} />
        </g>
      )}
      {/* windows, door, porch */}
      {manor ? (
        <g>
          <Window x={44} y={92} trim={TRIM} />
          <Window x={120} y={92} trim={TRIM} />
          <rect x={41} y={119} width={30} height={6} rx={2} fill={P.woodDark} stroke={P.ink} stroke-width={1.2} />
          <rect x={117} y={119} width={30} height={6} rx={2} fill={P.woodDark} stroke={P.ink} stroke-width={1.2} />
          <Flowers xs={[45, 52, 59, 66]} y={117} />
          <Flowers xs={[121, 128, 135, 142]} y={117} />
          <Door x={79} y={98} w={22} h={36} fill="#6a3f22" />
          <path d="M70 92 L90 80 L110 92z" fill="#f4ead2" stroke={P.ink} stroke-width={1.6} stroke-linejoin="round" />
          <rect x={70} y={92} width={40} height={5} fill={TRIM} stroke={P.ink} stroke-width={1.4} />
          <rect x={71} y={97} width={4} height={37} fill="#fffaf0" stroke={P.ink} stroke-width={1.3} />
          <rect x={105} y={97} width={4} height={37} fill="#fffaf0" stroke={P.ink} stroke-width={1.3} />
          <rect x={68} y={134} width={44} height={5} rx={1.5} fill={P.stone} stroke={P.ink} stroke-width={1.3} />
          <rect x={72} y={139} width={36} height={6} rx={1.5} fill={P.stoneDark} stroke={P.ink} stroke-width={1.3} />
          <Flowers xs={[34, 42, 136, 144, 152]} y={140} />
          <g transform="translate(164 70)">
            <path d="M0 0 V76" stroke={P.ink} stroke-width={2.2} />
            <path d="M1 2 l16 5 l-16 5z" fill={P.red} stroke={P.ink} stroke-width={1.3} />
          </g>
        </g>
      ) : (
        <g>
          <Window x={48} y={92} />
          <Door x={100} y={98} />
          <rect x={96} y={134} width={30} height={5} rx={1.5} fill={level >= 2 ? P.stoneDark : P.wood} stroke={P.ink} stroke-width={1.3} />
        </g>
      )}
      {level >= 2 && (
        <g transform="translate(24 127)">
          <rect x={0} y={0} width={15} height={19} rx={5} fill="#b27947" stroke={P.ink} stroke-width={1.6} />
          <path d="M0 6 h15 M0 13 h15" stroke={P.stoneDark} stroke-width={2} />
        </g>
      )}
      {level >= 4 && !manor && (
        <g transform="translate(124 96)">
          <path d="M0 0 h6" stroke={P.ink} stroke-width={2} />
          <rect x={2} y={1} width={8} height={11} rx={2} fill="#ffd877" stroke={P.ink} stroke-width={1.4} />
          <circle cx={6} cy={6.5} r={7} fill="#fff3b0" opacity={0.35} />
        </g>
      )}
      {level < 3 && <Woodpile x={152} y={124} />}
      {level === 1 && (
        <g stroke={P.woodDark} stroke-width={3} stroke-linecap="round">
          <path d="M4 146 V122 M18 146 V120 M30 146 V124" />
          <path d="M0 128 H32 M0 138 H32" stroke-width={2.4} />
        </g>
      )}
      {building && <Scaffold />}
      {fresh && (
        <g class="house-sparkles" pointer-events="none">
          {[[24, 60], [160, 52], [90, 4], [178, 96]].map(([x, y], i) => (
            <path style={{ animationDelay: `${i * 0.12}s` }} d={`M${x} ${y - 8} L${x + 2.5} ${y - 2.5} L${x + 8} ${y} L${x + 2.5} ${y + 2.5} L${x} ${y + 8} L${x - 2.5} ${y + 2.5} L${x - 8} ${y} L${x - 2.5} ${y - 2.5}z`} fill={P.gold} stroke={P.ink} stroke-width={1.2} />
          ))}
        </g>
      )}
    </g>
  );
}

// Construction is drawn over the house that stands now: poles, planks, a ladder, a bucket on a rope, and the
// materials on the ground — boards, bricks and the blueprint. The new level appears only when it is finished.
export function Scaffold() {
  return (
    <g class="scaffold" pointer-events="none">
      {[22, 70, 112, 160].map((x) => <path d={`M${x} 14 V146`} stroke={P.woodDark} stroke-width={5} stroke-linecap="round" />)}
      {[22, 70, 112, 160].map((x) => <path d={`M${x} 14 V146`} stroke={P.ink} stroke-width={1} opacity={0.5} />)}
      {[60, 102].map((y) => (
        <g>
          <rect x={12} y={y} width={158} height={7} rx={2} fill={P.woodLight} stroke={P.ink} stroke-width={1.5} />
          <path d={`M40 ${y} v7 M92 ${y} v7 M136 ${y} v7`} stroke={P.woodDark} stroke-width={1.1} />
        </g>
      ))}
      <path d="M22 102 L70 60 M112 102 L160 60 M22 60 L70 20" stroke={P.woodDark} stroke-width={2.6} />
      {/* ladder */}
      <g transform="rotate(-12 176 146)">
        <path d="M168 146 V64 M182 146 V64" stroke={P.wood} stroke-width={3.4} stroke-linecap="round" />
        {[74, 88, 102, 116, 130].map((y) => <path d={`M168 ${y} H182`} stroke={P.wood} stroke-width={2.6} />)}
      </g>
      {/* bucket on a rope */}
      <path d="M134 14 h30 M160 14 v22" stroke={P.ink} stroke-width={2} fill="none" />
      <g class="bucket"><path d="M153 36 h14 l-2 11 h-10z" fill={P.stone} stroke={P.ink} stroke-width={1.5} /></g>
      {/* boards */}
      <g transform="translate(118 134)">
        <rect x={0} y={4} width={40} height={6} rx={1.5} fill={P.woodLight} stroke={P.ink} stroke-width={1.2} />
        <rect x={4} y={-2} width={40} height={6} rx={1.5} fill={P.wood} stroke={P.ink} stroke-width={1.2} />
      </g>
      {/* bricks */}
      <g transform="translate(-2 130)">
        {[[0, 10], [11, 10], [22, 10], [5, 3], [16, 3], [10, -4]].map(([x, y]) => (
          <rect x={x} y={y} width={11} height={6} rx={1} fill="#c4664a" stroke={P.ink} stroke-width={1.1} />
        ))}
      </g>
      {/* blueprint on a little easel */}
      <g transform="translate(176 102)">
        <path d="M2 40 L10 0 L18 40 M10 0 V40" stroke={P.woodDark} stroke-width={2.2} fill="none" />
        <rect x={-4} y={4} width={28} height={22} rx={2} fill="#3f78b8" stroke={P.ink} stroke-width={1.5} />
        <path d="M0 22 L8 12 L16 22z M4 22 v-4 h8 v4" stroke="#e8f2ff" stroke-width={1.2} fill="none" />
        <path d="M1 8 h18" stroke="#e8f2ff" stroke-width={1} opacity={0.8} />
      </g>
    </g>
  );
}

// ---------- order board ----------

export function OrderBoard({ crops, fresh }: { crops: CropId[]; fresh: boolean }) {
  return (
    <g class="board-art">
      <ellipse cx={50} cy={118} rx={46} ry={6} fill="rgba(0,0,0,0.14)" />
      <path d="M18 116 V40 M82 116 V40" stroke={P.woodDark} stroke-width={7} stroke-linecap="round" />
      <rect x={8} y={30} width={84} height={62} rx={6} fill={P.woodLight} stroke={P.ink} stroke-width={SW} />
      <path d="M10 22 L50 10 L90 22" fill="none" stroke="#a8432f" stroke-width={7} stroke-linecap="round" />
      {crops.slice(0, 3).map((c, i) => (
        <g transform={`translate(${16 + i * 25} ${38})`}>
          <rect width={22} height={30} fill="#fffaf0" stroke={P.ink} stroke-width={1.4} transform={`rotate(${(i - 1) * 5} 11 15)`} />
          <circle cx={11} cy={2} r={2.4} fill={P.red} stroke={P.ink} stroke-width={0.8} />
          <svg x={0} y={6} width={22} height={22} viewBox="10 6 80 82"><CropSprite id={c} stage={2} /></svg>
        </g>
      ))}
      {!crops.length && <text x={50} y={66} text-anchor="middle" class="yard-label small">пусто</text>}
      {fresh && (
        <g transform="translate(88 28)">
          <g class="fresh-badge">
            <circle r={11} fill={P.red} stroke={P.ink} stroke-width={SW} />
            <text y={5} text-anchor="middle" class="badge-text">!</text>
          </g>
        </g>
      )}
    </g>
  );
}

// ---------- barn ----------

export function Barn({ used, cap }: { used: number; cap: number }) {
  const fill = Math.min(1, used / Math.max(1, cap));
  return (
    <g class="barn">
      <ellipse cx={80} cy={146} rx={78} ry={8} fill="rgba(0,0,0,0.14)" />
      <path d="M12 62 L80 18 L148 62 V144 H12z" fill="#c64a35" stroke={P.ink} stroke-width={SW} />
      <path d="M6 64 L80 14 L154 64" fill="none" stroke="#f4ead2" stroke-width={7} stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6 64 L80 14 L154 64" fill="none" stroke={P.ink} stroke-width={1.6} />
      <rect x={66} y={40} width={28} height={20} fill="#3f2a1d" stroke="#f4ead2" stroke-width={3} />
      <rect x={48} y={84} width={64} height={60} fill="#a63a28" stroke="#f4ead2" stroke-width={4} />
      <path d="M50 86 L110 142 M110 86 L50 142 M80 84 V144" stroke="#f4ead2" stroke-width={3} />
      <g transform="translate(14 96)">
        <rect width={28} height={44} rx={4} fill="#fff7df" stroke={P.ink} stroke-width={SW} />
        <rect x={4} y={4 + 36 * (1 - fill)} width={20} height={36 * fill} rx={2} fill={P.wheat} />
      </g>
      <g transform="translate(118 112)">
        <rect x={0} y={0} width={36} height={22} rx={4} fill={P.parchment} stroke={P.ink} stroke-width={1.6} />
        <text x={18} y={16} text-anchor="middle" class="yard-label">{used}/{cap}</text>
      </g>
    </g>
  );
}
