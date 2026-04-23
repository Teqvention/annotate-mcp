export type Confidence = 'high' | 'medium' | 'low'

export interface AncestorNode {
  tag: string
  /** Readable class names (Tailwind utilities, BEM, etc.) — useful for code grep. */
  classes: string[]
  ariaLabel: string | null
  role: string | null
  /** Compact map of data-* attributes excluding auto-generated noise. */
  data: Record<string, string>
  /** Direct text content of this element (not descendants). */
  ownText: string
}

export interface CapturedElement {
  selector: string
  confidence: Confidence
  tag: string
  text: string
  rect: { x: number; y: number; width: number; height: number }
  path: string
  /** Ancestor chain from the captured element up to (but not including) <body>. */
  ancestors: AncestorNode[]
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
