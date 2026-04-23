import { useMemo } from 'react'
import type { Annotation } from './types'

interface ToolbarProps {
  mode: 'off' | 'annotating' | 'composing'
  multi: boolean
  multiCount: number
  pinCount: number
  connected: boolean
  annotations: Annotation[]
  currentRoute: string
  onJumpTo: (id: string) => void
  onDone: () => void
  onCancelMulti: () => void
  onCopy: () => void
  onClear: () => void
  onExit: () => void
}

export function Toolbar({
  mode,
  multi,
  multiCount,
  pinCount,
  connected,
  annotations,
  currentRoute,
  onJumpTo,
  onDone,
  onCancelMulti,
  onCopy,
  onClear,
  onExit,
}: ToolbarProps) {
  const modeLabel = multi
    ? `Multi · ${multiCount} selected`
    : mode === 'annotating'
      ? 'Annotation mode'
      : 'Composing'

  const grouped = useMemo(() => groupByRoute(annotations), [annotations])

  return (
    <div className="annotate-toolbar" role="toolbar" aria-label="Annotation controls">
      <div className="annotate-toolbar__row">
        <span className="annotate-dot" aria-hidden="true" />
        <span className="annotate-title">{modeLabel}</span>
        <span className="annotate-sub">
          · {pinCount} pin{pinCount === 1 ? '' : 's'}
        </span>
        {connected ? (
          <span
            className="annotate-sub"
            style={{ marginLeft: 'auto', color: 'var(--ann-accent)' }}
            title="Connected to MCP server"
          >
            ●
          </span>
        ) : null}
      </div>

      <div className="annotate-divider" />

      <div className="annotate-toolbar__row">
        {multi && multiCount > 0 ? (
          <>
            <button className="annotate-btn annotate-btn--primary" onClick={onDone}>
              Done ({multiCount})
            </button>
            <button className="annotate-btn" onClick={onCancelMulti}>
              Cancel
            </button>
          </>
        ) : (
          <span className="annotate-sub annotate-legend">
            <span className="annotate-kbd">↑</span>
            <span className="annotate-kbd">↓</span>
            <span className="annotate-kbd">←</span>
            <span className="annotate-kbd">→</span> select ·{' '}
            <span className="annotate-kbd">↵</span> pin ·{' '}
            Hold <span className="annotate-kbd">⇧</span> multi ·{' '}
            <span className="annotate-kbd">⎋</span> exit
          </span>
        )}
      </div>

      {annotations.length > 0 ? (
        <>
          <div className="annotate-divider" />
          <div className="annotate-list" role="list" aria-label="All annotations">
            {grouped.map(({ route, items }) => (
              <div
                key={route}
                className="annotate-list__group"
                data-current={route === currentRoute ? 'true' : 'false'}
              >
                <div className="annotate-list__heading">
                  <span className="annotate-list__route" title={route}>
                    {route}
                  </span>
                  <span className="annotate-list__count">{items.length}</span>
                </div>
                {items.map(({ ann, index }) => (
                  <button
                    key={ann.id}
                    type="button"
                    role="listitem"
                    className="annotate-list__item"
                    onClick={() => onJumpTo(ann.id)}
                    title={ann.comment || '(no comment)'}
                  >
                    <span className="annotate-list__idx">{index}</span>
                    <span className="annotate-list__comment">
                      {ann.comment || <em className="annotate-list__empty">(no comment)</em>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}

      <div className="annotate-divider" />

      <div className="annotate-toolbar__row">
        <button className="annotate-btn" onClick={onCopy} disabled={pinCount === 0}>
          Copy JSON
        </button>
        <button
          className="annotate-btn annotate-btn--danger"
          onClick={onClear}
          disabled={pinCount === 0}
        >
          Clear
        </button>
        <button
          className="annotate-btn annotate-btn--icon"
          onClick={onExit}
          aria-label="Exit annotation mode"
          title="Exit"
        >
          ×
        </button>
      </div>
    </div>
  )
}

interface Grouped {
  route: string
  items: Array<{ ann: Annotation; index: number }>
}

function groupByRoute(annotations: Annotation[]): Grouped[] {
  const map = new Map<string, Grouped>()
  annotations.forEach((ann, i) => {
    let group = map.get(ann.route)
    if (!group) {
      group = { route: ann.route, items: [] }
      map.set(ann.route, group)
    }
    // Index is the annotation's global number across all routes (matches the
    // number rendered on the in-page pin, so users see the same label here).
    group.items.push({ ann, index: i + 1 })
  })
  return Array.from(map.values())
}
