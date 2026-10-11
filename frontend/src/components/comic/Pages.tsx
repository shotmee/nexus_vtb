import type { CSSProperties, ReactNode } from 'react'

import { Burst, Frame, Halftone, INK, PhoneBody, Spiky, Teen } from './Art'

// ---------- Текст поверх рисунка (HTML: переносится, читается скринридером) ----------
// Координаты — в системе рисунка 600×800, переводим в проценты страницы
const pos = (x: number, y: number, w?: number): CSSProperties => ({
  left: `${(x / 600) * 100}%`,
  top: `${(y / 800) * 100}%`,
  width: w ? `${(w / 600) * 100}%` : undefined,
})

function Caption({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  return (
    <div className="comic-caption absolute" style={pos(x, y, w)}>
      {children}
    </div>
  )
}

function Bubble({ x, y, w, tail = 'left', tone = 'white', children }: {
  x: number
  y: number
  w: number
  tail?: 'left' | 'right' | 'none'
  tone?: 'white' | 'danger'
  children: ReactNode
}) {
  return (
    <div className={`comic-bubble absolute ${tone === 'danger' ? 'comic-bubble-danger' : ''} ${tail !== 'none' ? `comic-tail-${tail}` : ''}`} style={pos(x, y, w)}>
      {children}
    </div>
  )
}

function Push({ x, y, w, title, text, tone = 'brand' }: { x: number; y: number; w: number; title: string; text: string; tone?: 'brand' | 'danger' | 'ok' }) {
  const color = tone === 'danger' ? '#f0443a' : tone === 'ok' ? '#22b07d' : '#5b3df5'
  return (
    <div className="comic-push absolute" style={pos(x, y, w)}>
      <span className="comic-push-dot" style={{ background: color }} />
      <span>
        <b>{title}</b>
        <br />
        {text}
      </span>
    </div>
  )
}

function Sfx({ x, y, size, rotate = -8, color = '#ff5fa2', children }: { x: number; y: number; size: number; rotate?: number; color?: string; children: ReactNode }) {
  return (
    <div className="comic-sfx absolute" style={{ ...pos(x, y), fontSize: `${(size / 600) * 100}cqw`, transform: `rotate(${rotate}deg)`, color }}>
      {children}
    </div>
  )
}

// Строка «экрана» телефона, нарисованного в SVG
function Row({ x, y, w, children, locked }: { x: number; y: number; w: number; children: ReactNode; locked?: boolean }) {
  return (
    <div className={`comic-row absolute ${locked ? 'comic-row-locked' : ''}`} style={pos(x, y, w)}>
      {children}
    </div>
  )
}

function Art({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 600 800" className="absolute inset-0 size-full" role="img" aria-label={label}>
      {children}
    </svg>
  )
}

export interface ComicPageDef {
  id: string
  label: string // что на странице — для скринридера
  render: (go: { scenarios: () => void }) => ReactNode
}

// ---------- Страницы ----------
export const PAGES: ComicPageDef[] = [
  {
    id: 'cover',
    label: 'Обложка: «Старт». Что происходит, когда вам 14',
    render: () => (
      <div className="comic-cover absolute inset-0">
        <Art label="Подросток с телефоном на фоне лучей">
          <Halftone id="d-cover" color="rgb(255 255 255 / 0.12)" />
          <rect width="600" height="800" fill="url(#d-cover)" />
          <Burst cx={300} cy={560} r={520} color="rgb(255 255 255 / 0.08)" n={22} />
          <Teen x={300} y={760} s={1.15} mood="calm" />
        </Art>
        <div className="absolute inset-x-[8%] top-[7%] text-white">
          <div className="comic-kicker">Комикс в 9 страницах</div>
          <div className="comic-title mt-[3%]">СТАРТ</div>
          <div className="comic-subtitle mt-[2%]">Что происходит с деньгами подростка, когда ему исполняется 14</div>
        </div>
        <div className="comic-hint absolute bottom-[4%] right-[6%]">Листайте →</div>
      </div>
    ),
  },
  {
    id: 'birthday',
    label: 'Страница 1: Артёму 14, детский банк закончился',
    render: () => (
      <>
        <Art label="Артём радуется торту с цифрой 14, а телефон сообщает, что детский режим завершён">
          <Halftone id="d-bd" />
          <Frame x={24} y={24} w={552} h={752} dots="d-bd">
            <Burst cx={300} cy={470} r={500} color="var(--comic-burst-warm)" />
            {/* торт */}
            <g stroke={INK} strokeWidth="5" strokeLinejoin="round">
              <rect x="380" y="560" width="160" height="110" rx="14" fill="#ff9ec4" />
              <path d="M380 600q20 20 40 0t40 0t40 0t40 0" fill="none" stroke="#fff" strokeWidth="8" />
              <rect x="372" y="664" width="176" height="20" rx="8" fill="#fff" />
              <rect x="430" y="520" width="16" height="42" fill="#7fd3ff" />
              <rect x="472" y="520" width="16" height="42" fill="#c8f135" />
              <path d="M438 500q10 12 0 20q-10-8 0-20zM480 500q10 12 0 20q-10-8 0-20z" fill="#ffb020" />
            </g>
            <Teen x={210} y={740} s={1.05} mood="happy" />
          </Frame>
        </Art>
        <Sfx x={380} y={430} size={84} rotate={-10} color="#ff5fa2">14!</Sfx>
        <Caption x={44} y={44} w={330}>Артёму исполнилось 14.</Caption>
        <Push x={300} y={150} w={262} title="Детский банк" text="Вам 14 — детский режим завершён." />
      </>
    ),
  },
  {
    id: 'alone',
    label: 'Страница 2: взрослые функции недоступны, родители уже не видят',
    render: () => (
      <>
        <Art label="Телефон: взрослые функции закрыты до 18, родительский контроль выключен; Артём растерян">
          <Halftone id="d-al" />
          <Frame x={24} y={24} w={552} h={752} dots="d-al">
            <PhoneBody x={70} y={150} w={300} h={520} />
            <Teen x={470} y={760} s={0.82} mood="worried" phone={false} />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={512}>Дальше — сам. Для взрослого банка ещё рано, а родители уже ничего не видят.</Caption>
        <Row x={98} y={210} w={244} locked>Кредитная карта · 18+</Row>
        <Row x={98} y={282} w={244} locked>Инвестиции · 18+</Row>
        <Row x={98} y={354} w={244} locked>Вклады · 18+</Row>
        <Row x={98} y={426} w={244} locked>Кешбэк и бонусы · 18+</Row>
        <Row x={98} y={510} w={244}>Родительский контроль: выключен</Row>
        <Bubble x={360} y={240} w={210} tail="none">…и что мне теперь можно?</Bubble>
      </>
    ),
  },
  {
    id: 'attack',
    label: 'Страница 3: на подростка сыплются предложения мошенников',
    render: () => (
      <>
        <Art label="Артём в центре, вокруг сообщения мошенников и вербовщиков">
          <Halftone id="d-at" color="rgb(240 68 58 / 0.28)" />
          <Frame x={24} y={24} w={552} h={752} fill="var(--comic-red)" dots="d-at">
            <Burst cx={300} cy={520} r={520} color="var(--comic-burst-red)" n={26} />
            <Teen x={300} y={760} s={0.95} mood="shock" />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={300}>А вот они — уже тут.</Caption>
        <Bubble x={60} y={130} w={250} tone="danger" tail="right">Подработка без опыта, 3–5 тыс. в день</Bubble>
        <Bubble x={330} y={110} w={230} tone="danger" tail="left">Сдай карту в аренду — 15 000 сразу</Bubble>
        <Bubble x={44} y={260} w={220} tone="danger" tail="right">Служба безопасности банка. Назовите код</Bubble>
        <Bubble x={352} y={250} w={210} tone="danger" tail="left">Вы выиграли iPhone! Оплатите доставку</Bubble>
        <Sfx x={372} y={392} size={46} rotate={12} color="#f0443a">БЗЗЗ!</Sfx>
      </>
    ),
  },
  {
    id: 'pushkin',
    label: 'Страница 4: Артёму предлагают «выкупить» Пушкинскую карту — за этим кража или фиктивные концерты, а карту блокируют',
    render: () => (
      <>
        <Art label="«Пушкинская карта» на рыболовном крючке, Артём с телефоном, штамп «Блок»">
          <Halftone id="d-pk" />
          <Frame x={24} y={24} w={552} h={752} fill="var(--comic-violet)" dots="d-pk">
            <Burst cx={420} cy={420} r={480} color="var(--comic-burst-warm)" n={20} />
            {/* леска и крючок */}
            <path d="M432 24v186" stroke={INK} strokeWidth="4" />
            <path d="M432 210v40a26 26 0 0 1-52 0v-10" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
            <path d="M380 240l-10 16 18-4z" fill={INK} />
            {/* «Пушкинская карта» на крючке */}
            <g transform="rotate(14 430 330)">
              <rect x="340" y="262" width="190" height="122" rx="16" fill="#5b3df5" stroke={INK} strokeWidth="5" />
              <rect x="340" y="262" width="190" height="122" rx="16" fill="url(#d-pk)" opacity="0.5" />
              <rect x="358" y="284" width="36" height="26" rx="6" fill="#ffd34d" stroke={INK} strokeWidth="3" />
              <rect x="358" y="336" width="110" height="10" rx="5" fill="#fff" opacity="0.85" />
              <rect x="358" y="354" width="70" height="10" rx="5" fill="#fff" opacity="0.6" />
            </g>
            <Teen x={470} y={770} s={0.8} mood="worried" />
            <Spiky cx={250} cy={530} r={76} fill="#f0443a" n={13} />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={330}>Ещё одна схема — «выкуп» Пушкинской карты.</Caption>
        <Push x={44} y={136} w={290} title="Куплю баланс Пушкинской" text="За твои 2 300 ₽ дам 1 500 налом, сразу" tone="danger" />
        <Bubble x={44} y={292} w={270} tail="left">Скинь номер карты, срок и код из смс — дальше я сам</Bubble>
        <div className="comic-stamp absolute" style={pos(193, 505, 116)}>БЛОК!</div>
        <Caption x={44} y={606} w={330}>Законно её не обналичить. Деньги спишут по коду или прогонят через фиктивные концерты, а карту заблокируют.</Caption>
      </>
    ),
  },
  {
    id: 'trap',
    label: 'Страница 5: деньги незнакомца и просьба переслать — это ст. 187 УК',
    render: () => (
      <>
        <Art label="Два кадра: на карту пришло 30 000 рублей от незнакомца; вербовщик просит переслать 27 000; штамп «ст. 187 УК»">
          <Halftone id="d-tr" />
          <Frame x={24} y={24} w={552} h={340} dots="d-tr">
            <PhoneBody x={150} y={70} w={300} h={420} />
          </Frame>
          <Frame x={24} y={384} w={552} h={392} fill="var(--comic-cream)" dots="d-tr">
            <Teen x={140} y={770} s={0.9} mood="shock" />
          </Frame>
          <Spiky cx={455} cy={660} r={96} fill="#f0443a" n={14} />
        </Art>
        <Caption x={44} y={44} w={240}>Однажды на карту падают чужие деньги.</Caption>
        <Push x={178} y={150} w={244} title="+30 000 ₽" text="Перевод от «Иван К.»" tone="ok" />
        <Bubble x={250} y={410} w={300} tail="left">Перешли 27 000 на этот номер, 3 тыс. — твои. Только быстро!</Bubble>
        <div className="comic-stamp absolute" style={{ ...pos(395, 625, 120) }}>ст. 187 УК</div>
        <Caption x={44} y={672} w={330}>С 16 лет это уголовная статья. А карту банк молча заблокирует.</Caption>
      </>
    ),
  },
  {
    id: 'bridge',
    label: 'Страница 6: «Старт» — мост между детским и взрослым банком',
    render: () => (
      <>
        <Art label="Обрыв между «Детским банком» и «Взрослым банком», через него — светящийся мост «Старт», по которому идёт Артём">
          <Halftone id="d-br" />
          <Frame x={24} y={24} w={552} h={752} fill="var(--comic-sky)" dots="d-br">
            {/* провал между скалами */}
            <path d="M174 470h252l-14 306H188z" fill="#2a2b38" />
            <path d="M174 470h252l-6 70H180z" fill="#3b3d52" />
            <path d="M210 600l18 30M380 640l-14 26M300 700l8 40" stroke="#4b4e66" strokeWidth="5" strokeLinecap="round" />
            {/* скалы */}
            <path d="M24 470h150l14 306H24z" fill="#9ad1a8" stroke={INK} strokeWidth="5" />
            <path d="M576 470H426l-14 306h164z" fill="#b9b2ff" stroke={INK} strokeWidth="5" />
            <path d="M24 470h150M426 470h150" stroke={INK} strokeWidth="5" />
            {/* мост */}
            <path d="M160 470q140 70 280 0v26q-140 70-280 0z" fill="url(#bridge-g)" stroke={INK} strokeWidth="5" />
            <defs>
              <linearGradient id="bridge-g" x1="0" x2="1">
                <stop offset="0" stopColor="#5b3df5" />
                <stop offset="1" stopColor="#ff5fa2" />
              </linearGradient>
            </defs>
            <path d="M160 470q140 70 280 0" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="10 12" />
            <Teen x={300} y={498} s={0.62} mood="relieved" phone={false} />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={512}>Мы предлагаем «Старт» — раздел ВТБ Онлайн для 14–22 лет. Буфер между детским и взрослым банком.</Caption>
        <div className="comic-sign absolute" style={pos(40, 420, 130)}>Детский банк</div>
        <div className="comic-sign absolute" style={pos(430, 420, 130)}>Взрослый банк</div>
        <div className="comic-sign comic-sign-brand absolute" style={pos(232, 600, 136)}>СТАРТ</div>
      </>
    ),
  },
  {
    id: 'guard',
    label: 'Страница 7: банк останавливает перевод и объясняет почему',
    render: () => (
      <>
        <Art label="Телефон с экраном «Перевод остановлен», Артём выдыхает">
          <Halftone id="d-gd" />
          <Frame x={24} y={24} w={552} h={752} dots="d-gd">
            <PhoneBody x={40} y={140} w={300} h={540} />
            <Teen x={470} y={760} s={0.82} mood="relieved" phone={false} />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={512}>Теперь в момент перевода банк рядом.</Caption>
        <Row x={68} y={200} w={244}><b style={{ color: '#f0443a' }}>Перевод остановлен</b></Row>
        <Row x={68} y={270} w={244}>Похоже, через вашу карту хотят провести чужие деньги</Row>
        <Row x={68} y={372} w={244}>Почему: деньги пришли от незнакомца 1 мин назад, вы пересылаете 90%</Row>
        <div className="comic-btn absolute" style={pos(68, 490, 244)}>Отменить перевод</div>
        <div className="comic-btn comic-btn-ghost absolute" style={pos(68, 552, 244)}>Мне предложили подработку</div>
        <Bubble x={360} y={250} w={200} tail="none">Фух. Хорошо, что объяснили.</Bubble>
        <Caption x={350} y={360} w={210}>А если деньги уже пришли — «Безопасный выход» по шагам.</Caption>
      </>
    ),
  },
  {
    id: 'grow',
    label: 'Страница 8: первая зарплата, копилка и цели',
    render: () => (
      <>
        <Art label="Три кадра: первая зарплата, копилка на наушники, история про налоги">
          <Halftone id="d-gr" />
          <Frame x={24} y={24} w={552} h={230} fill="var(--comic-lime)" dots="d-gr">
            <circle cx="480" cy="140" r="58" fill="#ffd34d" stroke={INK} strokeWidth="5" />
            <text x="480" y="160" textAnchor="middle" fontSize="56" fontWeight="800" fill={INK}>₽</text>
          </Frame>
          <Frame x={24} y={274} w={552} h={230} fill="var(--comic-sky)" dots="d-gr">
            <g transform="translate(470 395)" stroke={INK} strokeWidth="5" strokeLinejoin="round">
              <ellipse cx="0" cy="0" rx="70" ry="54" fill="#ff9ec4" />
              <circle cx="58" cy="-6" r="20" fill="#ff9ec4" />
              <path d="M-20 -54h40" strokeWidth="7" />
              <path d="M-40 50v20M30 50v20" strokeWidth="8" />
              <circle cx="20" cy="-14" r="5" fill={INK} stroke="none" />
            </g>
          </Frame>
          <Frame x={24} y={524} w={552} h={252} fill="var(--comic-violet)" dots="d-gr">
            <Teen x={470} y={770} s={0.62} mood="happy" />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={340}>А ещё «Старт» — это первое по-взрослому:</Caption>
        <Push x={44} y={130} w={330} title="+15 000 ₽ — первая зарплата" text="Почему пришло меньше? История про НДФЛ" tone="ok" />
        <Push x={44} y={330} w={330} title="Копилка: наушники" text="3 400 из 6 000 ₽ · отложить 10% с зарплаты" />
        <Caption x={44} y={560} w={330}>Цели, копилка, истории про деньги и XP — по событию, а не уроком.</Caption>
      </>
    ),
  },
  {
    id: 'try',
    label: 'Страница 9: попробуйте сами',
    render: (go) => (
      <>
        <Art label="Артём машет рукой">
          <Halftone id="d-try" />
          <Frame x={24} y={24} w={552} h={752} dots="d-try">
            <Burst cx={300} cy={600} r={520} color="var(--comic-burst-violet)" n={22} />
            <Teen x={300} y={760} s={1} mood="happy" wave />
          </Frame>
        </Art>
        <Caption x={44} y={44} w={512}>Это не конец истории, а старт. Проиграйте её сами — от сообщения вербовщика до «Безопасного выхода».</Caption>
        <button onClick={(e) => { e.stopPropagation(); go.scenarios() }} className="comic-cta absolute" style={pos(110, 200, 380)}>
          Посмотреть сценарии
        </button>
      </>
    ),
  },
  {
    id: 'back',
    label: 'Задняя обложка',
    render: () => (
      <div className="comic-cover absolute inset-0 grid place-items-center text-center text-white">
        <div className="px-[10%]">
          <div className="comic-title" style={{ fontSize: '12cqw' }}>СТАРТ</div>
          <div className="comic-subtitle mt-[4%]">Раздел для 14–22 лет в ВТБ Онлайн. Концепт команды nexus.</div>
        </div>
      </div>
    ),
  },
]
