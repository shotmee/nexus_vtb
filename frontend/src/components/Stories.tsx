import { useEffect, useRef, useState } from 'react'

import type { Lesson } from '../api/types'
import Icon from './Icon'
import StoryArt, { storyBackground } from './StoryArt'

const SLIDE_MS = 7000

// Ряд сторис на главной — квадратные плитки с картинкой и заголовком.
export function StoriesRow({ stories, done, onOpen, onOpenQuest, questDone = false }: {
  stories: Lesson[]
  done: Set<string>
  onOpen: (index: number) => void
  onOpenQuest?: () => void
  questDone?: boolean
}) {
  // Полосы прокрутки нет — на компьютере листаем стрелками по краям, они видны, только когда есть куда листать
  const row = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  const measure = () => {
    const el = row.current
    if (el) setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [stories.length])
  const scroll = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.7, behavior: 'smooth' })

  return (
    <div className="relative">
      {edges.left && (
        <button onClick={() => scroll(-1)} className="absolute -left-5 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface text-ink sm:grid" style={{ boxShadow: 'var(--shadow-pop)' }} aria-label="Предыдущие истории">
          <Icon name="back" />
        </button>
      )}
      {edges.right && (
        <button onClick={() => scroll(1)} className="absolute -right-5 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-surface text-ink sm:grid" style={{ boxShadow: 'var(--shadow-pop)' }} aria-label="Следующие истории">
          <Icon name="chevron" />
        </button>
      )}
      <div ref={row} onScroll={measure} className="no-scrollbar -mx-4 flex gap-3.5 overflow-x-auto px-4 pb-2 pt-1 sm:mx-0 sm:px-0">
      {onOpenQuest && (
        <button
          onClick={onOpenQuest}
          className={`animate-rise group relative shrink-0 rounded-[30px] p-[3px] transition hover:-translate-y-0.5 ${questDone ? 'bg-line' : 'bg-gradient-to-br from-lime via-sky to-brand'}`}
          aria-label="Квест «А что было бы, если…»"
        >
          <div className="relative size-[148px] overflow-hidden rounded-[27px] border-[3px] border-page sm:size-[164px]" style={{ background: storyBackground('quest') }}>
            <StoryArt id="quest" uid="tile" className="absolute -right-3 -top-2 size-[118px] transition duration-300 group-hover:scale-110 sm:size-[130px]" />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-lime px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink">Квест</span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3.5 pt-8 text-left text-[16px] font-bold leading-tight text-white">
              А что было бы, если…
            </div>
          </div>
        </button>
      )}
      {stories.map((s, i) => {
        const seen = done.has(`lesson:${s.id}`)
        return (
          <button
            key={s.id}
            onClick={() => onOpen(i)}
            className={`animate-rise group relative shrink-0 rounded-[30px] p-[3px] transition hover:-translate-y-0.5 ${seen ? 'bg-line' : 'bg-gradient-to-br from-brand via-pink to-lime'}`}
            style={{ animationDelay: `${i * 50}ms` }}
            aria-label={s.short}
          >
            <div className="relative size-[148px] overflow-hidden rounded-[27px] border-[3px] border-page sm:size-[164px]" style={{ background: storyBackground(s.id) }}>
              <StoryArt id={s.id} uid="tile" className="absolute -right-4 -top-3 size-[118px] transition duration-300 group-hover:scale-110 sm:size-[130px]" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3.5 pt-8 text-left text-[16px] font-bold leading-tight text-white">
                {s.short}
              </div>
              {seen && (
                <span className="absolute left-2.5 top-2.5 grid size-6 place-items-center rounded-full bg-white/90 text-risk-low">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              )}
            </div>
          </button>
        )
      })}
      </div>
    </div>
  )
}

// Полноэкранный просмотр: карточки → вопрос → награда. Переход к следующей сторис в конце.
export function StoryViewer({ stories, start, done, onClose, onFinish, onAction }: {
  stories: Lesson[]
  start: number
  done: Set<string>
  onClose: () => void
  onFinish: (lesson: Lesson) => Promise<number>
  onAction: (action: string) => void
}) {
  const [si, setSi] = useState(start)
  const [ci, setCi] = useState(0)
  const [answer, setAnswer] = useState<number | null>(null)
  const [gained, setGained] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const story = stories[si]
  const slides = story.cards.length + (story.quiz ? 1 : 0) + 1 // + финальный слайд с наградой
  const isQuiz = story.quiz && ci === story.cards.length
  const isFinal = ci === slides - 1
  const auto = !isQuiz && !isFinal

  const goStory = (k: number) => {
    if (k < 0) return
    if (k >= stories.length) return onClose()
    setSi(k)
    setCi(0)
    setAnswer(null)
    setGained(null)
  }
  const next = () => (ci < slides - 1 ? setCi(ci + 1) : goStory(si + 1))
  const prev = () => (ci > 0 ? setCi(ci - 1) : goStory(si - 1))

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (auto) timer.current = window.setTimeout(next, SLIDE_MS)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [si, ci, auto])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // На финальном слайде начисляем XP (сервер даёт его один раз)
  useEffect(() => {
    if (isFinal && gained === null) onFinish(story).then(setGained)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal, si])

  const correct = answer !== null && story.quiz && answer === story.quiz.answer
  const already = done.has(`lesson:${story.id}`) && gained === 0

  return (
    <div role="dialog" aria-modal="true" aria-label={story.title} data-viewer="story" className="animate-fade fixed inset-0 z-50 flex items-center justify-center bg-black/85">
      <button onClick={() => goStory(si - 1)} disabled={si === 0} className="mr-6 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 md:grid" aria-label="Предыдущая история">
        <Icon name="back" />
      </button>

      <div
        key={story.id}
        className="animate-rise relative flex h-full w-full flex-col overflow-hidden text-white sm:h-[min(860px,94vh)] sm:w-[min(460px,94vw)] sm:rounded-[36px]"
        style={{ background: storyBackground(story.id) }}
      >
        {/* Прогресс */}
        <div className="relative z-10 flex gap-1.5 px-5 pt-5">
          {Array.from({ length: slides }).map((_, k) => (
            <span key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                key={`${si}-${ci}-${k}`}
                className="block h-full rounded-full bg-white"
                style={
                  k < ci || (k === ci && !auto)
                    ? { width: '100%' }
                    : k === ci
                      ? { width: '100%', animation: `grow ${SLIDE_MS}ms linear` }
                      : { width: '0%' }
                }
              />
            </span>
          ))}
        </div>
        <div className="relative z-10 flex items-center justify-between px-5 pt-4">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-semibold backdrop-blur">
            {story.short} · +{story.xp} XP
          </span>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white text-ink" aria-label="Закрыть">
            <Icon name="close" size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Картинка */}
        <div className="relative flex flex-1 items-center justify-center">
          <StoryArt id={story.id} uid="viewer" className={`w-[78%] max-w-[330px] transition duration-500 ${isQuiz || isFinal ? 'scale-75 opacity-60' : ''}`} />
          {/* Зоны нажатия: слева — назад, справа — вперёд */}
          {!isQuiz && !isFinal && (
            <>
              <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="Назад" />
              <button className="absolute inset-y-0 right-0 w-2/3" onClick={next} aria-label="Дальше" />
            </>
          )}
        </div>

        {/* Текст */}
        <div key={`${si}-${ci}`} className="animate-rise relative z-10 px-6 pb-7 sm:px-8 sm:pb-8">
          {!isQuiz && !isFinal && (
            <>
              <h2 className="text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[38px]">{story.cards[ci].title}</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-white/85">{story.cards[ci].text}</p>
              <button onClick={next} className="btn mt-6 w-full bg-white text-[#16171d] hover:bg-white/90">Дальше</button>
            </>
          )}

          {isQuiz && story.quiz && (
            <>
              <div className="text-sm font-semibold uppercase tracking-wide text-white/60">Проверьте себя</div>
              <h2 className="mt-1 text-[26px] font-extrabold leading-tight">{story.quiz.question}</h2>
              <div className="mt-5 grid gap-2">
                {story.quiz.options.map((o, k) => {
                  const state =
                    answer === null ? 'bg-white/12 hover:bg-white/20' : k === story.quiz!.answer ? 'bg-risk-low text-white' : k === answer ? 'bg-risk-high text-white' : 'bg-white/8 opacity-50'
                  return (
                    <button key={o} disabled={answer !== null} onClick={() => setAnswer(k)} className={`rounded-2xl px-4 py-3.5 text-left text-[16px] font-semibold transition ${state}`}>
                      {o}
                    </button>
                  )
                })}
              </div>
              {answer !== null && (
                <>
                  <p className="animate-fade mt-3 text-[15px] text-white/80">{correct ? 'Верно.' : 'Не совсем — правильный ответ подсвечен зелёным.'}</p>
                  <button onClick={next} className="btn mt-4 w-full bg-lime text-ink">Дальше</button>
                </>
              )}
            </>
          )}

          {isFinal && (
            <div className="text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-[26px] bg-lime text-ink" style={{ boxShadow: '0 0 60px rgb(200 241 53 / 0.5)' }}>
                <Icon name="star" size={38} strokeWidth={2.2} />
              </div>
              <h2 className="mt-5 text-[30px] font-extrabold leading-tight">
                {gained === null ? 'Считаем…' : already ? 'Уже пройдено' : `+${gained} XP`}
              </h2>
              <p className="mt-2 text-[16px] text-white/75">
                {already ? 'Очки за эту историю вы уже получили.' : 'История пройдена. Очки добавлены к вашему уровню.'}
              </p>
              <div className="mt-6 grid gap-2">
                {story.cta && (
                  <button onClick={() => { onClose(); onAction(story.cta!.action) }} className="btn w-full bg-white text-ink">
                    {story.cta.label}
                  </button>
                )}
                {si < stories.length - 1 ? (
                  <button onClick={() => goStory(si + 1)} className="btn w-full bg-lime text-ink">
                    Следующая: {stories[si + 1].short}
                  </button>
                ) : (
                  <button onClick={onClose} className="btn w-full bg-lime text-ink">Готово</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => goStory(si + 1)} disabled={si === stories.length - 1} className="ml-6 hidden size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-0 md:grid" aria-label="Следующая история">
        <Icon name="chevron" />
      </button>
    </div>
  )
}
