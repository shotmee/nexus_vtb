import { useState } from 'react'

import Icon from './Icon'

type Theme = 'light' | 'dark'

const current = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

// Переключатель светлой и тёмной темы. Начальную тему ставит скрипт в index.html (выбор или системная)
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(current)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      // приватный режим — тема просто не запомнится
    }
    setTheme(next)
  }

  return (
    <button
      onClick={toggle}
      className={`grid size-10 place-items-center rounded-full transition hover:bg-line ${className}`}
      aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
    </button>
  )
}
