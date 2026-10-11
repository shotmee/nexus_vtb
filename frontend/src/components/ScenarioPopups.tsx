import { useEffect } from 'react'

import type { LiveRisk, ScenarioPopup, Transaction } from '../api/types'
import { rub } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

export interface PushData {
  id: number
  icon: string
  title: string
  text: string
  tone?: 'default' | 'danger' | 'chat'
  onClick?: () => void
}

// Уведомление сверху экрана — как пуш от банка или мессенджера.
export function Push({ push, onDone }: { push: PushData; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 4500)
    return () => window.clearTimeout(t)
  }, [push.id, onDone])

  const tint = push.tone === 'danger' ? 'var(--color-risk-high)' : push.tone === 'chat' ? '#16171d' : 'var(--color-brand)'
  return (
    <button
      key={push.id}
      onClick={() => { push.onClick?.(); onDone() }}
      className="animate-drop fixed left-1/2 top-4 z-[60] flex w-[min(420px,calc(100vw-24px))] -translate-x-1/2 items-center gap-3 rounded-[22px] bg-surface/95 p-3.5 text-left backdrop-blur"
      style={{ boxShadow: 'var(--shadow-pop)' }}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-white" style={{ background: tint }}>
        <Icon name={push.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-bold">{push.title}</span>
          <span className="shrink-0 text-xs text-muted">сейчас</span>
        </span>
        <span className="line-clamp-2 block text-[14px] leading-snug text-ink/75">{push.text}</span>
      </span>
    </button>
  )
}

export interface PopupActions {
  returnFunds: () => void
  openTransfer: () => void
  openShield: () => void
  openSos: (branch?: 'A' | 'B') => void
  askBit: (question: string) => void
  openLesson: () => void
  openQuest: () => void
  close: () => void
}

// Окно банка на шаге сценария. Набор кнопок зависит от типа события.
export function ScenarioWindow({ popup, personaName, incoming, live, lastMessage, xp, actions }: {
  popup: ScenarioPopup
  personaName: string
  incoming: Transaction | null
  live: LiveRisk | null
  lastMessage: string
  xp: number
  actions: PopupActions
}) {
  const Quote = () =>
    lastMessage ? (
      <div className="mt-4 rounded-2xl rounded-bl-md bg-page p-3.5 text-[15px]">
        <div className="mb-1 text-xs font-semibold text-muted">Сообщение в мессенджере</div>
        «{lastMessage}»
      </div>
    ) : null

  if (popup.type === 'incoming') {
    return (
      <Modal tone="danger" onClose={actions.close} title={<Title icon="alert" danger>Необычное зачисление</Title>}>
        {incoming && (
          <div className="rounded-3xl p-5" style={{ background: 'color-mix(in srgb, var(--color-risk-high) 8%, var(--color-surface))' }}>
            <div className="text-sm text-muted">Пришло от «{incoming.counterparty}»</div>
            <div className="text-[34px] font-extrabold leading-tight text-risk-low">+{rub(incoming.amount)}</div>
            <div className="mt-1 text-sm font-semibold text-risk-high">Сумма помечена банком — под проверкой</div>
          </div>
        )}
        {live && live.signals.length > 0 && (
          <>
            <div className="mt-5 text-sm font-bold uppercase tracking-wide text-muted">Почему банк насторожился</div>
            <ul className="mt-2 space-y-1.5 text-[15px]">
              {live.signals.slice(0, 3).map((s) => (
                <li key={s} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-risk-high" />{s}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
          Если вы не ждали этих денег — не тратьте и не переводите их, даже «обратно». Банк сам вернёт их владельцу.
        </p>
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={actions.returnFunds}><Icon name="lock" size={18} /> Вернуть через банк</button>
          <button className="btn-ghost" onClick={() => actions.askBit('Мне пришли чужие деньги')}><Icon name="chat" size={18} /> Спросить Бита</button>
          <button className="mt-1 text-sm font-semibold text-muted hover:text-ink" onClick={actions.close}>Я знаю отправителя, это мои деньги</button>
        </div>
      </Modal>
    )
  }

  if (popup.type === 'request_transfer') {
    return (
      <Modal onClose={actions.close} title={<Title icon="send">Вас просят перевести деньги</Title>}>
        <Quote />
        <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
          Перед отправкой банк проверит перевод. Если это чужие деньги, которые просят переслать дальше, — перевод будет остановлен.
        </p>
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={actions.openTransfer}>Открыть перевод</button>
          <button className="btn-ghost" onClick={actions.openShield}><Icon name="shield" size={18} /> Проверить сообщение</button>
          <button className="btn-ghost" onClick={() => actions.openSos('A')}><Icon name="lifebuoy" size={18} /> Не буду переводить — что делать с деньгами?</button>
        </div>
      </Modal>
    )
  }

  if (popup.type === 'pressure' || popup.type === 'threat') {
    const threat = popup.type === 'threat'
    return (
      <Modal tone="danger" onClose={actions.close} title={<Title icon="alert" danger>{threat ? 'Вам угрожают' : 'Вас торопят'}</Title>}>
        <Quote />
        <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
          {threat
            ? 'Угрозы «сдадим в полицию» и «знаем, где ты учишься» — стандартное давление вербовщиков. Не переводите больше ничего. Если вы сами сообщите банку и полиции и поможете раскрыть схему, закон это учитывает.'
            : 'Спешка — главный приём вербовщиков: чтобы вы не успели подумать и спросить кого-то. Вы не обязаны ничего делать.'}
        </p>
        {threat && <p className="mt-3 rounded-2xl bg-page p-3 text-sm"><b>Угрожают прямо сейчас?</b> Звоните 102 — это бесплатно.</p>}
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={() => actions.openSos(threat ? 'B' : 'A')}><Icon name="lifebuoy" size={18} /> Открыть «Безопасный выход»</button>
          <button className="btn-ghost" onClick={() => actions.askBit(threat ? 'Мне угрожают, я уже переводил' : 'Что мне грозит?')}><Icon name="chat" size={18} /> Спросить Бита</button>
        </div>
      </Modal>
    )
  }

  if (popup.type === 'history') {
    return (
      <Modal onClose={actions.close} title={<Title icon="eye">Банк заметил транзит</Title>}>
        <p className="text-[15px] leading-relaxed text-ink/80">
          Вчера на карту пришли деньги от незнакомого человека и почти сразу ушли дальше. Так выглядит работа дропа: через карту проводят чужие деньги.
        </p>
        <Quote />
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={actions.close}>Понятно</button>
          <button className="btn-ghost" onClick={() => actions.askBit('Что такое дроп?')}><Icon name="chat" size={18} /> Что это значит?</button>
        </div>
      </Modal>
    )
  }

  if (popup.type === 'lesson') {
    return (
      <Modal onClose={actions.close} title={<Title icon="book">{popup.title ?? 'Новая история'}</Title>}>
        <p className="text-[16px] leading-relaxed text-ink/80">{popup.text}</p>
        <div className="mt-6 grid gap-2">
          <button className="btn-primary" onClick={actions.openLesson}><Icon name="play" size={17} /> Смотреть историю</button>
          <button className="btn-ghost" onClick={actions.close}>Позже</button>
        </div>
      </Modal>
    )
  }

  // done
  return (
    <Modal onClose={actions.close} title="Сценарий пройден">
      <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #5b3df5, #ff5fa2)' }}>
        <div className="text-2xl font-extrabold">{personaName}, вы всё сделали правильно</div>
        <p className="mt-2 text-white/85">{popup.text ?? 'Опасные деньги не ушли дальше, банк получил обращение с доказательствами.'}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
          <Icon name="star" size={16} /> Всего {xp} XP
        </div>
      </div>
      <div className="mt-5 grid gap-2">
        <button className="btn-primary" onClick={actions.openQuest}>Квест «А что было бы, если…»</button>
        <button className="btn-ghost" onClick={actions.close}>Закрыть</button>
      </div>
    </Modal>
  )
}

function Title({ icon, danger, children }: { icon: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3">
      <span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-white ${danger ? 'bg-risk-high' : 'bg-brand'}`}>
        <Icon name={icon} size={21} />
      </span>
      {children}
    </span>
  )
}
