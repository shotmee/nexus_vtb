import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { Lesson, Persona, Progress } from '../api/types'
import { AVATAR_GRADIENT } from '../lib'
import Icon from './Icon'
import Modal from './Modal'
import StoryArt, { storyBackground } from './StoryArt'

export default function ProfileModal({ persona, progress, stories, onClose, onOpenStory, onOpenQuest }: {
  persona: Persona
  progress: Progress
  stories: Lesson[]
  onClose: () => void
  onOpenStory: (index: number) => void
  onOpenQuest: () => void
}) {
  const done = new Set(progress.done)
  const lessonsDone = stories.filter((s) => done.has(`lesson:${s.id}`)).length
  const minor = persona.age < 18
  // Настройки безопасности — только демонстрация, в банк не отправляются
  const [settings, setSettings] = useState({ pauseStrangers: true, parentSignal: minor })

  const badges = [
    { id: 'first', icon: 'book', title: 'Первые шаги', text: 'Пройти первую историю', got: lessonsDone > 0 },
    { id: 'all', icon: 'star', title: 'Знаток', text: 'Пройти все истории', got: stories.length > 0 && lessonsDone === stories.length },
    { id: 'quest', icon: 'shield', title: 'Не на того напали', text: 'Хороший финал квеста', got: done.has('quest:drop_job') },
    { id: 'exit', icon: 'lifebuoy', title: 'Безопасный выход', text: 'Пройти все шаги выхода из схемы', got: done.has('action:safe_exit') },
  ]

  return (
    <Modal onClose={onClose} width="max-w-[640px]" title="Профиль">
      <div className="flex items-center gap-4">
        <div className="grid size-16 place-items-center rounded-3xl text-3xl font-extrabold text-white" style={{ background: AVATAR_GRADIENT[persona.id] }}>
          {persona.name[0]}
        </div>
        <div className="flex-1">
          <div className="text-2xl font-extrabold">{persona.name}, {persona.age}</div>
          <div className="text-sm text-muted">{persona.description}</div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #5b3df5, #ff5fa2)' }}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-sm text-white/75">Уровень</div>
            <div className="text-[44px] font-extrabold leading-none">{progress.level}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{progress.xp} XP</div>
            <div className="text-sm text-white/75">до уровня {progress.level + 1}: {100 - (progress.xp % 100)} XP</div>
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${progress.xp % 100}%` }} />
        </div>
      </div>

      <h3 className="mt-7 text-lg font-bold">Бейджи</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <div key={b.id} className={`rounded-2xl border p-3.5 text-center transition ${b.got ? 'border-brand/30 bg-brand-soft' : 'border-line opacity-55 grayscale'}`}>
            <div className={`mx-auto grid size-12 place-items-center rounded-2xl ${b.got ? 'bg-brand text-white' : 'bg-page text-muted'}`}>
              <Icon name={b.icon} size={22} />
            </div>
            <div className="mt-2 text-[14px] font-bold leading-tight">{b.title}</div>
            <div className="mt-0.5 text-xs leading-snug text-muted">{b.text}</div>
          </div>
        ))}
      </div>

      <h3 className="mt-7 text-lg font-bold">Истории · {lessonsDone} из {stories.length}</h3>
      <div className="mt-3 space-y-2">
        {stories.map((s, i) => {
          const seen = done.has(`lesson:${s.id}`)
          return (
            <button key={s.id} onClick={() => onOpenStory(i)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-page">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl" style={{ background: storyBackground(s.id) }}>
                <StoryArt id={s.id} uid="profile" className="absolute inset-0 size-full" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{s.short}</div>
                <div className="text-xs text-muted">{s.title}</div>
              </div>
              {seen ? (
                <span className="chip bg-risk-low/10 text-[13px] text-ok"><Icon name="check" size={14} /> +{s.xp} XP</span>
              ) : (
                <span className="chip bg-page text-[13px] text-muted">+{s.xp} XP</span>
              )}
            </button>
          )
        })}
        <button onClick={onOpenQuest} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-page">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-night text-lime"><Icon name="chat" size={22} /></div>
          <div className="flex-1">
            <div className="font-semibold">Квест «А что было бы, если…»</div>
            <div className="text-xs text-muted">Переписка с вербовщиком, четыре финала</div>
          </div>
          {done.has('quest:drop_job') ? (
            <span className="chip bg-risk-low/10 text-[13px] text-ok"><Icon name="check" size={14} /> +50 XP</span>
          ) : (
            <span className="chip bg-page text-[13px] text-muted">+50 XP</span>
          )}
        </button>
      </div>

      <h3 className="mt-7 text-lg font-bold">Безопасность</h3>
      <div className="mt-3 divide-y divide-line rounded-2xl border border-line">
        <Toggle
          on={settings.pauseStrangers}
          onChange={(v) => setSettings({ ...settings, pauseStrangers: v })}
          title="Пауза для денег от незнакомцев"
          text="Крупные зачисления от новых отправителей нельзя сразу переслать дальше"
        />
        {minor && (
          <Toggle
            on={settings.parentSignal}
            onChange={(v) => setSettings({ ...settings, parentSignal: v })}
            title="Сигнал родителю при высоком риске"
            text="Родитель получит только уведомление о риске — без доступа к переписке и тратам"
          />
        )}
      </div>

      <Link to="/" className="btn-ghost mt-6 w-full">
        <Icon name="logout" size={18} /> Сменить аккаунт
      </Link>
    </Modal>
  )
}

function Toggle({ on, onChange, title, text }: { on: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 p-4">
      <span className="flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-muted">{text}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-brand' : 'bg-line'}`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-surface shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  )
}
