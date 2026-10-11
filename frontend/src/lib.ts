import type { RiskLevel, Transaction } from './api/types'

export const rub = (x: number) => `${Math.round(x).toLocaleString('ru-RU')} ₽`

export const signedRub = (t: Transaction) => `${t.direction === 'in' ? '+' : '−'}${rub(t.amount)}`

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  food: { label: 'Еда', color: '#ff9f43' },
  clothes: { label: 'Одежда', color: '#ff5fa2' },
  subscriptions: { label: 'Подписки', color: '#5b3df5' },
  fun: { label: 'Развлечения', color: '#3cc3f0' },
  transfers: { label: 'Переводы', color: '#22b07d' },
  other: { label: 'Остальное', color: '#b7bccb' },
}

export const categoryOf = (t: Transaction) => CATEGORIES[t.category ?? ''] ? t.category! : t.channel === 'sbp' ? 'transfers' : 'other'

export const RISK_LABEL: Record<RiskLevel, string> = { low: 'Низкий', medium: 'Средний', high: 'Высокий' }
export const RISK_COLOR: Record<RiskLevel, string> = {
  low: 'var(--color-risk-low)',
  medium: 'var(--color-risk-medium)',
  high: 'var(--color-risk-high)',
}

export const formatDate = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000)
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (diff === 0) return `Сегодня, ${time}`
  if (diff === 1) return `Вчера, ${time}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export const greeting = () => {
  const h = new Date().getHours()
  return h < 6 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер'
}

export const AVATAR_GRADIENT: Record<string, string> = {
  artem: 'linear-gradient(135deg, #5b3df5, #3cc3f0)',
  dima: 'linear-gradient(135deg, #ff6b5a, #ff5fa2)',
  katya: 'linear-gradient(135deg, #22b07d, #c8f135)',
  sonya: 'linear-gradient(135deg, #ff9f43, #ff5fa2)',
  lev: 'linear-gradient(135deg, #16171d, #5b3df5)',
}

// Файл → data URL (для скриншотов: Щит и доказательства)
export const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// Тема сценария каждого героя — на главной и в окне смены аккаунта
export const PERSONA_TAGS: Record<string, string> = {
  artem: 'Вербовка в дропы',
  dima: 'Угрозы после перевода',
  katya: 'Первая зарплата',
  sonya: 'Переход в 14 лет',
  lev: '«Пушкинская карта»',
}
