import { type CSSProperties, useEffect, useState } from 'react'
import type { Annotation, CapturedElement } from './types'
import { resolveElement } from './use-selector'

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
  const tick = useViewportTick()

  return (
    <div className="annotate-highlight-layer" data-tick={tick}>
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
  const rect = el.getBoundingClientRect()
  return <div className="annotate-highlight annotate-highlight--hover" style={rectStyle(rect)} />
}

function SelectionBox({ el, index }: { el: Element; index: number }) {
  const rect = el.getBoundingClientRect()
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
  const rect = el.getBoundingClientRect()
  return (
    <div
      className="annotate-highlight annotate-highlight--saved"
      style={rectStyle(rect)}
    />
  )
}

function rectStyle(rect: DOMRect): CSSProperties {
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
    return () => {
      window.removeEventListener('scroll', bump, true)
      window.removeEventListener('resize', bump)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return tick
}
