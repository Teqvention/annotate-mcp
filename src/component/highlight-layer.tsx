import { type CSSProperties, useEffect, useState } from 'react'
import type { Annotation, CapturedElement } from './types'
import { resolveElement } from './use-selector'
import { clippedRect, type DOMRectLike } from './rect-utils'

interface HighlightLayerProps {
  annotations: Annotation[]
  hoverEl: Element | null
  multiSelection: Element[]
  composing: boolean
}

export function HighlightLayer({
  annotations,
  hoverEl,
  multiSelection,
  composing,
}: HighlightLayerProps) {
  // Re-render on scroll/resize/DOM mutation so highlights track their
  // elements (and clip correctly when scrolled out of overflow:hidden
  // containers).
  useViewportTick()

  return (
    <div className="annotate-highlight-layer">
      {hoverEl && !composing ? <HoverBox el={hoverEl} /> : null}
      {multiSelection.map((el, i) => (
        <SelectionBox key={i} el={el} index={i + 1} />
      ))}
      {annotations.flatMap((ann) =>
        ann.elements.map((elData, i) => (
          <SavedBox key={`${ann.id}-${i}`} elData={elData} />
        )),
      )}
    </div>
  )
}

function HoverBox({ el }: { el: Element }) {
  const rect = clippedRect(el)
  if (!rect) return null
  return <div className="annotate-highlight annotate-highlight--hover" style={rectStyle(rect)} />
}

function SelectionBox({ el, index }: { el: Element; index: number }) {
  const rect = clippedRect(el)
  if (!rect) return null
  return (
    <>
      <div className="annotate-highlight" style={rectStyle(rect)} />
      <div
        className="annotate-chip"
        style={{ left: rect.left + 'px', top: rect.top + 'px' }}
      >
        {index}
      </div>
    </>
  )
}

function SavedBox({ elData }: { elData: CapturedElement }) {
  const el = resolveElement(elData)
  if (!el) return null
  const rect = clippedRect(el)
  if (!rect) return null
  return (
    <div
      className="annotate-highlight annotate-highlight--saved"
      style={rectStyle(rect)}
    />
  )
}

function rectStyle(rect: DOMRectLike): CSSProperties {
  return {
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  }
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
    // DOM changes (collapse/expand, virtualized lists) can shift rects too.
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
