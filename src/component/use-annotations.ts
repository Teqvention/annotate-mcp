import { useCallback, useEffect, useRef, useState } from 'react'
import type { Annotation } from './types'

function nanoid(): string {
  return (
    'ann_' +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  )
}

export function useAnnotations(storageKey: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>(() => load(storageKey))
  const undoRef = useRef<{ ann: Annotation; idx: number } | null>(null)

  const persist = useCallback(
    (next: Annotation[]) => {
      setAnnotations(next)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next))
      } catch {
        // quota, ignore
      }
      if (typeof window !== 'undefined') {
        ;(window as unknown as { __annotations: Annotation[] }).__annotations = next
      }
    },
    [storageKey],
  )

  const create = useCallback(
    (draft: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = Date.now()
      const ann: Annotation = { ...draft, id: nanoid(), createdAt: now, updatedAt: now }
      persist([...annotations, ann])
      return ann
    },
    [annotations, persist],
  )

  const update = useCallback(
    (id: string, patch: Partial<Pick<Annotation, 'comment'>>) => {
      persist(
        annotations.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a,
        ),
      )
    },
    [annotations, persist],
  )

  const remove = useCallback(
    (id: string) => {
      const idx = annotations.findIndex((a) => a.id === id)
      if (idx < 0) return
      undoRef.current = { ann: annotations[idx]!, idx }
      persist(annotations.filter((a) => a.id !== id))
    },
    [annotations, persist],
  )

  const undoRemove = useCallback(() => {
    if (!undoRef.current) return
    const next = [...annotations]
    next.splice(undoRef.current.idx, 0, undoRef.current.ann)
    undoRef.current = null
    persist(next)
  }, [annotations, persist])

  const clearAll = useCallback(() => {
    persist([])
  }, [persist])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as unknown as { __annotations: Annotation[] }).__annotations = annotations
    }
  }, [annotations])

  return { annotations, create, update, remove, undoRemove, clearAll }
}

function load(key: string): Annotation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as Annotation[]) : []
  } catch {
    return []
  }
}
