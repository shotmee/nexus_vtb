import { useEffect, useRef, useState } from 'react'

import { api } from '../api/client'
import Icon from './Icon'

export interface Nudge {
  id: number
  text: string
  suggestions?: string[]
}

interface Message {
  role: 'bot' | 'user'
  text: string
}

const START_SUGGESTIONS = ['Что такое дроп?', 'Как устроен алгоритм?', 'Мне пришли чужие деньги', 'Что сейчас видит банк?']

// Маскот ассистента: скруглённый квадрат с «глазами», без эмодзи.
export function Mascot({ size = 44, mood = 'calm' }: { size?: number; mood?: 'calm' | 'alert' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id={`m-${mood}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={mood === 'alert' ? '#ff6b5a' : '#5b3df5'} />
          <stop offset="1" stopColor={mood === 'alert' ? '#ff5fa2' : '#3cc3f0'} />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="44" height="40" rx="16" fill={`url(#m-${mood})`} />
      <rect x="21" y="0" width="6" height="7" rx="3" fill="#c8f135" />
      <ellipse cx="17" cy="22" rx="4" ry="5" fill="white" />
      <ellipse cx="31" cy="22" rx="4" ry="5" fill="white" />
      <circle cx="18" cy="23" r="2" fill="#16171d" />
      <circle cx="32" cy="23" r="2" fill="#16171d" />
      <path d={mood === 'alert' ? 'M18 34h12' : 'M18 32c3 3 9 3 12 0'} stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export interface Ask {
  id: number
  text: string
}

export default function Assistant({ personaId, personaName, nudge, ask, onAction, shifted = false }: {
  ask?: Ask | null
  shifted?: boolean
  personaId: string
  personaName: string
  nudge: Nudge | null
  onAction: (action: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: `Здравствуйте, ${personaName}! Я Бит, помощник раздела «Старт». Подскажу, если с деньгами происходит что-то странное, и отвечу на вопросы.` },
  ])
  const [suggestions, setSuggestions] = useState(START_SUGGESTIONS)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [alert, setAlert] = useState(false)
  const [peek, setPeek] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Ассистент сам пишет в ключевые моменты: странное зачисление, перехват, итог сценария
  useEffect(() => {
    if (!nudge) return
    setMessages((m) => [...m, { role: 'bot', text: nudge.text }])
    if (nudge.suggestions) setSuggestions(nudge.suggestions)
    setAlert(true)
    if (!open) setPeek(nudge.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge?.id])

  // Вопрос «Спросить Бита» из окна сценария: открываем чат и сразу задаём его
  useEffect(() => {
    if (!ask) return
    setOpen(true)
    setPeek(null)
    setAlert(false)
    send(ask.text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, open])

  const send = async (text: string) => {
    if (!text.trim()) return
    if (text === 'Открыть «Безопасный выход»') return onAction('open_sos')
    if (text === 'Открыть проверку') return onAction('open_shield')
    const history = messages.map((m) => ({ role: m.role, text: m.text }))
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    try {
      const r = await api.assistant(personaId, text, history)
      setMessages((m) => [...m, { role: 'bot', text: r.reply }])
      setSuggestions(r.action === 'open_sos' ? ['Открыть «Безопасный выход»', ...r.suggestions.filter((s) => !s.startsWith('Открыть'))] : r.suggestions)
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Не получилось ответить — проверьте соединение с сервером.' }])
    } finally {
      setTyping(false)
    }
  }

  const toggle = () => {
    setOpen(!open)
    setPeek(null)
    setAlert(false)
  }

  return (
    <div className={`fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3 sm:bottom-7 ${shifted ? 'sm:right-[448px]' : 'sm:right-7'}`}>
      {open && (
        <div
          className="animate-rise flex h-[min(620px,calc(100vh-120px))] w-[min(400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[28px] bg-surface"
          style={{ boxShadow: 'var(--shadow-pop)' }}
        >
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <Mascot size={40} />
            <div className="flex-1">
              <div className="font-bold">Бит</div>
              <div className="text-xs text-muted">ИИ-помощник · отвечает сразу</div>
            </div>
            <button onClick={toggle} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Свернуть">
              <Icon name="close" size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-page/60 p-4">
            {messages.map((m, i) => (
              <div key={i} className={`animate-rise flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-[20px] px-4 py-2.5 text-[14.5px] leading-relaxed ${
                    m.role === 'user' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-surface'
                  }`}
                  style={m.role === 'bot' ? { boxShadow: 'var(--shadow-card)' } : undefined}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex gap-1 rounded-[20px] bg-surface px-4 py-3" style={{ width: 64, boxShadow: 'var(--shadow-card)' }}>
                {[0, 1, 2].map((k) => (
                  <span key={k} className="size-2 animate-bounce rounded-full bg-muted/50" style={{ animationDelay: `${k * 120}ms` }} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="chip shrink-0 border border-brand/25 bg-brand-soft text-[13px] text-brand hover:bg-brand hover:text-white">
                  {s}
                </button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input) }}>
              <input className="field py-2.5" placeholder="Задайте вопрос" value={input} onChange={(e) => setInput(e.target.value)} />
              <button className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white disabled:opacity-50" disabled={!input.trim()} aria-label="Отправить">
                <Icon name="send" size={19} />
              </button>
            </form>
          </div>
        </div>
      )}

      {peek && !open && (
        <button onClick={toggle} className="animate-rise max-w-[300px] rounded-[20px] rounded-br-md bg-surface p-4 text-left text-[14px] leading-snug" style={{ boxShadow: 'var(--shadow-pop)' }}>
          <div className="mb-1 text-xs font-bold text-brand">Бит</div>
          {peek.length > 150 ? peek.slice(0, 150) + '…' : peek}
        </button>
      )}

      <button onClick={toggle} className="relative transition hover:scale-105" aria-label="Открыть помощника">
        <span className="block rounded-[22px] bg-surface p-1.5" style={{ boxShadow: 'var(--shadow-pop)' }}>
          <Mascot size={52} mood={alert ? 'alert' : 'calm'} />
        </span>
        {alert && <span className="absolute -right-0.5 -top-0.5 size-4 animate-ping rounded-full bg-coral" />}
      </button>
    </div>
  )
}
