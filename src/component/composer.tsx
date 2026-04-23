import { useEffect, useRef, type CSSProperties } from 'react'
import type { CapturedElement } from './types'

interface ComposerProps {
  pin: { x: number; y: number }
  elements: CapturedElement[]
  initialComment: string
  indexLabel: number
  editing: boolean
  onSave: (comment: string) => void
  onCancel: () => void
  onDelete?: () => void
}

export function Composer({
  pin,
  elements,
  initialComment,
  indexLabel,
  editing,
  onSave,
  onCancel,
  onDelete,
}: ComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const style = useComposerPosition(pin, wrapRef)

  useEffect(() => {
    taRef.current?.focus()
  }, [])

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onSave(taRef.current?.value ?? '')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  const headerTitle =
    elements.length === 1
      ? formatSingle(elements[0]!)
      : `${elements.length} elements`

  return (
    <div ref={wrapRef} className="annotate-composer" style={style} role="dialog" aria-label="Annotation composer">
      <div className="annotate-composer__header">
        <span className="annotate-composer__badge">{indexLabel}</span>
        <span className="annotate-composer__title">{headerTitle}</span>
      </div>

      <div className="annotate-composer__elements">
        {elements.map((e, i) => (
          <div key={i} className="annotate-composer__element">
            <span className={`annotate-confidence annotate-confidence--${e.confidence}`} />
            <span>{truncate(e.selector, 56)}</span>
          </div>
        ))}
      </div>

      <textarea
        ref={taRef}
        className="annotate-composer__textarea"
        placeholder="What's wrong here?"
        defaultValue={initialComment}
        rows={3}
        onKeyDown={handleKey}
      />

      <div className="annotate-composer__footer">
        <span className="annotate-composer__hint">
          <span className="annotate-kbd">⌘↵</span> save
        </span>
        <div className="annotate-composer__actions">
          {editing && onDelete ? (
            <button
              className="annotate-btn-light annotate-btn-light--danger"
              onClick={onDelete}
              type="button"
            >
              Delete
            </button>
          ) : null}
          <button className="annotate-btn-light" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="annotate-btn-filled"
            onClick={() => onSave(taRef.current?.value ?? '')}
            type="button"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  )
}

function useComposerPosition(
  pin: { x: number; y: number },
  ref: React.RefObject<HTMLDivElement | null>,
): CSSProperties {
  const style: CSSProperties = {
    left: pin.x + 8 + 'px',
    top: pin.y + 'px',
  }
  // measure after mount to clamp into viewport
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (pin.x + rect.width + 24 > vw) {
      el.style.left = Math.max(12, pin.x - rect.width - 8) + 'px'
    }
    if (pin.y + rect.height + 24 > vh) {
      el.style.top = Math.max(12, vh - rect.height - 20) + 'px'
    }
  }, [pin.x, pin.y, ref])
  return style
}

function formatSingle(el: CapturedElement): string {
  const tag = `<${el.tag}>`
  if (el.text) return `${tag} · "${truncate(el.text, 28)}"`
  return tag
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
