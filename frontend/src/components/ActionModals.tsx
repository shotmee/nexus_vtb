import { useState } from 'react'

import { api } from '../api/client'
import type { OperationResponse, Persona, Profile, TransferResponse } from '../api/types'
import { rub } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

function AmountInput({ value, onChange, chips }: { value: string; onChange: (v: string) => void; chips: number[] }) {
  return (
    <div>
      <div className="relative">
        <input
          className="field pr-10 text-2xl font-bold"
          inputMode="numeric"
          placeholder="0"
          value={value ? Number(value).toLocaleString('ru-RU') : ''}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 7))}
          autoFocus
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">₽</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button key={c} onClick={() => onChange(String(c))} className="chip bg-page hover:bg-line">
            {rub(c)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Choice({ active, onClick, icon, title, sub, vertical = false, tone = 'brand' }: {
  active: boolean
  onClick: () => void
  icon: string
  title: string
  sub?: string
  vertical?: boolean
  tone?: 'brand' | 'danger'
}) {
  const on = tone === 'danger' ? 'border-risk-high bg-risk-high/5' : 'border-brand bg-brand-soft'
  const iconOn = tone === 'danger' ? 'bg-risk-high text-white' : 'bg-brand text-white'
  return (
    <button
      onClick={onClick}
      className={`flex gap-3 rounded-2xl border-2 p-3.5 text-left transition ${vertical ? 'flex-col items-start' : 'items-center'} ${active ? on : 'border-line hover:border-brand/40'}`}
    >
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? iconOn : 'bg-page text-ink'}`}>
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0">
        <span className={`block font-semibold leading-tight ${vertical ? '' : 'truncate'}`}>{title}</span>
        {sub && <span className={`mt-0.5 block text-xs leading-snug text-muted ${vertical ? '' : 'truncate'}`}>{sub}</span>}
      </span>
    </button>
  )
}

// ---------- Пополнить ----------
export function TopUpModal({ persona, onClose, onDone }: {
  persona: Persona
  onClose: () => void
  onDone: (r: OperationResponse) => void
}) {
  const [sender, setSender] = useState('Мама')
  const [amount, setAmount] = useState('1500')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      onDone(await api.topup(persona.id, sender, Number(amount)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Пополнить счёт" onClose={onClose}>
      <div className="text-sm font-semibold text-muted">От кого</div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Choice vertical active={sender === 'Мама'} onClick={() => setSender('Мама')} icon="user" title="Мама" sub="Переводит часто" />
        <Choice vertical active={sender === 'Папа'} onClick={() => setSender('Папа')} icon="user" title="Папа" sub="Переводит часто" />
        <Choice vertical tone="danger" active={sender === 'Неизвестный'} onClick={() => setSender('Неизвестный')} icon="alert" title="Незнакомец" sub="Раньше не переводил" />
      </div>
      {sender === 'Неизвестный' && (
        <p className="animate-fade mt-3 rounded-2xl bg-page p-3 text-sm text-muted">
          Перевод от человека, который раньше вам не переводил — например, от «работодателя» из мессенджера.
        </p>
      )}
      <div className="mt-6 text-sm font-semibold text-muted">Сумма</div>
      <div className="mt-2">
        <AmountInput value={amount} onChange={setAmount} chips={[500, 1500, 5000, 30000]} />
      </div>
      <button className="btn-primary mt-7 w-full" disabled={!Number(amount) || busy} onClick={submit}>
        Зачислить {Number(amount) ? rub(Number(amount)) : ''}
      </button>
    </Modal>
  )
}

// ---------- Перевести ----------
export function TransferModal({ persona, profile, prefill, onClose, onDone }: {
  persona: Persona
  profile: Profile | null
  prefill?: { to?: string; amount?: number }
  onClose: () => void
  onDone: (r: TransferResponse, to: string, amount: number) => void
}) {
  const contacts = [...new Set(['Мама', 'Папа', ...(profile?.known_recipients ?? [])])]
  const [to, setTo] = useState(prefill?.to ?? contacts[0])
  const [phone, setPhone] = useState(prefill?.to && !contacts.includes(prefill.to) ? prefill.to : '')
  const [byPhone, setByPhone] = useState(Boolean(prefill?.to && !contacts.includes(prefill.to)))
  const [amount, setAmount] = useState(prefill?.amount ? String(prefill.amount) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const target = byPhone ? phone : to

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      onDone(await api.transfer(persona.id, target, Number(amount)), target, Number(amount))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Перевести" onClose={onClose}>
      <div className="text-sm font-semibold text-muted">Кому</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {contacts.map((c) => (
          <Choice key={c} active={!byPhone && to === c} onClick={() => { setTo(c); setByPhone(false) }} icon="user" title={c} sub="Переводили раньше" />
        ))}
        <Choice active={byPhone} onClick={() => setByPhone(true)} icon="phone" title="По номеру" sub="Новый получатель" />
      </div>
      {byPhone && (
        <input
          className="field animate-fade mt-3"
          placeholder="+7 900 000-00-00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoFocus
        />
      )}
      <div className="mt-6 text-sm font-semibold text-muted">Сумма</div>
      <div className="mt-2">
        <AmountInput value={amount} onChange={setAmount} chips={[200, 500, 1000, 27000]} />
      </div>
      <div className="mt-2 text-sm text-muted">Доступно {rub(persona.balance)}</div>
      {error && <div className="mt-4 rounded-2xl bg-risk-high/10 p-3 text-sm text-risk-high">{error}</div>}
      <button className="btn-primary mt-6 w-full" disabled={!Number(amount) || !target || busy} onClick={submit}>
        Перевести {Number(amount) ? rub(Number(amount)) : ''}
      </button>
    </Modal>
  )
}

// ---------- Оплатить ----------
const SHOPS = [
  { merchant: 'Магазин одежды', category: 'clothes', icon: 'shirt', amount: 2490 },
  { merchant: 'Доставка еды', category: 'food', icon: 'food', amount: 690 },
  { merchant: 'Кинотеатр', category: 'fun', icon: 'film', amount: 450 },
  { merchant: 'Подписка на музыку', category: 'subscriptions', icon: 'music', amount: 249 },
  { merchant: 'Игровой магазин', category: 'fun', icon: 'game', amount: 999 },
  { merchant: 'Проездной', category: 'other', icon: 'bus', amount: 1200 },
]

export function PayModal({ persona, onClose, onDone }: {
  persona: Persona
  onClose: () => void
  onDone: (r: OperationResponse) => void
}) {
  const [shop, setShop] = useState(SHOPS[0])
  const [amount, setAmount] = useState(String(SHOPS[0].amount))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    const r = await api.pay(persona.id, shop.merchant, shop.category, Number(amount))
    setBusy(false)
    if (r.status === 'rejected') setError(r.message)
    else onDone(r)
  }

  return (
    <Modal title="Оплатить покупку" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SHOPS.map((s) => (
          <button
            key={s.merchant}
            onClick={() => { setShop(s); setAmount(String(s.amount)); setError('') }}
            className={`flex flex-col items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition ${shop === s ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/40'}`}
          >
            <span className={`grid size-10 place-items-center rounded-xl ${shop === s ? 'bg-brand text-white' : 'bg-page'}`}>
              <Icon name={s.icon} size={19} />
            </span>
            <span className="text-sm font-semibold leading-tight">{s.merchant}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 text-sm font-semibold text-muted">Сумма</div>
      <div className="mt-2">
        <AmountInput value={amount} onChange={setAmount} chips={[shop.amount, 500, 1000, 3000]} />
      </div>
      {error && <div className="mt-4 rounded-2xl bg-risk-high/10 p-3 text-sm text-risk-high">{error}</div>}
      <button className="btn-primary mt-6 w-full" disabled={!Number(amount) || busy} onClick={submit}>
        Оплатить {Number(amount) ? rub(Number(amount)) : ''}
      </button>
    </Modal>
  )
}
