import { useState } from 'react'

import type { Transaction } from '../api/types'
import { CATEGORIES, categoryOf, formatDate, signedRub } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

const ICON: Record<string, string> = {
  food: 'food',
  clothes: 'shirt',
  subscriptions: 'music',
  fun: 'film',
  transfers: 'user',
  other: 'card',
}

/** Человеческое описание операции: что это, каким способом и от кого / кому. */
export function describe(t: Transaction): string {
  if (t.direction === 'in') {
    if (t.channel === 'salary') return 'Зачисление зарплаты или стипендии'
    if (t.frozen) return 'Входящий перевод по СБП · заморожен, банк вернёт его отправителю'
    if (t.flagged || t.is_new_counterparty) return 'Входящий перевод по СБП от незнакомого отправителя'
    return 'Входящий перевод по СБП от своего отправителя'
  }
  if (t.channel === 'card') return `Оплата картой · ${CATEGORIES[categoryOf(t)].label}`
  if (t.is_new_counterparty) return 'Исходящий перевод по СБП · новый получатель'
  return 'Исходящий перевод по СБП · получатель из ваших контактов'
}

function Row({ t }: { t: Transaction }) {
  const cat = categoryOf(t)
  const suspicious = t.flagged && !t.frozen
  const tint = suspicious ? 'var(--color-risk-high)' : t.direction === 'in' ? 'var(--color-brand)' : CATEGORIES[cat].color
  return (
    <li className="animate-rise flex items-center gap-4 py-3.5">
      <div
        className="grid size-11 shrink-0 place-items-center rounded-2xl"
        style={{ background: `color-mix(in srgb, ${tint} 12%, var(--color-surface))`, color: tint }}
      >
        <Icon name={suspicious ? 'alert' : t.direction === 'in' ? 'plus' : ICON[cat]} size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{t.counterparty}</div>
        <div className="text-[13px] leading-snug text-muted">{describe(t)}</div>
        <div className="text-xs text-muted/80">{formatDate(t.ts)}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-bold ${t.direction === 'in' ? 'text-risk-low' : ''} ${t.frozen ? 'text-muted line-through' : ''}`}>
          {signedRub(t)}
        </div>
        {suspicious && <div className="text-xs font-semibold text-risk-high">Под проверкой</div>}
        {t.frozen && <div className="text-xs font-semibold text-brand">Заморожено</div>}
      </div>
    </li>
  )
}

// Вся история операций во всплывающем окне — открывается из «Операций за месяц»
export default function OperationsModal({ txs, onClose }: { txs: Transaction[]; onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')
  const list = [...txs].reverse().filter((t) => filter === 'all' || t.direction === filter)

  return (
    <Modal title="История операций" onClose={onClose} width="max-w-[620px]">
      <div className="flex flex-wrap gap-2">
        {([['all', 'Все'], ['in', 'Пополнения'], ['out', 'Траты и переводы']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`chip border ${filter === k ? 'border-brand bg-brand-soft text-brand' : 'border-line hover:bg-page'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-line">
        {list.map((t) => <Row key={t.id} t={t} />)}
        {list.length === 0 && <li className="py-6 text-center text-muted">Операций нет</li>}
      </ul>
    </Modal>
  )
}
