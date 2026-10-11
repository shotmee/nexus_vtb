import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'
import type { Persona } from '../api/types'
import { AVATAR_GRADIENT, PERSONA_TAGS } from '../lib'
import Icon from './Icon'
import Modal from './Modal'

// Быстрая смена героя из кабинета: список всех доступных аккаунтов, вход — с чистого листа, как с главной
export default function AccountSwitcher({ currentId, onClose }: { currentId: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    api.personas().then(setPersonas).catch(() => setPersonas([]))
  }, [])

  const open = async (id: string) => {
    if (id === currentId) return onClose()
    setBusy(id)
    await api.resetPersona(id).catch(() => null)
    onClose()
    navigate(`/u/${id}`)
  }

  return (
    <Modal title="Сменить аккаунт" onClose={onClose}>
      <ul className="grid gap-2">
        {personas.map((p) => {
          const current = p.id === currentId
          return (
            <li key={p.id}>
              <button
                onClick={() => open(p.id)}
                disabled={busy !== null}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-3.5 text-left transition ${current ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand/40 hover:bg-page'}`}
                aria-current={current}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white" style={{ background: AVATAR_GRADIENT[p.id] }}>
                  {p.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{p.name}, {p.age}</span>
                  <span className="block truncate text-sm text-muted">{PERSONA_TAGS[p.id] ?? p.description}</span>
                </span>
                {current ? (
                  <span className="chip shrink-0 bg-surface px-2.5 py-1 text-xs font-semibold text-brand">Сейчас</span>
                ) : busy === p.id ? (
                  <span className="shrink-0 text-sm text-muted">Входим…</span>
                ) : (
                  <Icon name="chevron" className="shrink-0 text-muted" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <button onClick={() => { onClose(); navigate('/') }} className="btn-ghost mt-4 w-full">
        <Icon name="back" size={17} /> На главную
      </button>
    </Modal>
  )
}
