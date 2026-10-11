// Иллюстрации для сторис: объёмные объекты на тёмном фоне со свечением.
// Всё в SVG, без внешних картинок. uid нужен, чтобы id градиентов не пересекались между экземплярами.

export const STORY_THEME: Record<string, { from: string; to: string; glow: string }> = {
  dont_share_card: { from: '#120b2e', to: '#2b1a6b', glow: '#7c5cff' },
  spot_fraud: { from: '#2a0d16', to: '#5a1a2a', glow: '#ff6b5a' },
  safe_exit: { from: '#071d2e', to: '#0f3d5c', glow: '#3cc3f0' },
  ndfl: { from: '#0a2018', to: '#14432f', glow: '#22d38f' },
  subscriptions: { from: '#1c0b26', to: '#4a1645', glow: '#ff5fa2' },
  budget_503020: { from: '#1a1a08', to: '#3a3a10', glow: '#c8f135' },
  quest: { from: '#0b1a2e', to: '#1d2f6b', glow: '#3cc3f0' },
  pushkin_scam: { from: '#1f0d2b', to: '#4b1c4f', glow: '#ff9f43' },
}

const FALLBACK = STORY_THEME.dont_share_card

export function storyBackground(id: string) {
  const t = STORY_THEME[id] ?? FALLBACK
  return `radial-gradient(120% 80% at 70% 20%, ${t.glow}55 0%, transparent 55%), linear-gradient(160deg, ${t.from} 0%, ${t.to} 100%)`
}

function Defs({ uid, glow }: { uid: string; glow: string }) {
  return (
    <defs>
      <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.45" />
      </filter>
      <radialGradient id={`${uid}-glow`}>
        <stop offset="0" stopColor={glow} stopOpacity="0.7" />
        <stop offset="1" stopColor={glow} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
        <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

export default function StoryArt({ id, uid, className = '' }: { id: string; uid: string; className?: string }) {
  const t = STORY_THEME[id] ?? FALLBACK
  const u = `${uid}-${id}`
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <Defs uid={u} glow={t.glow} />
      <circle cx="100" cy="100" r="90" fill={`url(#${u}-glow)`} />
      {ART[id]?.(u) ?? ART.dont_share_card(u)}
    </svg>
  )
}

const ART: Record<string, (u: string) => React.ReactNode> = {
  // Карта на крючке
  dont_share_card: (u) => (
    <g>
      <linearGradient id={`${u}-card`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c8f135" />
        <stop offset="1" stopColor="#7c5cff" />
      </linearGradient>
      <path d="M118 18v38" stroke="#d9d9e8" strokeWidth="3" />
      <path d="M118 56c0 14-16 16-18 6" stroke="#e8e8f2" strokeWidth="5" fill="none" strokeLinecap="round" />
      <g transform="rotate(-14 100 120)" filter={`url(#${u}-shadow)`}>
        <rect x="42" y="76" width="122" height="80" rx="14" fill={`url(#${u}-card)`} />
        <rect x="42" y="76" width="122" height="80" rx="14" fill={`url(#${u}-shine)`} />
        <rect x="56" y="96" width="24" height="18" rx="4" fill="#fff" opacity="0.85" />
        <rect x="56" y="128" width="62" height="7" rx="3.5" fill="#16171d" opacity="0.55" />
        <rect x="124" y="128" width="26" height="7" rx="3.5" fill="#16171d" opacity="0.55" />
      </g>
      <circle cx="152" cy="74" r="17" fill="#ff6b5a" filter={`url(#${u}-shadow)`} />
      <path d="M152 65v11M152 81v1" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  ),
  // Сообщение с маской
  spot_fraud: (u) => (
    <g>
      <linearGradient id={`${u}-bubble`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#ffd9d4" />
      </linearGradient>
      <g filter={`url(#${u}-shadow)`}>
        <path d="M40 46h120a16 16 0 0 1 16 16v58a16 16 0 0 1-16 16H86l-28 22v-22H40a16 16 0 0 1-16-16V62a16 16 0 0 1 16-16z" fill={`url(#${u}-bubble)`} />
      </g>
      <path d="M62 82c10-10 28-10 38 0 10-10 28-10 38 0-2 18-14 24-24 20-6-2-8-6-14-6s-8 4-14 6c-10 4-22-2-24-20z" fill="#16171d" />
      <ellipse cx="81" cy="88" rx="7" ry="4.5" fill="#ff6b5a" />
      <ellipse cx="119" cy="88" rx="7" ry="4.5" fill="#ff6b5a" />
      <circle cx="160" cy="44" r="18" fill="#ff6b5a" filter={`url(#${u}-shadow)`} />
      <path d="M160 34v12M160 52v1" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
    </g>
  ),
  // Спасательный круг
  safe_exit: (u) => (
    <g filter={`url(#${u}-shadow)`}>
      <circle cx="100" cy="104" r="62" fill="#ff6b5a" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d="M100 42a62 62 0 0 1 30 8l-12 21a38 38 0 0 0-18-4z" fill="#fff" transform={`rotate(${a + 20} 100 104)`} />
      ))}
      <circle cx="100" cy="104" r="34" fill="#0f3d5c" />
      <circle cx="100" cy="104" r="62" fill={`url(#${u}-shine)`} />
      <path d="M38 104c0-20 10-38 26-50" stroke="#fff" strokeOpacity="0.5" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  ),
  // Билет по «Пушкинской карте» со штампом «не продаётся» и пачка наличных-приманка
  pushkin_scam: (u) => (
    <g>
      <linearGradient id={`${u}-ticket`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff9f43" />
        <stop offset="1" stopColor="#ff5fa2" />
      </linearGradient>
      <g transform="rotate(-10 100 110)" filter={`url(#${u}-shadow)`}>
        {/* билет с вырезами по бокам и линией отрыва */}
        <path d="M44 74h112v22a11 11 0 0 0 0 22v22H44v-22a11 11 0 0 0 0-22z" fill={`url(#${u}-ticket)`} />
        <path d="M44 74h112v22a11 11 0 0 0 0 22v22H44v-22a11 11 0 0 0 0-22z" fill={`url(#${u}-shine)`} />
        <path d="M124 80v54" stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" strokeDasharray="5 5" />
        <rect x="58" y="88" width="50" height="8" rx="4" fill="#fff" fillOpacity="0.85" />
        <rect x="58" y="102" width="36" height="6" rx="3" fill="#fff" fillOpacity="0.6" />
        <rect x="58" y="114" width="42" height="6" rx="3" fill="#fff" fillOpacity="0.6" />
        <circle cx="140" cy="107" r="8" fill="#fff" fillOpacity="0.85" />
      </g>
      {/* штамп */}
      <g transform="rotate(12 100 138)">
        <rect x="46" y="124" width="108" height="28" rx="7" fill="#1f0d2b" fillOpacity="0.35" stroke="#ff4d5e" strokeWidth="3.5" />
        <text x="100" y="143" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#ff6b78" fontFamily="Manrope, sans-serif" letterSpacing="0.5">НЕ ПРОДАЁТСЯ</text>
      </g>
      {/* наличные-приманка */}
      <g transform="rotate(-16 62 50)" filter={`url(#${u}-shadow)`}>
        <rect x="36" y="36" width="54" height="30" rx="6" fill="#22b07d" />
        <rect x="41" y="41" width="44" height="20" rx="4" fill="none" stroke="#bff3d8" strokeWidth="2" />
        <circle cx="63" cy="51" r="6" fill="#bff3d8" />
      </g>
    </g>
  ),
  // Монеты и 13%
  ndfl: (u) => (
    <g>
      <linearGradient id={`${u}-coin`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#f5c542" />
        <stop offset="0.5" stopColor="#ffe48a" />
        <stop offset="1" stopColor="#d99a1e" />
      </linearGradient>
      {/* Стопка: каждая монета — ребро с нижней дугой, стык и лицевая сторона; рисуем снизу вверх,
          чуть сдвигая по горизонтали, чтобы из-под верхней монеты выглядывал край нижней */}
      <g filter={`url(#${u}-shadow)`}>
        {[0, 3, -2, 4, -1, 2].map((dx, k, all) => {
          const cx = 76 + dx
          const t = 150 - k * 11
          const top = k === all.length - 1
          return (
            <g key={k}>
              <path d={`M${cx - 38} ${t}v10a38 11 0 0 0 76 0v-10z`} fill={`url(#${u}-coin)`} />
              <path d={`M${cx - 38} ${t + 10}a38 11 0 0 0 76 0`} fill="none" stroke="#9a6410" strokeWidth="2" />
              {[-26, -13, 0, 13, 26].map((x) => (
                <path key={x} d={`M${cx + x} ${t + 3 + Math.abs(x) / 9}v7`} stroke="#c58a1c" strokeWidth="1.6" />
              ))}
              <ellipse cx={cx} cy={t} rx="38" ry="11" fill="#ffe08a" stroke="#d99a1e" strokeWidth="2" />
              {top && (
                <>
                  <ellipse cx={cx} cy={t} rx="27" ry="7.5" fill="none" stroke="#e7ad2c" strokeWidth="2" />
                  <text x={cx} y={t + 5} textAnchor="middle" fontSize="15" fontWeight="800" fill="#b97a10" fontFamily="Manrope, sans-serif">₽</text>
                </>
              )}
            </g>
          )
        })}
      </g>
      {/* Одна монета улетает к «13%» — это удержанный налог */}
      <path d="M118 96q14-14 22-22" fill="none" stroke="#22d38f" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
      <g transform="rotate(-28 124 108)" filter={`url(#${u}-shadow)`}>
        <path d="M104 108v6a20 6 0 0 0 40 0v-6z" fill={`url(#${u}-coin)`} />
        <ellipse cx="124" cy="108" rx="20" ry="6" fill="#ffe08a" stroke="#d99a1e" strokeWidth="1.6" />
      </g>
      <g transform="rotate(10 146 70)" filter={`url(#${u}-shadow)`}>
        <rect x="110" y="44" width="74" height="52" rx="16" fill="#22d38f" />
        <rect x="110" y="44" width="74" height="52" rx="16" fill={`url(#${u}-shine)`} />
        <text x="147" y="80" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0a2018" fontFamily="Manrope, sans-serif">13%</text>
      </g>
    </g>
  ),
  // Телефон с бесконечным списанием
  subscriptions: (u) => (
    <g>
      <linearGradient id={`${u}-phone`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff5fa2" />
        <stop offset="1" stopColor="#7c5cff" />
      </linearGradient>
      <g transform="rotate(-10 100 104)" filter={`url(#${u}-shadow)`}>
        <rect x="62" y="30" width="76" height="144" rx="18" fill="#16171d" />
        <rect x="68" y="38" width="64" height="128" rx="13" fill={`url(#${u}-phone)`} />
        <rect x="68" y="38" width="64" height="128" rx="13" fill={`url(#${u}-shine)`} />
        {[0, 1, 2].map((k) => (
          <g key={k} transform={`translate(0 ${k * 30})`}>
            <rect x="76" y="56" width="48" height="22" rx="7" fill="#fff" opacity="0.92" />
            <circle cx="86" cy="67" r="5" fill="#ff5fa2" />
            <rect x="95" y="64" width="22" height="6" rx="3" fill="#16171d" opacity="0.5" />
          </g>
        ))}
      </g>
      <g filter={`url(#${u}-shadow)`}>
        <circle cx="152" cy="146" r="26" fill="#c8f135" />
        <path d="M141 146a11 11 0 1 1 4 8.5M141 146v-8M141 146h8" stroke="#16171d" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  ),
  // Квест: два варианта ответа в чате
  quest: (u) => (
    <g>
      <g filter={`url(#${u}-shadow)`}>
        <rect x="30" y="40" width="112" height="44" rx="18" fill="#ffffff" />
        <rect x="44" y="55" width="70" height="7" rx="3.5" fill="#16171d" opacity="0.6" />
        <rect x="44" y="67" width="44" height="7" rx="3.5" fill="#16171d" opacity="0.35" />
      </g>
      <g filter={`url(#${u}-shadow)`}>
        <rect x="70" y="98" width="104" height="34" rx="14" fill="#22b07d" />
        <path d="M86 115l6 6 12-12" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="112" y="111" width="46" height="7" rx="3.5" fill="#fff" opacity="0.85" />
      </g>
      <g filter={`url(#${u}-shadow)`}>
        <rect x="70" y="140" width="104" height="34" rx="14" fill="#f0443a" />
        <path d="M88 151l10 10M98 151l-10 10" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <rect x="112" y="153" width="46" height="7" rx="3.5" fill="#fff" opacity="0.85" />
      </g>
      <circle cx="160" cy="44" r="20" fill="#c8f135" filter={`url(#${u}-shadow)`} />
      <text x="160" y="53" textAnchor="middle" fontSize="26" fontWeight="800" fill="#16171d" fontFamily="Manrope, sans-serif">?</text>
    </g>
  ),
  // Объёмная диаграмма 50/30/20
  budget_503020: (u) => {
    const seg = (start: number, end: number) => {
      const r = 64
      const a0 = ((start - 90) * Math.PI) / 180
      const a1 = ((end - 90) * Math.PI) / 180
      const large = end - start > 180 ? 1 : 0
      return `M100 100L${100 + r * Math.cos(a0)} ${100 + r * Math.sin(a0)}A${r} ${r} 0 ${large} 1 ${100 + r * Math.cos(a1)} ${100 + r * Math.sin(a1)}z`
    }
    return (
      <g filter={`url(#${u}-shadow)`}>
        <g transform="translate(0 12)" opacity="0.55">
          <path d={seg(0, 180)} fill="#7a8f1a" />
          <path d={seg(180, 288)} fill="#3a2a9a" />
          <path d={seg(288, 360)} fill="#a13a70" />
        </g>
        <path d={seg(0, 180)} fill="#c8f135" />
        <path d={seg(180, 288)} fill="#7c5cff" />
        <g transform="translate(6 -6)">
          <path d={seg(288, 360)} fill="#ff5fa2" />
        </g>
        <circle cx="100" cy="100" r="64" fill={`url(#${u}-shine)`} />
        <text x="128" y="108" textAnchor="middle" fontSize="20" fontWeight="800" fill="#16171d" fontFamily="Manrope, sans-serif">50</text>
        <text x="72" y="134" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="Manrope, sans-serif">30</text>
        <text x="80" y="66" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff" fontFamily="Manrope, sans-serif">20</text>
      </g>
    )
  },
}
