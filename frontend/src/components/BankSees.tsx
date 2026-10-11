import { useState } from 'react'

import type { LiveRisk } from '../api/types'
import { RISK_COLOR, RISK_LABEL, rub } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

// Правила алгоритма — те же, что в backend/app/services/risk.py
const RULES = {
  incoming: [
    ['Отправитель раньше вам не переводил', '+0.35'],
    ['Сумма в 5 раз и больше выше обычного пополнения', '+0.30'],
    ['Сумма в 2,5–5 раз выше обычного пополнения', '+0.15'],
    ['Незнакомый отправитель и клиенту меньше 18 лет', '+0.10'],
    ['Два и больше незнакомых отправителя за сутки', '+0.20'],
  ],
  transfer: [
    ['За последние сутки пришли деньги от незнакомца', '+0.35'],
    ['Переводите дальше 70% этой суммы и больше', '+0.30'],
    ['Деньги уходят в течение часа после зачисления', '+0.10'],
    ['Новый получатель', '+0.15'],
    ['Сумма в 5 раз и больше выше обычной траты', '+0.15'],
    ['Клиенту меньше 18 лет', '+0.10'],
    ['Три и больше незнакомых отправителя за сутки', '+0.20'],
  ],
}

function RiskBar({ live }: { live: LiveRisk }) {
  const color = RISK_COLOR[live.level]
  return (
    <div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-page">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(live.score * 100, 4)}%`, background: color }} />
        <span className="absolute inset-y-0 left-[40%] w-0.5 bg-surface" />
        <span className="absolute inset-y-0 left-[70%] w-0.5 bg-surface" />
      </div>
      <div className="relative mt-1.5 h-4 text-xs text-muted">
        <span className="absolute left-0">0</span>
        <span className="absolute left-[40%] -translate-x-1/2">0.4</span>
        <span className="absolute left-[70%] -translate-x-1/2">0.7</span>
        <span className="absolute right-0">1.0</span>
      </div>
    </div>
  )
}

// Компактная карточка «Что видит банк» на главной; полный разбор — во всплывающем окне.
export default function BankSees({ live }: { live: LiveRisk | null }) {
  const [open, setOpen] = useState(false)
  if (!live) return <div className="card h-[180px] animate-pulse" />
  const color = RISK_COLOR[live.level]

  return (
    <>
      <button onClick={() => setOpen(true)} className="card w-full p-6 text-left transition hover:-translate-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon name="eye" size={18} />
            </span>
            <h3 className="text-lg font-bold">Что видит банк</h3>
          </div>
          <span className="chip shrink-0 font-semibold text-white" style={{ background: color }}>
            {RISK_LABEL[live.level]} риск
          </span>
        </div>
        <div className="mt-5">
          <RiskBar live={live} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[14px] text-muted">
            {live.signals.length
              ? `${live.signals.length} ${live.signals.length === 1 ? 'сигнал' : live.signals.length < 5 ? 'сигнала' : 'сигналов'}: ${live.signals[0]}`
              : 'Операции совпадают с вашим обычным поведением'}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1 text-[15px] font-semibold text-brand">
          Подробнее <Icon name="chevron" size={16} />
        </div>
      </button>

      {open && <BankSeesModal live={live} onClose={() => setOpen(false)} />}
    </>
  )
}

function BankSeesModal({ live, onClose }: { live: LiveRisk; onClose: () => void }) {
  const color = RISK_COLOR[live.level]
  const p = live.profile
  const verdict = {
    low: 'Всё спокойно: ваши операции похожи на обычные. Банк ничего не ограничивает.',
    medium: 'Есть необычные операции. Банк предупреждает вас, но ничего не блокирует.',
    high: 'Похоже на схему с дропами. Перевод таких денег дальше будет остановлен.',
  }[live.level]

  return (
    <Modal title="Что видит банк" onClose={onClose} width="max-w-[640px]">
      {/* Итог */}
      <div className="rounded-3xl p-5" style={{ background: `color-mix(in srgb, ${color} 9%, var(--color-surface))` }}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted">Оценка риска</div>
            <div className="text-[40px] font-extrabold leading-none" style={{ color }}>{live.score.toFixed(2)}</div>
          </div>
          <span className="chip font-semibold text-white" style={{ background: color }}>{RISK_LABEL[live.level]} риск</span>
        </div>
        <div className="mt-4"><RiskBar live={live} /></div>
        <p className="mt-3 text-[15px] leading-relaxed">{verdict}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <span className="rounded-xl bg-surface/70 p-2"><b className="text-risk-low">до 0.4</b> — обычные операции</span>
          <span className="rounded-xl bg-surface/70 p-2"><b className="text-risk-medium">0.4–0.7</b> — предупреждение</span>
          <span className="rounded-xl bg-surface/70 p-2"><b className="text-risk-high">от 0.7</b> — перевод останавливается</span>
        </div>
      </div>

      {/* Сигналы */}
      <h4 className="mt-7 text-lg font-bold">Что насторожило</h4>
      {live.signals.length ? (
        <ul className="mt-3 space-y-2">
          {live.signals.map((s) => (
            <li key={s} className="flex gap-2.5 rounded-2xl p-3 text-[15px] leading-snug" style={{ background: `color-mix(in srgb, ${color} 8%, var(--color-surface))` }}>
              <Icon name="alert" size={18} className="mt-0.5 shrink-0" />
              {s}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[15px] text-muted">Ничего: ни одно правило не сработало.</p>
      )}

      {/* Профиль */}
      {p && (
        <>
          <h4 className="mt-7 text-lg font-bold">Ваше обычное поведение</h4>
          <p className="mt-1 text-[14px] text-muted">С этим банк сравнивает каждую новую операцию. Считается по истории, без подозрительных операций.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <MetricCard icon="plus" label="Обычное пополнение" value={`≈ ${rub(p.avg_topup)}`}
              hint="Средняя сумма, которая приходит вам от своих. Если пришло в 5 раз больше — это сигнал." />
            <MetricCard icon="bag" label="Обычная трата" value={`≈ ${rub(p.avg_spend)}`}
              hint="Средняя покупка или перевод. Перевод в разы больше выглядит необычно." />
            <MetricCard icon="users" label="Свои отправители" chips={p.known_senders}
              hint="Кто обычно присылает вам деньги. Перевод от нового человека повышает риск." />
            <MetricCard icon="send" label="Свои получатели" chips={p.known_recipients}
              hint="Кому вы уже переводили. Перевод новому человеку — дополнительный сигнал." />
            <div className="sm:col-span-2">
              <MetricCard
                icon="spark"
                label="Скорость транзита"
                value={p.min_transit_minutes == null ? 'Транзита не было' : `${p.min_transit_minutes} мин`}
                alert={p.min_transit_minutes != null}
                hint="Сколько прошло между зачислением от незнакомца и переводом дальше. Чем быстрее, тем больше похоже на дропа: деньги просто «проходят» через карту."
              />
            </div>
          </div>
        </>
      )}

      {/* Правила */}
      <h4 className="mt-7 text-lg font-bold">Как считается оценка</h4>
      <p className="mt-1 text-[14px] text-muted">
        Баллы за каждое сработавшее правило складываются. Решение принимает алгоритм, а ассистент только объясняет его.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RuleList title="1. Деньги пришли" sub="Помечаем, но не блокируем" rules={RULES.incoming} />
        <RuleList title="2. Деньги уходят дальше" sub="От 0.7 — перевод остановлен" rules={RULES.transfer} />
      </div>
    </Modal>
  )
}

function MetricCard({ icon, label, value, chips, hint, alert }: {
  icon: string
  label: string
  value?: string
  chips?: string[]
  hint: string
  alert?: boolean
}) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon name={icon} size={16} /> {label}
      </div>
      {value && <div className={`mt-1 text-xl font-bold ${alert ? 'text-risk-high' : ''}`}>{value}</div>}
      {chips && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.length ? chips.map((c) => <span key={c} className="chip bg-page px-2.5 py-1 text-[13px]">{c}</span>) : <span className="text-muted">—</span>}
        </div>
      )}
      <p className="mt-2 text-[13px] leading-snug text-muted">{hint}</p>
    </div>
  )
}

function RuleList({ title, sub, rules }: { title: string; sub: string; rules: string[][] }) {
  return (
    <div className="rounded-2xl bg-page p-4">
      <div className="font-bold">{title}</div>
      <div className="text-xs text-muted">{sub}</div>
      <ul className="mt-3 space-y-1.5 text-[13px]">
        {rules.map(([rule, pts]) => (
          <li key={rule} className="flex justify-between gap-3">
            <span>{rule}</span>
            <b className="shrink-0 text-brand">{pts}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
