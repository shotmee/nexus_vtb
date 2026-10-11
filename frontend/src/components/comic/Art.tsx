import { useId } from 'react'

// Векторные элементы комикса: персонаж, телефон, растр, лучи. Все рисунки — в координатах страницы 600×800.
// Цвета рисунка фиксированные, фон страницы и растр берут переменные темы (--comic-*), чтобы книга работала в обеих темах.

export const INK = '#16171d'
const SKIN = '#f3c6a1'
const HAIR = '#3a2a22'
const HOODIE = '#5b3df5'
const JEANS = '#2f3b63'

export type Mood = 'happy' | 'calm' | 'worried' | 'shock' | 'relieved'

// Растр точками и полупрозрачная подложка кадра
export function Halftone({ id, color = 'var(--comic-dot)' }: { id: string; color?: string }) {
  return (
    <defs>
      <pattern id={id} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
        <circle cx="3" cy="3" r="2.1" fill={color} />
      </pattern>
    </defs>
  )
}

// Кадр комикса: заливка, растр, толстая рамка
export function Frame({ x, y, w, h, fill = 'var(--comic-panel)', dots, children, r = 14 }: {
  x: number
  y: number
  w: number
  h: number
  fill?: string
  dots?: string
  r?: number
  children?: React.ReactNode
}) {
  const clip = useId().replace(/:/g, '') // уникально на всю страницу: одинаковые кадры есть на разных страницах
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect x={x} y={y} width={w} height={h} fill={fill} />
        {dots && <rect x={x} y={y} width={w} height={h} fill={`url(#${dots})`} />}
        {children}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={INK} strokeWidth="5" />
    </g>
  )
}

// Лучи «взрыва» за персонажем
export function Burst({ cx, cy, r, color, n = 18 }: { cx: number; cy: number; r: number; color: string; n?: number }) {
  const rays = []
  for (let i = 0; i < n; i++) {
    const a1 = (i / n) * Math.PI * 2
    const a2 = ((i + 0.5) / n) * Math.PI * 2
    rays.push(
      <path
        key={i}
        d={`M${cx} ${cy}L${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r}L${cx + Math.cos(a2) * r} ${cy + Math.sin(a2) * r}Z`}
        fill={color}
      />,
    )
  }
  return <g>{rays}</g>
}

function Face({ mood }: { mood: Mood }) {
  const eyes =
    mood === 'shock' ? (
      <>
        <circle cx="-17" cy="-4" r="7" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="17" cy="-4" r="7" fill="#fff" stroke={INK} strokeWidth="3" />
        <circle cx="-17" cy="-4" r="2.6" fill={INK} />
        <circle cx="17" cy="-4" r="2.6" fill={INK} />
      </>
    ) : mood === 'happy' || mood === 'relieved' ? (
      <>
        <path d="M-24 -3q7-8 14 0M10 -3q7-8 14 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="-17" cy="-3" r="4.2" fill={INK} />
        <circle cx="17" cy="-3" r="4.2" fill={INK} />
      </>
    )
  const brows =
    mood === 'worried' ? (
      <path d="M-27 -13l16 -7M27 -13l-16 -7" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : mood === 'shock' ? (
      <path d="M-27 -22q8 -7 16 -2M27 -22q-8 -7 -16 -2" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M-26 -17q9-5 17 0M9 -17q9-5 17 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    )
  const mouth =
    mood === 'happy' ? (
      <path d="M-14 16q14 16 28 0z" fill="#fff" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    ) : mood === 'relieved' ? (
      <path d="M-11 17q11 9 22 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : mood === 'shock' ? (
      <ellipse cx="0" cy="20" rx="8" ry="10" fill={INK} />
    ) : mood === 'worried' ? (
      <path d="M-11 21q11-8 22 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M-9 18h18" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    )
  return (
    <g>
      {brows}
      {eyes}
      <path d="M0 2q4 6 -2 8" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {mouth}
      <ellipse cx="-30" cy="10" rx="7" ry="4" fill="#ff8f8f" opacity={mood === 'happy' ? 0.6 : 0.25} />
      <ellipse cx="30" cy="10" rx="7" ry="4" fill="#ff8f8f" opacity={mood === 'happy' ? 0.6 : 0.25} />
      {mood === 'shock' || mood === 'worried' ? (
        <path d="M44 -22q8 12 0 16q-8-4 0-16z" fill="#7fd3ff" stroke={INK} strokeWidth="2.5" />
      ) : null}
    </g>
  )
}

// Подросток в худи с телефоном. (x, y) — точка между ступнями; s — масштаб (1 ≈ 330 px ростом)
export function Teen({ x, y, s = 1, mood = 'calm', phone = true, wave = false, flip = false }: {
  x: number
  y: number
  s?: number
  mood?: Mood
  phone?: boolean
  wave?: boolean
  flip?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} strokeLinejoin="round" strokeLinecap="round">
      {/* тень */}
      <ellipse cx="0" cy="2" rx="62" ry="10" fill={INK} opacity="0.18" />
      {/* ноги */}
      <path d="M-34 -110h28l-4 104h-26z" fill={JEANS} stroke={INK} strokeWidth="4" />
      <path d="M6 -110h28l2 104h-26z" fill={JEANS} stroke={INK} strokeWidth="4" />
      <path d="M-44 -8h40v10h-46z" fill="#f4f4f6" stroke={INK} strokeWidth="4" />
      <path d="M10 -8h40l4 10h-44z" fill="#f4f4f6" stroke={INK} strokeWidth="4" />
      {/* худи */}
      <path d="M-58 -112q-6-80 18-104q22-14 40-14q18 0 40 14q24 24 18 104z" fill={HOODIE} stroke={INK} strokeWidth="4" />
      <path d="M-24 -150h48v26q-24 10-48 0z" fill="#4a2fd6" stroke={INK} strokeWidth="3" />
      <path d="M-10 -212v26M10 -212v26" stroke="#fff" strokeWidth="3" />
      {/* руки: контур = толстая тёмная линия под цветной */}
      {wave ? <Arm d="M-50 -198q-46 -14 -46 -78" /> : <Arm d="M-50 -196q-14 50 26 62" />}
      <Arm d="M50 -196q14 50 -26 62" />
      {wave && <circle cx="-96" cy="-280" r="13" fill={SKIN} stroke={INK} strokeWidth="4" />}
      {phone && (
        <g>
          <rect x="-26" y="-162" width="40" height="64" rx="8" fill={INK} transform="rotate(-8 -6 -130)" />
          <rect x="-21" y="-156" width="30" height="50" rx="5" fill="#9fe7ff" transform="rotate(-8 -6 -130)" />
        </g>
      )}
      <circle cx="-22" cy="-132" r="12" fill={SKIN} stroke={INK} strokeWidth="4" />
      <circle cx="22" cy="-132" r="12" fill={SKIN} stroke={INK} strokeWidth="4" />
      {/* голова */}
      <g transform="translate(0 -278)">
        <rect x="-14" y="38" width="28" height="22" fill={SKIN} stroke={INK} strokeWidth="4" />
        <circle cx="0" cy="0" r="54" fill={SKIN} stroke={INK} strokeWidth="4" />
        <path
          d="M-56 -6q-6-46 30-58q-4 14 8 12q2-18 22-16q-2 12 10 10q8-14 26 0q22 16 18 52q-14-26-40-28q-30 4-46-2q-18 8-28 30z"
          fill={HAIR}
          stroke={INK}
          strokeWidth="4"
        />
        <Face mood={mood} />
      </g>
    </g>
  )
}

function Arm({ d }: { d: string }) {
  return (
    <g fill="none">
      <path d={d} stroke={INK} strokeWidth="32" />
      <path d={d} stroke={HOODIE} strokeWidth="24" />
    </g>
  )
}

// Телефон крупным планом. Содержимое экрана — HTML поверх (см. ComicPage), здесь только корпус
export function PhoneBody({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect x={x + 8} y={y + 10} width={w} height={h} rx="34" fill={INK} opacity="0.25" />
      <rect x={x} y={y} width={w} height={h} rx="34" fill={INK} />
      <rect x={x + 12} y={y + 14} width={w - 24} height={h - 28} rx="24" fill="#f6f5fb" />
      <rect x={x + w / 2 - 30} y={y + 22} width="60" height="10" rx="5" fill={INK} />
    </g>
  )
}

// Звёздочка-«БАХ» под звукоподражание
export function Spiky({ cx, cy, r, fill, n = 12 }: { cx: number; cy: number; r: number; fill: string; n?: number }) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2
    const rr = i % 2 ? r * 0.72 : r
    pts.push(`${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`)
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
}
