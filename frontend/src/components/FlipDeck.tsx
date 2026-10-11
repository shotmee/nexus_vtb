import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface Slide {
  id: string
  label: string // для скринридера и точек навигации
  node: ReactNode
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

// Прокрутить страницу к экрану колоды (для кнопок шапки и CTA)
export function goToSlide(id: string) {
  const deck = document.getElementById('deck')
  const ids = deck?.dataset.slides?.split(',') ?? []
  const i = ids.indexOf(id)
  if (!deck || i < 0) return
  const total = deck.offsetHeight - window.innerHeight
  window.scrollTo({ top: deck.offsetTop + (total * i) / Math.max(1, ids.length - 1), behavior: 'smooth' })
}

// Вся страница — колода экранов. Пользователь прокручивает вниз, а экраны переворачиваются справа налево
// вокруг левого края, как страницы. Высота секции = N экранов, внутри — «липкий» экран.
export default function FlipDeck({ slides }: { slides: Slide[] }) {
  const ref = useRef<HTMLElement>(null)
  const n = slides.length
  const [progress, setProgress] = useState(0) // 0 … n-1
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = ref.current
      if (!el) return
      const total = el.offsetHeight - window.innerHeight
      const passed = clamp(-el.getBoundingClientRect().top, 0, total)
      setProgress(total > 0 ? (passed / total) * (n - 1) : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [n])

  const current = clamp(Math.round(progress), 0, n - 1)

  return (
    <section ref={ref} id="deck" data-slides={slides.map((s) => s.id).join(',')} style={{ height: `${n * 100}vh` }}>
      <div className="deck-stage sticky top-0 h-screen overflow-hidden">
        {slides.map((slide, i) => {
          // 0 — экран лежит, 1 — перевёрнут; в начале и конце каждого шага — пауза, чтобы экран можно было рассмотреть
          const turn = clamp((clamp(progress - i, 0, 1) - 0.12) / 0.76, 0, 1)
          const hidden = turn >= 1
          const style = reduced.current
            ? { opacity: 1 - turn, visibility: hidden ? ('hidden' as const) : undefined }
            : { transform: turn ? `rotateY(${-turn * 180}deg)` : undefined, visibility: hidden ? ('hidden' as const) : undefined }
          return (
            <div key={slide.id} className="deck-screen" style={{ zIndex: n - i, ...style }} aria-hidden={i !== current} aria-label={slide.label}>
              <div className="deck-content">{slide.node}</div>
              {turn > 0 && <div className="deck-shade" style={{ opacity: Math.sin(turn * Math.PI) * 0.3 }} />}
            </div>
          )
        })}
        <nav className="deck-dots" aria-label="Экраны">
          {slides.map((s, i) => (
            <button key={s.id} onClick={() => goToSlide(s.id)} className={i === current ? 'is-on' : ''} aria-label={s.label} aria-current={i === current} />
          ))}
        </nav>
      </div>
    </section>
  )
}
