// Лёва — the lab's young breeder, a postgraduate of Борис Ильич from the agronomy college.
// Ink-and-paper like the farmer: three-quarter view facing right, ground at y = 0, hair top near y = -100.
// A small rig: every moving part is a group whose joint is its transform origin (CSS transform-box: view-box,
// origin in local units), so the loop — look through the magnifier, write it down, look up at the player —
// is made of real motions. Two moods: `work` (a project on the desk) and `wait` (free tables, he reads).
// Behind a desk only the upper body is seen, but the model is whole so it can stand anywhere.
const INK = '#3f2a1d';
const SKIN = '#f1c8a0', SKIN_D = '#dcae86';
const HAIR = '#c8662e', HAIR_D = '#9e4a1f';
const COAT = '#fbf7ec', COAT_D = '#e6dfcd';
const KNIT = '#5f8f4a', KNIT_L = '#e9dfb8';
const TROUS = '#6b5440', SHOE = '#4a3324';

function Magnifier() {
  return (
    <g class="sc-glass">
      <path d="M0 0 L9 -9" stroke={INK} stroke-width={4.2} stroke-linecap="round" />
      <path d="M0 0 L9 -9" stroke="#b07a46" stroke-width={2.2} stroke-linecap="round" />
      <circle cx={14} cy={-14} r={7.4} fill="rgba(214,238,247,.55)" stroke="#6b5a48" stroke-width={2.6} />
      <circle cx={14} cy={-14} r={7.4} fill="none" stroke={INK} stroke-width={1} />
      <path d="M10 -17 Q12 -20 16 -20" fill="none" stroke="#fff" stroke-width={1.4} opacity={.9} stroke-linecap="round" />
    </g>
  );
}
function Clipboard() {
  return (
    <g class="sc-board">
      <rect x={-9} y={-15} width={18} height={23} rx={2} fill="#b98351" stroke={INK} stroke-width={1.3} />
      <rect x={-7} y={-12} width={14} height={18} rx={1} fill="#fffaf0" stroke={INK} stroke-width={.8} />
      <rect x={-4} y={-17} width={8} height={4} rx={1} fill="#8a8f96" stroke={INK} stroke-width={.8} />
      <path d="M-5 -8 h10 M-5 -5 h8 M-5 -2 h10 M-5 1 h6" stroke="#a89880" stroke-width={.9} />
      <path d="M-4 4 q2 -3 4 0 q2 -3 4 0" fill="none" stroke="#5f8f4a" stroke-width={1} />
    </g>
  );
}

// Sleeve, forearm and wrist share their joints. Props follow the palm, rather
// than rotating an entire straight arm and tool together from the shoulder.
function Arm({ front }: { front: boolean }) {
  const side = front ? 'front' : 'back';
  const skin = front ? SKIN : SKIN_D;
  return (
    <g class={`sc-arm ${side}`} transform={front ? 'translate(11 -65)' : 'translate(-12 -65)'}>
      <g class={`sc-upper ${side}`}>
        <path d="M0 0 L0 11" fill="none" stroke={INK} stroke-width={8.2} />
        <path d="M0 0 L0 11" fill="none" stroke={front ? COAT : COAT_D} stroke-width={6.2} />
        <g class="sc-elbow-anchor" transform="translate(0 11)">
          <g class={`sc-forearm ${side}`}>
            <path d="M0 0 V12" fill="none" stroke={INK} stroke-width={5.8} />
            <path d="M0 0 V12" fill="none" stroke={skin} stroke-width={3.8} />
            <rect x={-3.5} y={-1.6} width={7} height={4.5} rx={1.4} fill={COAT_D} stroke={INK} stroke-width={1.1} />
            <path d="M-2.4 .6 H2.4" stroke={COAT} stroke-width={1.2} />
            <g class="sc-wrist-anchor" transform="translate(0 12)">
              <g class={`sc-wrist ${side}`}>
                {front ? <Magnifier /> : <g transform="translate(6 -1) scale(.9)"><Clipboard /></g>}
                <path d="M-2.6 -1.6 Q0 -3.1 2.8 -1.4 L3.1 1.2 Q1.6 3.3 -.5 2.5 L-2.7 1.3 Z" fill={skin} stroke={INK} stroke-width={1.1} />
                <path d="M1.8 -1.2 Q4.5 -.4 3.1 1.4" fill="none" stroke={INK} stroke-width={.85} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

export function Scientist({ mood = 'work' }: { mood?: 'work' | 'wait' }) {
  return (
    <g class={`scientist sc-${mood}`} stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx={0} cy={0} rx={20} ry={3.6} fill="rgba(40,26,12,.18)" />
      {/* legs */}
      <path d="M-5 -36 L-6 -4 M6 -36 L7 -4" stroke={INK} stroke-width={9} />
      <path d="M-5 -36 L-6 -4 M6 -36 L7 -4" stroke={TROUS} stroke-width={7} />
      <path d="M-12 -1 Q-12 -6 -6 -6 L-1 -5 Q0 0 -4 0 Z M2 -1 Q2 -6 8 -6 L14 -4 Q15 0 10 0 Z" fill={SHOE} stroke={INK} stroke-width={1.3} />
      <g class="sc-body">
        {/* the lab coat over a striped sweater */}
        <path d="M-15 -66 Q-19 -46 -17 -22 L17 -22 Q19 -46 14 -66 Q0 -72 -15 -66 Z" fill={COAT} stroke={INK} stroke-width={2} />
        <path d="M-4 -68 L1 -24 L9 -24 L6 -68 Z" fill={KNIT} stroke={INK} stroke-width={1.2} />
        <path d="M-2.6 -60 h7.4 M-2 -53 h7.6 M-1.4 -46 h7.8 M-.8 -39 h8 M-.2 -32 h8" stroke={KNIT_L} stroke-width={2.2} />
        <path d="M-4 -68 L-1 -58 L4 -60 M6 -68 L5 -58" fill="none" stroke={INK} stroke-width={1.3} />
        <path d="M-15 -66 Q-11 -60 -4 -66 M14 -66 Q12 -60 6 -67" fill={COAT_D} stroke={INK} stroke-width={1.2} />
        {/* the breast pocket with a pencil and a seed packet */}
        <path d="M9 -54 h7 v6 h-7 Z" fill={COAT_D} stroke={INK} stroke-width={1} />
        <path d="M11 -54 V-61" stroke="#e9b44a" stroke-width={1.8} />
        <rect x={12.6} y={-59} width={3.4} height={5} rx={.6} fill="#b96262" stroke={INK} stroke-width={.6} />
        <path d="M-12 -34 h6" stroke={COAT_D} stroke-width={1.6} />
        {/* The bent left arm holds the notes in front of the coat. */}
        <Arm front={false} />
        <g class="sc-head">
          <rect x={-3} y={-74} width={7} height={8} fill={SKIN} stroke={INK} stroke-width={1.4} />
          {/* a pencil tucked behind the ear: only its ends show past the curls */}
          <path d="M-17 -80 L-4 -97" stroke={INK} stroke-width={3} />
          <path d="M-17 -80 L-4 -97" stroke="#e9b44a" stroke-width={1.7} />
          <path d="M-17 -80 l-1.6 2" stroke={INK} stroke-width={1.6} />
          {/* hair behind */}
          <g fill={HAIR_D} stroke={INK} stroke-width={1.3}>
            <circle cx={-9} cy={-86} r={6} /><circle cx={-10} cy={-79} r={5} />
          </g>
          <circle cx={1} cy={-83} r={12} fill={SKIN} stroke={INK} stroke-width={2} />
          <ellipse cx={-8} cy={-82} rx={2.4} ry={3.2} fill={SKIN} stroke={INK} stroke-width={1.3} />
          {/* curls on top */}
          <g fill={HAIR} stroke={INK} stroke-width={1.3}>
            <circle cx={-8} cy={-92} r={5.4} /><circle cx={-1} cy={-96} r={6} /><circle cx={7} cy={-94} r={5.4} /><circle cx={12} cy={-89} r={4.2} /><circle cx={-11} cy={-86} r={4} />
          </g>
          <path d="M-4 -96 q2 2 4 0 M4 -94 q2 2 4 0" fill="none" stroke={HAIR_D} stroke-width={1} />
          <g class="sc-eyes">
            <circle cx={4.6} cy={-83} r={1.4} fill={INK} stroke="none" />
            <circle cx={10.4} cy={-83} r={1.3} fill={INK} stroke="none" />
          </g>
          <g fill="none" stroke={INK} stroke-width={1.1}>
            <circle cx={4.6} cy={-83} r={3.3} /><circle cx={10.6} cy={-83} r={3.1} /><path d="M7.9 -83 h-.4 M1.3 -83.4 L-3 -84" />
          </g>
          <g fill="#c98a5a" stroke="none" opacity={.7}><circle cx={3} cy={-78} r={.6} /><circle cx={5} cy={-77.4} r={.6} /><circle cx={9.6} cy={-78} r={.6} /><circle cx={11.6} cy={-78.6} r={.5} /></g>
          <path class="sc-mouth" d="M6 -75.6 Q8.6 -73.6 11 -75.6" fill="none" stroke={INK} stroke-width={1.2} />
          <path d="M12.6 -80 Q14.6 -79 12.6 -77.4" fill="none" stroke={INK} stroke-width={1.1} />
        </g>
        <Arm front />
      </g>
    </g>
  );
}
