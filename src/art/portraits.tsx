import { useId } from 'preact/hooks';
// Portraits: painted art from src/assets/portraits/<id>.webp when it exists, vector placeholder otherwise.
type SpecialistId = 'beekeeper' | 'soilsci' | 'coop' | 'mechanic' | 'greenhouser' | 'irrigator' | 'foreman' | 'trader' | 'logist' | 'broker' | 'accountant' | 'riskman' | 'agronomist' | 'breeder' | 'marketer';
import { P } from './palette';
import { icons } from './icons';
import { CarlaFace } from './crows';

export type CustomerPersonId = 'olga' | 'anna' | 'timofey' | 'arseniy' | 'boris' | 'irina' | 'georgiy' | 'ivan' | 'zakhar' | 'svetlana' | 'egor' | 'fedor' | 'lidiya';
export type ChildPersonId = 'katya' | 'misha';
export type PersonId = 'vera' | 'marat' | 'palych' | 'zina' | 'buyer' | 'carla' | SpecialistId | CustomerPersonId | ChildPersonId;

type HairStyle = 'short' | 'long' | 'bun' | 'bald' | 'braid' | 'curly' | 'bob';
interface Look {
  skin: string;
  hair: string;
  style: HairStyle;
  shirt: string;
  bg: string;
  hat?: { kind: 'cap' | 'flatcap' | 'scarf' | 'straw' | 'chef'; color: string };
  acc?: ('glasses' | 'mustache' | 'beard' | 'stubble')[];
  emblem?: string;
}

const LOOKS: Record<Exclude<PersonId, 'carla' | ChildPersonId>, Look> = {
  olga: {skin:'#efc3a0',hair:'#8f593c',style:'bun',shirt:'#b96262',bg:'#f6dfab',acc:['glasses']},
  anna: {skin:'#edbf9b',hair:'#42342b',style:'bob',shirt:'#4d796b',bg:'#e0edce',emblem:'flag'},
  timofey: {skin:'#e8b28c',hair:'#ad7040',style:'curly',shirt:'#f0dfba',bg:'#efdca5',acc:['mustache'],hat:{kind:'chef',color:'#fff6e5'}},
  arseniy: {skin:'#dbaa86',hair:'#302928',style:'short',shirt:'#f4ede0',bg:'#ead8c5',acc:['stubble'],hat:{kind:'chef',color:'#f3e9d6'}},
  boris: {skin:'#e4b28c',hair:'#b4aaa0',style:'curly',shirt:'#526f8c',bg:'#dbe8ea',acc:['glasses','mustache']},
  irina: {skin:'#f0c8a9',hair:'#583627',style:'braid',shirt:'#508d8b',bg:'#d8ead9',hat:{kind:'scarf',color:'#e8d6a8'}},
  georgiy: {skin:'#c99570',hair:'#3c3029',style:'short',shirt:'#b3a06c',bg:'#e8e3c1',acc:['beard'],hat:{kind:'cap',color:'#626d50'}},
  ivan: {skin:'#e0a982',hair:'#76614f',style:'short',shirt:'#4c6686',bg:'#d4e4e9',acc:['mustache'],hat:{kind:'flatcap',color:'#465b72'}},
  zakhar: {skin:'#d9a07a',hair:'#5c3f29',style:'curly',shirt:'#c4a34f',bg:'#f0e0a4',acc:['beard'],hat:{kind:'straw',color:'#d5b866'}},
  svetlana: {skin:'#edbf9a',hair:'#9b572f',style:'braid',shirt:'#5c8b73',bg:'#deebc9',hat:{kind:'scarf',color:'#d69b52'}},
  egor: {skin:'#d4a17b',hair:'#493c2c',style:'short',shirt:'#68764c',bg:'#d4e0bc',acc:['stubble'],hat:{kind:'cap',color:'#69734d'}},
  fedor: {skin:'#e5b28c',hair:'#ded3b7',style:'bald',shirt:'#998347',bg:'#eae6bc',acc:['beard'],hat:{kind:'straw',color:'#e4ce85'}},
  lidiya: {skin:'#e9bc9d',hair:'#8c8580',style:'bun',shirt:'#e2ebe4',bg:'#d5e8e4',acc:['glasses']},
  vera: { skin: '#f3c9a5', hair: '#9a4f27', style: 'braid', shirt: '#4f8ad1', bg: '#cbe9b5', hat: { kind: 'cap', color: '#5dad3c' } },
  marat: { skin: '#d9a77c', hair: '#2b2320', style: 'short', shirt: '#5a6b8c', bg: '#f5ddb0', acc: ['glasses'] },
  palych: { skin: '#e8b48f', hair: '#e9e6df', style: 'bald', shirt: '#6b7a3a', bg: '#bfe1f2', hat: { kind: 'flatcap', color: '#6d6a63' }, acc: ['mustache'] },
  zina: { skin: '#f0c4a0', hair: '#cfcac2', style: 'bun', shirt: '#c0567a', bg: '#fde3c4', hat: { kind: 'scarf', color: '#3f7fbf' } },
  buyer: { skin: '#e4b08a', hair: '#4a3324', style: 'short', shirt: '#f4ead2', bg: '#f3e1b8', hat: { kind: 'cap', color: '#a8432f' }, acc: ['mustache'], emblem: 'coin' },
  agronomist: { skin: '#f0c19c', hair: '#5a3a24', style: 'bun', shirt: '#7cae4a', bg: '#d8efc4', emblem: 'soil' },
  foreman: { skin: '#d7a07a', hair: '#3b2a20', style: 'short', shirt: '#d9822b', bg: '#f6dcb8', hat: { kind: 'cap', color: '#e0473a' }, acc: ['stubble'], emblem: 'helpers' },
  beekeeper: { skin: '#eab792', hair: '#8b6a3e', style: 'short', shirt: '#f2e3b3', bg: '#fbefb4', hat: { kind: 'straw', color: '#e9c45c' }, acc: ['beard'], emblem: 'bee' },
  irrigator: { skin: '#c99068', hair: '#1f1a17', style: 'short', shirt: '#3f8fbf', bg: '#cfeaf7', emblem: 'water' },
  marketer: { skin: '#f3cbaa', hair: '#d4a24c', style: 'bob', shirt: '#e0607a', bg: '#fbe0e6', emblem: 'chart' },
  accountant: { skin: '#eebd98', hair: '#7d7a76', style: 'bun', shirt: '#7a5a8c', bg: '#e8dcf2', acc: ['glasses'], emblem: 'coin' },
  soilsci: { skin: '#e2ae88', hair: '#4a3324', style: 'curly', shirt: '#8c6a43', bg: '#efdcc2', acc: ['beard'], emblem: 'soil' },
  coop: { skin: '#f1c6a2', hair: '#b5532f', style: 'long', shirt: '#5c9c6c', bg: '#d6eedd', hat: { kind: 'scarf', color: '#e0473a' }, emblem: 'helpers' },
  mechanic: { skin: '#cf9670', hair: '#2a211c', style: 'short', shirt: '#56616b', bg: '#dde3e8', hat: { kind: 'cap', color: '#3f5a73' }, acc: ['stubble'], emblem: 'tractor' },
  greenhouser: { skin: '#f4cfb0', hair: '#2f2420', style: 'braid', shirt: '#3fa37a', bg: '#d2f0e4', emblem: 'greenhouse' },
  trader: { skin: '#e0ad87', hair: '#3a2b22', style: 'short', shirt: '#2f3e57', bg: '#d9e2f2', acc: ['glasses'], emblem: 'chart' },
  logist: { skin: '#d8a27b', hair: '#6a4a2e', style: 'short', shirt: '#c9a04a', bg: '#f3e5c4', hat: { kind: 'cap', color: '#3a6b4a' }, emblem: 'sack' },
  broker: { skin: '#f2c4a0', hair: '#1f1b1a', style: 'long', shirt: '#2d2f3a', bg: '#e6e0f2', emblem: 'contract' },
  riskman: { skin: '#e6b48f', hair: '#9a9590', style: 'short', shirt: '#3d5a80', bg: '#d8e8f5', acc: ['glasses', 'beard'], emblem: 'shield' },
  breeder: { skin: '#f0c7a6', hair: '#c7853f', style: 'bun', shirt: '#f2f2ea', bg: '#e9f4d6', acc: ['glasses'], emblem: 'seeds' },
};

// Filled in when the generated portraits arrive (data: URIs).
const files = import.meta.glob<string>('../assets/portraits/*.{webp,png}', { eager: true, import: 'default' });
export const PORTRAIT_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1).replace(/\.(webp|png)$/, ''), url]),
);

const ink = P.ink;

// how each painted portrait sits inside the round frame: [x, y, size] in a 100-unit box
const FRAMES: Record<string, [number, number, number]> = {
  beekeeper: [5, 10, 90],
  riskman: [1, 6, 98],
  vera: [0, 5, 100],
  vera_worried: [0, 5, 100],
  accountant: [0, 5, 100],
  breeder: [0, 5, 100],
};

function Hair({ look, back }: { look: Look; back: boolean }) {
  const c = look.hair;
  if (back) {
    if (look.style === 'long') return <path d="M28 44 Q26 82 34 92 L66 92 Q74 82 72 44z" fill={c} stroke={ink} stroke-width={2} />;
    if (look.style === 'braid') return <path d="M64 56 Q76 70 70 92" stroke={ink} stroke-width={11} fill="none" stroke-linecap="round" />;
    return null;
  }
  switch (look.style) {
    case 'short':
      return <path d="M31 46 Q30 24 50 23 Q70 24 69 46 Q64 34 50 34 Q38 34 31 46z" fill={c} stroke={ink} stroke-width={2} />;
    case 'curly':
      return <path d="M30 48 Q24 30 36 26 Q40 18 50 21 Q60 17 65 26 Q76 30 70 48 Q66 34 50 35 Q36 34 30 48z" fill={c} stroke={ink} stroke-width={2} />;
    case 'bob':
      return <path d="M29 58 Q26 24 50 23 Q74 24 71 58 L66 58 Q66 36 50 34 Q34 36 34 58z" fill={c} stroke={ink} stroke-width={2} />;
    case 'long':
      return <path d="M30 50 Q28 23 50 22 Q72 23 70 50 Q64 33 50 33 Q36 33 30 50z" fill={c} stroke={ink} stroke-width={2} />;
    case 'bun':
      return (
        <g>
          <circle cx={50} cy={20} r={8} fill={c} stroke={ink} stroke-width={2} />
          <path d="M31 46 Q30 25 50 25 Q70 25 69 46 Q64 35 50 35 Q36 35 31 46z" fill={c} stroke={ink} stroke-width={2} />
        </g>
      );
    case 'braid':
      return (
        <g>
          <path d="M31 46 Q30 24 50 24 Q70 24 69 46 Q62 34 50 34 Q38 34 31 46z" fill={c} stroke={ink} stroke-width={2} />
          <path d="M64 56 Q76 70 70 92" stroke={c} stroke-width={7} fill="none" stroke-linecap="round" />
          {[64, 72, 80].map((y) => <path d={`M67 ${y} l6 3`} stroke={ink} stroke-width={1.2} />)}
        </g>
      );
    default:
      return <path d="M31 50 Q31 44 34 42 M69 50 Q69 44 66 42" stroke={c} stroke-width={5} stroke-linecap="round" />;
  }
}

function Hat({ look }: { look: Look }) {
  const h = look.hat;
  if (!h) return null;
  if (h.kind === 'chef') return <g fill={h.color} stroke={ink} stroke-width={2}>
    <path d="M31 34 C18 33 19 16 33 17 C35 5 53 5 58 16 C74 9 84 27 69 34 L67 43 H33Z"/>
    <path d="M33 34 H68 M42 24 L41 33 M57 23 L59 33" fill="none" stroke-width={1.4}/>
  </g>;
  if (h.kind === 'cap')
    return (
      <g>
        <path d="M30 40 Q30 20 50 20 Q70 20 70 40z" fill={h.color} stroke={ink} stroke-width={2} />
        <path d="M30 40 Q50 36 80 42 Q70 46 30 42z" fill={h.color} stroke={ink} stroke-width={2} />
      </g>
    );
  if (h.kind === 'flatcap')
    return <path d="M28 40 Q28 22 52 22 Q74 24 76 38 Q60 36 28 42z" fill={h.color} stroke={ink} stroke-width={2} />;
  if (h.kind === 'straw')
    return (
      <g>
        <ellipse cx={50} cy={38} rx={30} ry={6} fill={h.color} stroke={ink} stroke-width={2} />
        <path d="M34 38 Q34 20 50 20 Q66 20 66 38z" fill={h.color} stroke={ink} stroke-width={2} />
        <path d="M34 33 H66" stroke="#b4572c" stroke-width={3} />
      </g>
    );
  return <path d="M28 50 Q26 22 50 22 Q74 22 72 50 Q66 30 50 30 Q34 30 28 50z" fill={h.color} stroke={ink} stroke-width={2} />;
}

function CarlaPortrait({ size, ring }: { size: number; ring: boolean }) {
  const clip = `pc-carla-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class="portrait">
      <defs>
        <clipPath id={clip}>
          <circle cx={50} cy={50} r={46} />
        </clipPath>
      </defs>
      <circle cx={50} cy={50} r={47} fill="#dce6ec" />
      <g clip-path={`url(#${clip})`}>
        <CarlaFace />
      </g>
      {ring && <circle cx={50} cy={50} r={47} fill="none" stroke={ink} stroke-width={3} />}
    </svg>
  );
}

function ChildPortrait({id,size,ring}:{id:ChildPersonId;size:number;ring:boolean}){
 const clip=`child-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`,girl=id==='katya',hair=girl?'#80502e':'#b57a3f',shirt=girl?'#ba6651':'#568b9a';
 return <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class="portrait child-portrait">
  <defs><clipPath id={clip}><circle cx={50} cy={50} r={46}/></clipPath></defs>
  <circle cx={50} cy={50} r={47} fill={girl?'#f1e2b9':'#dcebc6'}/>
  <g clip-path={`url(#${clip})`} stroke={ink} stroke-width={2} stroke-linejoin="round">
   {girl&&<><path d="M31 43 Q12 55 23 73 L31 64Z M69 43 Q88 55 77 73 L69 64Z" fill={hair}/><path d="M20 53 L31 51 M69 51 L80 53" stroke="#b96054" stroke-width={4}/></>}
   <path d="M24 100 Q27 73 50 73 Q73 73 76 100" fill={shirt}/>
   <path d="M42 73 L50 82 L58 73" fill="#f6edd4"/>
   <ellipse cx={28} cy={51} rx={4} ry={6} fill="#efc19b"/><ellipse cx={72} cy={51} rx={4} ry={6} fill="#efc19b"/>
   <path d="M29 42 Q28 19 50 19 Q72 19 71 43 L70 58 Q66 74 50 75 Q34 74 30 58Z" fill="#f2c7a3"/>
   <path d={girl?'M29 44 Q25 17 49 17 Q74 17 72 45 Q64 37 56 28 Q44 40 29 44Z':'M29 44 Q23 20 42 21 L49 15 L54 20 Q73 15 73 43 L63 36 L54 37 L48 30 L39 38Z'} fill={hair}/>
   <g fill={ink} stroke="none"><ellipse cx={41} cy={49} rx={2.5} ry={3.4}/><ellipse cx={59} cy={49} rx={2.5} ry={3.4}/></g>
   <path d="M43 62 Q50 67 57 62" fill="none" stroke-linecap="round"/>
   <g fill="#c2784d" stroke="none" opacity={.7}><circle cx={35} cy={57} r={1}/><circle cx={39} cy={58} r={1}/><circle cx={61} cy={58} r={1}/><circle cx={65} cy={57} r={1}/></g>
   {!girl&&<path d="M31 85 H69 M29 94 H71" stroke="#e8dca9" stroke-width={3}/>} 
  </g>
  {ring&&<circle cx={50} cy={50} r={47} fill="none" stroke={ink} stroke-width={3}/>}
 </svg>;
}

export function Portrait({ id, size = 64, ring = true, worried }: { id: PersonId; size?: number; ring?: boolean; worried?: boolean }) {
  if (id === 'carla') return <CarlaPortrait size={size} ring={ring} />;
  if ((id === 'katya' || id === 'misha') && !PORTRAIT_IMAGES[id]) return <ChildPortrait id={id} size={size} ring={ring}/>;
  const key = worried && PORTRAIT_IMAGES[`${id}_worried`] ? `${id}_worried` : id;
  const img = PORTRAIT_IMAGES[key];
  const look = id==='katya'||id==='misha'?LOOKS.olga:LOOKS[id];
  // every portrait needs its own clip id: a copy hidden with display:none (the side panel on phones)
  // would otherwise own the shared id, and Chrome then draws the picture unclipped
  const clip = `pc-${id}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const frame = FRAMES[key] ?? FRAMES[id] ?? [-2, 3, 104];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" class="portrait">
      <defs>
        <clipPath id={clip}>
          <circle cx={50} cy={50} r={46} />
        </clipPath>
      </defs>
      <circle cx={50} cy={50} r={47} fill={look.bg} />
      {img ? (
        <image href={img} x={frame[0]} y={frame[1]} width={frame[2]} height={frame[2]} clip-path={`url(#${clip})`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g clip-path={`url(#${clip})`}>
          <Hair look={look} back />
          <path d="M16 100 Q18 72 50 70 Q82 72 84 100z" fill={look.shirt} stroke={ink} stroke-width={2} />
          <path d="M43 70 Q50 80 57 70" fill={look.skin} stroke={ink} stroke-width={1.6} />
          <rect x={44} y={58} width={12} height={14} fill={look.skin} />
          <ellipse cx={30} cy={50} rx={4} ry={6} fill={look.skin} stroke={ink} stroke-width={1.8} />
          <ellipse cx={70} cy={50} rx={4} ry={6} fill={look.skin} stroke={ink} stroke-width={1.8} />
          <ellipse cx={50} cy={48} rx={20} ry={22} fill={look.skin} stroke={ink} stroke-width={2} />
          <ellipse cx={39} cy={56} rx={4} ry={2.5} fill="#f29b8c" opacity={0.55} />
          <ellipse cx={61} cy={56} rx={4} ry={2.5} fill="#f29b8c" opacity={0.55} />
          <ellipse cx={42} cy={48} rx={2.6} ry={3.2} fill={ink} />
          <ellipse cx={58} cy={48} rx={2.6} ry={3.2} fill={ink} />
          <circle cx={43} cy={47} r={0.9} fill="#fff" />
          <circle cx={59} cy={47} r={0.9} fill="#fff" />
          <path d="M37 41 q5 -3 9 0 M54 41 q5 -3 9 0" stroke={look.style === 'bald' ? look.hair : ink} stroke-width={2} fill="none" stroke-linecap="round" />
          <path d="M50 51 q-2 4 1 5" stroke={ink} stroke-width={1.4} fill="none" stroke-linecap="round" />
          {look.acc?.includes('mustache') ? (
            <path d="M40 60 Q45 55 50 59 Q55 55 60 60 Q55 64 50 61 Q45 64 40 60z" fill={look.hair} stroke={ink} stroke-width={1.4} />
          ) : (
            <path d="M43 61 Q50 66 57 61" stroke={ink} stroke-width={1.8} fill="none" stroke-linecap="round" />
          )}
          {look.acc?.includes('beard') && <path d="M31 52 Q32 74 50 76 Q68 74 69 52 Q64 66 50 66 Q36 66 31 52z" fill={look.hair} stroke={ink} stroke-width={1.6} />}
          {look.acc?.includes('stubble') && <path d="M36 60 Q50 72 64 60" stroke={look.hair} stroke-width={5} opacity={0.25} fill="none" />}
          {look.acc?.includes('glasses') && (
            <g fill="none" stroke={ink} stroke-width={1.8}>
              <circle cx={42} cy={48} r={6} />
              <circle cx={58} cy={48} r={6} />
              <path d="M48 48 h4 M36 47 l-5 -2 M64 47 l5 -2" />
            </g>
          )}
          <Hair look={look} back={false} />
          <Hat look={look} />
        </g>
      )}
      {ring && <circle cx={50} cy={50} r={47} fill="none" stroke={ink} stroke-width={3} />}
      {look.emblem && !img && (
        <g transform="translate(66 66) scale(0.62)">
          <circle cx={24} cy={24} r={20} fill={P.parchment} stroke={ink} stroke-width={3} />
          <g transform="translate(6 6) scale(0.75)">{(icons[look.emblem] ?? icons.star)()}</g>
        </g>
      )}
    </svg>
  );
}

export const PERSON_NAMES: Record<'vera' | 'marat' | 'palych' | 'zina' | 'buyer' | 'carla', string> = {
  carla: 'Карла, ворона',
  vera: 'Вера, агроном',
  marat: 'Марат, из банка',
  palych: 'Палыч, старожил',
  zina: 'Зина, соседка',
  buyer: 'Покупатель',
};
