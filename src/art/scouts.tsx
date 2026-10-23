// The week before a raid: the two orphanage kids loiter by the field. A bush in the yard; from behind it
// two heads rise, look over the ripe beds, whisper to each other, one points — and they duck back.
// The same two children as the raid (green cap, red kerchief), so the player can connect the dots.
// Drawn with the ground at y = 0 and the bush centred on x = 0.
const INK = '#3f2a1d';
const SKIN = '#f1c8a0';

export function ScoutingKids() {
  return (
    <g class="scouting-kids" stroke={INK} stroke-width={1.8} stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx={0} cy={0} rx={30} ry={4} fill="rgba(40,26,12,.16)" stroke="none" />
      {/* the boy in the green cap, pointing at the beds */}
      <g class="sk-kid sk-a">
        <path class="sk-arm" d="M-10 -26 Q-2 -30 7 -27" fill="none" stroke={INK} stroke-width={4.6} />
        <path class="sk-arm" d="M-10 -26 Q-2 -30 7 -27" fill="none" stroke="#7c8b52" stroke-width={2.6} />
        <circle cx={8.6} cy={-27.4} r={2.4} fill={SKIN} stroke-width={1.2} />
        <circle cx={-12} cy={-34} r={9} fill={SKIN} />
        <path d="M-21 -36 Q-21 -45 -12 -45 Q-3 -45 -3 -36 Z" fill="#7c8b52" />
        <path d="M-7 -37 Q0 -37 3 -35 Q-2 -34 -7 -35 Z" fill="#66733f" />
        <g class="sk-eyes"><circle cx={-8.6} cy={-33} r={1.3} fill={INK} stroke="none" /><circle cx={-14} cy={-33} r={1.3} fill={INK} stroke="none" /></g>
        <path d="M-11 -28.6 q2 1 4 0" fill="none" stroke-width={1.2} />
      </g>
      {/* the girl in the red kerchief, whispering */}
      <g class="sk-kid sk-b">
        <circle cx={13} cy={-31} r={8.5} fill={SKIN} />
        <path d="M4.5 -32 Q5 -42 13 -42 Q22 -42 21.5 -32 Q17 -37 13 -37 Q8 -37 4.5 -32 Z" fill="#d6473a" />
        <path d="M20 -33 l5 4 l-5 1" fill="#d6473a" />
        <g class="sk-eyes"><circle cx={9.6} cy={-30} r={1.3} fill={INK} stroke="none" /><circle cx={15} cy={-30} r={1.3} fill={INK} stroke="none" /></g>
        <path d="M8 -26 q2 -1 3 0" fill="none" stroke-width={1.2} />
        <path d="M5 -27 q-3 -1 -4 -4" fill="none" stroke={SKIN} stroke-width={3} />
      </g>
      {/* the bush they hide behind: drawn last, so it covers them when they duck */}
      <g class="sk-bush">
        <path d="M-30 0 Q-36 -14 -24 -20 Q-24 -34 -8 -30 Q0 -40 12 -31 Q28 -34 28 -19 Q38 -12 30 0 Z" fill="#6fae45" />
        <path d="M-20 -14 q6 -4 12 0 M4 -20 q6 -4 12 0 M-6 -6 q5 -3 10 0" fill="none" stroke="#4f8a33" stroke-width={1.4} />
        <circle cx={-14} cy={-22} r={2} fill="#d6473a" stroke-width={.9} /><circle cx={18} cy={-12} r={2} fill="#d6473a" stroke-width={.9} />
      </g>
    </g>
  );
}
