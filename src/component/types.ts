export type Confidence = 'high' | 'medium' | 'low'

export interface CapturedElement {
  selector: string
  confidence: Confidence
  tag: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
  path: string
}

export interface Annotation {
  id: string
  createdAt: number
  updatedAt: number
  comment: string
  pin: { x: number; y: number }
  elements: CapturedElement[]
  route: string
  viewport: { w: number; h: number }
}

export type Mode = 'off' | 'annotating' | 'composing'

export interface AnnotateConfig {
  enabled: boolean
  accent: string
  hotkey: string
  bridgePort: number
  storageKey: string
}
