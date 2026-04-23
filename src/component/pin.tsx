import { useEffect, useState } from 'react'
import type { Annotation } from './types'
import { resolveElement } from './use-selector'
import { clippedRect } from './rect-utils'

interface PinLayerProps {
  annotations: Annotation[]
  onPinClick: (id: string) => void
}

export function PinLayer({ annotations, onPinClick }: PinLayerProps) {
  useViewportTick()

  return (
    <div className="annotate-pin-layer">
      {annotations.map((ann, i) => {
        const first = ann.elements[0]
        const el = first ? resolveElement(first) : null
        const rect = el ? clippedRect(el) : null
        if (!rect) return null
        // Anchor to the top-right of the element so the pin sits *on* the
        // thing it refers to and scrolls out with it.
        const x = rect.right - 2
        const y = rect.top + 2
        return (
          <button
            key={ann.id}
            type="button"
            className="annotate-pin"
            style={{ left: x + 'px', top: y + 'px' }}
            title={ann.comment || '(empty)'}
            onClick={(e) => {
              e.stopPropagation()
              onPinClick(ann.id)
            }}
            aria-label={`Annotation ${i + 1}: ${ann.comment || 'empty'}`}
          >
            <div className="annotate-pin__body">
              <span>{i + 1}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function useViewportTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let raf = 0
    const bump = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        setTick((t) => t + 1)
      })
    }
    window.addEventListener('scroll', bump, true)
    window.addEventListener('resize', bump)
    const mo = new MutationObserver(bump)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => {
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
      mo.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return tick
}
