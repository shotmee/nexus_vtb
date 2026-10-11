import type { ReactNode } from 'react'
import { useEffect } from 'react'

import Icon from './Icon'

interface Props {
  title?: ReactNode
  onClose: () => void
  onBack?: () => void
  children: ReactNode
  width?: string
  tone?: 'default' | 'danger'
}

export default function Modal({ title, onClose, onBack, children, width = 'max-w-[520px]', tone = 'default' }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="animate-fade fixed inset-0 z-40 flex items-end justify-center bg-night/40 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        className={`animate-rise max-h-[92vh] w-full ${width} overflow-y-auto rounded-t-[32px] bg-surface p-6 sm:rounded-[32px] sm:p-8 ${tone === 'danger' ? 'ring-4 ring-risk-high/15' : ''}`}
        style={{ boxShadow: 'var(--shadow-pop)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Назад">
              <Icon name="back" size={18} />
            </button>
          )}
          <h2 className="flex-1 text-[22px] font-bold leading-tight">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-page hover:bg-line" aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
