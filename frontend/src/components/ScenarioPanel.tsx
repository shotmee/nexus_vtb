import { useEffect, useRef, useState } from 'react'

import type { DemoState, LiveRisk } from '../api/types'
import { RISK_COLOR, RISK_LABEL } from '../lib'
import Icon from './Icon'

const CHAT_TITLE: Record<string, string> = {
  artem: 'Работа | Подработка',
  dima: 'Куратор',
}
const TYPE_MS = 1100

// Выдвижная панель сценария: шаги, живой риск («что видит банк» для жюри) и переписка.
// Сообщения появляются по одному; когда показаны все — onChatShown, и сценарий идёт дальше.
export default function ScenarioPanel({ state, live, waiting, onNext, onRestart, onClose, onChatShown }: {
  state: DemoState
  live: LiveRisk | null
  waiting: string | null
  onNext: () => void
  onRestart: () => void
  onClose: () => void
  onChatShown: (stepIndex: number) => void
}) {
  const chatRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(0)
  const total = state.chat_history.length
  const last = state.step_index >= state.steps_count - 1
  const typing = shown < total && state.chat_history[shown]?.sender === 'recruiter'

  useEffect(() => {
    if (shown > total) setShown(total) // сценарий сброшен
  }, [shown, total])

  useEffect(() => {
    if (shown < total) {
      const delay = state.chat_history[shown].sender === 'recruiter' ? TYPE_MS : 500
      const t = window.setTimeout(() => setShown((n) => n + 1), delay)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => onChatShown(state.step_index), 400)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, total, state.step_index])

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [shown, typing])

  const color = live ? RISK_COLOR[live.level] : 'var(--color-muted)'

  return (
    <aside className="animate-slide fixed inset-y-0 right-0 z-20 flex w-full flex-col bg-surface sm:w-[420px]" style={{ boxShadow: 'var(--shadow-pop)' }}>
      <div className="border-b border-line p-5 pb-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wide text-brand">Сценарий · {state.persona.name}</div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Закрыть сценарий">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: state.steps_count }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= state.step_index ? 'bg-brand' : 'bg-line'}`} />
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <div className="text-xl font-bold">{state.step.title}</div>
          <div className="shrink-0 text-sm text-muted">{state.step_index + 1} / {state.steps_count}</div>
        </div>
        {state.step.hint && <p className="mt-1 text-[14px] leading-snug text-muted">{state.step.hint}</p>}
        {waiting && (
          <div className="animate-fade mt-3 flex items-center gap-2.5 rounded-2xl bg-brand-soft p-3 text-[14px] font-medium text-brand">
            <span className="size-2 animate-ping rounded-full bg-brand" />
            {waiting}
          </div>
        )}
      </div>

      {/* Что видит банк — постоянно на экране во время показа */}
      {live && (
        <div className="border-b border-line px-5 py-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold"><Icon name="eye" size={16} /> Что видит банк</span>
            <span className="font-bold" style={{ color }}>{RISK_LABEL[live.level]} · {live.score.toFixed(2)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-page">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(live.score * 100, 4)}%`, background: color }} />
          </div>
          {live.signals.length > 0 && (
            <ul className="mt-2 space-y-1">
              {live.signals.slice(0, 3).map((s) => (
                <li key={s} className="animate-fade flex gap-2 text-[13px] leading-snug text-ink/80">
                  <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 bg-page/70 px-5 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-night text-white"><Icon name="chat" size={17} /></span>
        <div>
          <div className="text-sm font-bold">{CHAT_TITLE[state.persona.id] ?? 'Мессенджер'}</div>
          <div className="text-xs text-muted">{typing ? 'печатает…' : 'переписка персонажа'}</div>
        </div>
      </div>

      <div ref={chatRef} className="flex-1 space-y-2.5 overflow-y-auto bg-page/70 p-4">
        {total === 0 && <div className="mt-8 text-center text-sm text-muted">В этом сценарии нет переписки — следите за уведомлениями банка.</div>}
        {state.chat_history.slice(0, shown).map((m, i) =>
          m.sender === 'system' ? (
            <div key={i} className="animate-rise text-center text-xs font-semibold text-muted">{m.text}</div>
          ) : (
            <div key={i} className={`animate-rise flex ${m.sender === 'user' ? 'justify-end' : ''}`}>
              <div
                className={`max-w-[85%] rounded-[18px] px-3.5 py-2 text-[14.5px] leading-snug ${m.sender === 'user' ? 'rounded-br-md bg-bubble' : 'rounded-bl-md bg-surface'}`}
                style={{ boxShadow: '0 1px 1px rgb(0 0 0 / 0.06)' }}
              >
                {m.text}
              </div>
            </div>
          ),
        )}
        {typing && (
          <div className="flex w-16 gap-1 rounded-[18px] bg-surface px-4 py-3">
            {[0, 1, 2].map((k) => <span key={k} className="size-2 animate-bounce rounded-full bg-muted/50" style={{ animationDelay: `${k * 120}ms` }} />)}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-line p-4">
        <button className="btn-ghost" onClick={() => { setShown(0); onRestart() }}>
          <Icon name="reset" size={18} /> Сначала
        </button>
        <button className="btn-primary flex-1" onClick={onNext} disabled={last}>
          {last ? 'Сценарий пройден' : 'Пропустить шаг'} {!last && <Icon name="next" size={18} />}
        </button>
      </div>
    </aside>
  )
}
