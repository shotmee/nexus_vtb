import { useEffect, useState } from 'react'

import { api } from '../api/client'
import type { Goal, ScenarioPopup } from '../api/types'
import { rub } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

// Окна каналов роста «Старта»: скоро 14, мост из «Детского банка», витрина «Пушкинской карты», цель.

function Title({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white">
        <Icon name={icon} size={21} />
      </span>
      {children}
    </span>
  )
}

function GoalRow({ goal }: { goal: Goal }) {
  const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  return (
    <div className="rounded-2xl bg-page p-3.5">
      <div className="flex justify-between text-[15px]">
        <span className="font-semibold">{goal.title}</span>
        <span className="text-muted">{rub(goal.saved)} / {rub(goal.target)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-sky transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function BirthdayWindow({ popup, onClose }: { popup: ScenarioPopup; onClose: () => void }) {
  return (
    <Modal onClose={onClose} title={<Title icon="star">{popup.title ?? 'Скоро 14!'}</Title>}>
      <p className="text-[16px] leading-relaxed text-ink/80">{popup.text}</p>
      <ul className="mt-4 space-y-2 text-[15px]">
        {['Своя карта по паспорту — без новой заявки', 'Цели, копилка и опыт переносятся', 'Родитель подтвердит переход в своём приложении'].map((x) => (
          <li key={x} className="flex gap-2.5 rounded-2xl bg-page p-3">
            <Icon name="check" size={18} className="mt-px shrink-0 text-brand" />
            {x}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-2">
        <button className="btn-primary" onClick={onClose}>Понятно, жду!</button>
      </div>
    </Modal>
  )
}

export function BridgeWindow({ popup, goals, xp, onMigrate, onClose }: {
  popup: ScenarioPopup
  goals: Goal[]
  xp: number
  onMigrate: () => Promise<void>
  onClose: () => void
}) {
  const [stage, setStage] = useState<'offer' | 'waiting' | 'error'>('offer')

  const ask = async () => {
    setStage('waiting')
    // В демо родитель «подтверждает» сам через секунду; в ВТБ — запрос в его ВТБ Онлайн
    await new Promise((r) => window.setTimeout(r, 1300))
    try {
      await onMigrate()
    } catch {
      setStage('error')
    }
  }

  return (
    <Modal onClose={onClose} title={<Title icon="spark">{popup.title ?? 'Переход в «Старт»'}</Title>}>
      <p className="text-[16px] leading-relaxed text-ink/80">{popup.text}</p>
      <div className="mt-4 text-sm font-bold uppercase tracking-wide text-muted">Переносим в «Старт»</div>
      <div className="mt-2 space-y-2">
        {goals.map((g) => <GoalRow key={g.id} goal={g} />)}
        <div className="flex items-center gap-2.5 rounded-2xl bg-page p-3.5 text-[15px]">
          <Icon name="star" size={18} className="text-brand" /> <b>{xp} XP</b> <span className="text-muted">и пройденные истории</span>
        </div>
      </div>
      {stage === 'waiting' && (
        <div className="animate-fade mt-4 flex items-center gap-2.5 rounded-2xl bg-brand-soft p-3 text-[14px] font-medium text-brand">
          <span className="size-2 animate-ping rounded-full bg-brand" /> Ждём подтверждения в приложении мамы…
        </div>
      )}
      {stage === 'error' && <p className="mt-4 text-sm text-risk-high">Не получилось перейти — попробуйте ещё раз.</p>}
      <div className="mt-6 grid gap-2">
        <button className="btn-primary" disabled={stage === 'waiting'} onClick={ask}>
          <Icon name="users" size={18} /> Попросить маму подтвердить
        </button>
        <button className="btn-ghost" onClick={onClose}>Позже</button>
      </div>
      <p className="mt-3 text-xs text-muted">С 1 августа 2025 года счёт подростку 14–17 открывается только с согласия родителя.</p>
    </Modal>
  )
}

export function PushkinWindow({ popup, onActivate, onClose }: {
  popup: ScenarioPopup
  onActivate: () => Promise<void>
  onClose: () => void
}) {
  const [offers, setOffers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.pushkinOffers().then(setOffers).catch(() => setOffers([]))
  }, [])

  return (
    <Modal onClose={onClose} title={<Title icon="film">{popup.title ?? '«Пушкинская карта»'}</Title>}>
      <p className="text-[16px] leading-relaxed text-ink/80">{popup.text}</p>
      <ul className="mt-4 space-y-2 text-[15px]">
        {offers.map((x) => (
          <li key={x} className="flex gap-2.5 rounded-2xl bg-page p-3">
            <Icon name="check" size={18} className="mt-px shrink-0 text-brand" />
            {x}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-2">
        <button
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onActivate().finally(() => setBusy(false))
          }}
        >
          <Icon name="card" size={18} /> Открыть карту «Старт»
        </button>
        <button className="btn-ghost" onClick={onClose}>Не сейчас</button>
      </div>
    </Modal>
  )
}

export function GoalWindow({ popup, goal, amount, onDeposit, onClose }: {
  popup: ScenarioPopup
  goal: Goal | null
  amount: number
  onDeposit: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal onClose={onClose} title={<Title icon="piggy">{popup.title ?? 'Копилка'}</Title>}>
      <p className="text-[16px] leading-relaxed text-ink/80">{popup.text}</p>
      {goal && <div className="mt-4"><GoalRow goal={goal} /></div>}
      <div className="mt-6 grid gap-2">
        <button
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            await onDeposit().finally(() => setBusy(false))
          }}
        >
          <Icon name="piggy" size={18} /> Отложить {rub(amount)}
        </button>
        <button className="btn-ghost" onClick={onClose}>Не сейчас</button>
      </div>
    </Modal>
  )
}

// Копилка вне сценария: пополнить цель или завести новую
export function GoalsModal({ personaId, goals, onChanged, onClose, notify }: {
  personaId: string
  goals: Goal[]
  onChanged: () => Promise<void>
  onClose: () => void
  notify: (text: string) => void
}) {
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')

  const put = async (g: Goal, amount: number) => {
    try {
      const r = await api.depositGoal(personaId, g.id, amount)
      notify(r.message)
      await onChanged()
    } catch (e) {
      notify((e as Error).message)
    }
  }

  const create = async () => {
    if (!title.trim() || !(Number(target) > 0)) return
    await api.createGoal(personaId, title.trim(), Number(target))
    setTitle('')
    setTarget('')
    await onChanged()
  }

  return (
    <Modal onClose={onClose} title={<Title icon="piggy">Цели и копилка</Title>}>
      <div className="space-y-3">
        {goals.length === 0 && <p className="text-muted">Пока нет целей — заведите первую.</p>}
        {goals.map((g) => (
          <div key={g.id}>
            <GoalRow goal={g} />
            <div className="mt-2 flex gap-2">
              {[100, 500, 1000].map((a) => (
                <button key={a} className="chip bg-brand-soft text-brand hover:brightness-95" onClick={() => put(g, a)}>
                  +{rub(a)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">Новая цель</div>
      <div className="mt-2 grid grid-cols-[1fr_120px] gap-2">
        <input className="field" placeholder="На что копим?" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="field" placeholder="Сумма" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value.replace(/\D/g, ''))} />
      </div>
      <button className="btn-primary mt-3 w-full" onClick={create}>Добавить цель</button>
      <p className="mt-3 text-xs text-muted">В ВТБ копилка — накопительный счёт для 14–25 лет с ежедневными процентами.</p>
    </Modal>
  )
}
