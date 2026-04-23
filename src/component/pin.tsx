import type { Annotation } from './types'

interface PinLayerProps {
  annotations: Annotation[]
  onPinClick: (id: string) => void
}

export function PinLayer({ annotations, onPinClick }: PinLayerProps) {
  return (
    <div className="annotate-pin-layer">
      {annotations.map((ann, i) => (
        <button
          key={ann.id}
          type="button"
          className="annotate-pin"
          style={{ left: ann.pin.x + 'px', top: ann.pin.y + 'px' }}
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
      ))}
    </div>
  )
}
