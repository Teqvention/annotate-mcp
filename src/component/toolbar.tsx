interface ToolbarProps {
  mode: 'off' | 'annotating' | 'composing'
  multi: boolean
  multiCount: number
  pinCount: number
  connected: boolean
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
