import { useEffect, useRef, useState } from 'react'

import type { Quest, QuestNode } from '../api/types'
import Icon from './Icon'

interface Line {
  from: 'them' | 'me' | 'bank' | 'narrator'
  text: string
  ending?: 'good' | 'bad'
}

// Квест «А что было бы, если…»: переписка с вербовщиком, ответы выбирает пользователь.
export default function QuestModal({ quest, onClose, onFinish }: {
  quest: Quest
  onClose: () => void
  onFinish: (good: boolean) => Promise<number>
}) {
  const byId = Object.fromEntries(quest.nodes.map((n) => [n.id, n])) as Record<string, QuestNode>
  const [lines, setLines] = useState<Line[]>([])
  const [node, setNode] = useState<QuestNode | null>(null)
  const [typing, setTyping] = useState(false)
  const [gained, setGained] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const run = useRef(0) // номер прохождения: отложенные реплики старого прохода игнорируем

  const show = (n: QuestNode) => {
    const id = run.current
    setTyping(true)
    window.setTimeout(() => {
      if (id !== run.current) return
      setTyping(false)
      const from = n.speaker === 'recruiter' ? 'them' : n.speaker
      setLines((l) => [...l, { from, text: n.text, ending: n.ending }])
      setNode(n)
      if (n.ending) onFinish(n.ending === 'good').then(setGained)
    }, n.speaker === 'recruiter' ? 900 : 500)
  }

  const restart = () => {
    run.current += 1
    setLines([])
    setGained(null)
    setNode(null)
    show(byId[quest.start])
  }

  useEffect(() => {
    restart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines, typing])

  const choose = (text: string, next: string) => {
    setLines((l) => [...l, { from: 'me', text }])
    setNode(null)
    show(byId[next])
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={quest.title} data-viewer="quest" className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/70 sm:p-6" onClick={onClose}>
      <div
        className="animate-rise flex h-full w-full flex-col overflow-hidden bg-chat sm:h-[min(820px,94vh)] sm:max-w-[460px] sm:rounded-[32px]"
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-surface px-5 py-4">
          <span className="grid size-10 place-items-center rounded-full bg-night text-white">
            <Icon name="chat" size={18} />
          </span>
          <div className="flex-1">
            <div className="font-bold">Работа | Подработка</div>
            <div className="text-xs text-muted">{typing ? 'печатает…' : 'Квест · ' + quest.title}</div>
          </div>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
          <div className="mx-auto max-w-[90%] rounded-2xl bg-surface/70 p-3 text-center text-[13px] text-muted">{quest.intro}</div>
          {lines.map((l, i) => {
            if (l.from === 'me')
              return (
                <div key={i} className="animate-rise flex justify-end">
                  <div className="max-w-[80%] rounded-[18px] rounded-br-md bg-bubble px-3.5 py-2 text-[15px]">{l.text}</div>
                </div>
              )
            if (l.from === 'them')
              return (
                <div key={i} className="animate-rise flex">
                  <div className="max-w-[80%] rounded-[18px] rounded-bl-md bg-surface px-3.5 py-2 text-[15px]" style={{ boxShadow: '0 1px 1px rgb(0 0 0 / 0.06)' }}>{l.text}</div>
                </div>
              )
            if (l.from === 'bank')
              return (
                <div key={i} className="animate-rise flex gap-3 rounded-2xl border-l-4 border-risk-high bg-surface p-3.5 text-[14px]">
                  <Icon name="alert" size={20} className="shrink-0 text-risk-high" />
                  <div><div className="text-xs font-bold text-risk-high">Уведомление банка</div>{l.text}</div>
                </div>
              )
            const good = l.ending === 'good'
            return (
              <div
                key={i}
                className={`animate-rise rounded-3xl p-5 ${l.ending ? 'text-white' : 'bg-surface text-[14px] text-muted'}`}
                style={l.ending ? { background: good ? 'linear-gradient(135deg, #22b07d, #3cc3f0)' : 'linear-gradient(135deg, #f0443a, #ff5fa2)' } : undefined}
              >
                {l.ending && <div className="text-lg font-extrabold">{good ? 'Хороший финал' : 'Плохой финал'}</div>}
                <p className={l.ending ? 'mt-1 text-[15px] text-white/90' : ''}>{l.text}</p>
              </div>
            )
          })}
          {typing && (
            <div className="flex w-16 gap-1 rounded-[18px] bg-surface px-4 py-3">
              {[0, 1, 2].map((k) => <span key={k} className="size-2 animate-bounce rounded-full bg-muted/50" style={{ animationDelay: `${k * 120}ms` }} />)}
            </div>
          )}
        </div>

        <div className="space-y-2 bg-surface p-4">
          {node && !node.ending && node.choices.map((c) => (
            <button key={c.next + c.text} onClick={() => choose(c.text, c.next)} className="w-full rounded-2xl border-2 border-brand/20 bg-brand-soft px-4 py-3 text-left text-[15px] font-semibold text-brand transition hover:bg-brand hover:text-white">
              {c.text}
            </button>
          ))}
          {node?.ending && (
            <>
              {node.ending === 'good' && gained !== null && (
                <div className="text-center text-sm font-semibold text-ok">
                  {gained ? `+${gained} XP и бейдж «Не на того напали»` : 'Квест уже пройден — очки получены раньше'}
                </div>
              )}
              <button onClick={restart} className="btn-ghost w-full"><Icon name="reset" size={17} /> Пройти ещё раз</button>
              <button onClick={onClose} className="btn-primary w-full">Готово</button>
            </>
          )}
          {!node && <div className="py-3 text-center text-sm text-muted">…</div>}
        </div>
      </div>
    </div>
  )
}
