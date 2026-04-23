/**
 * Rect helpers shared by the highlight and pin layers.
 *
 * The central piece is `clippedRect`: it returns an element's bounding rect
 * intersected with every ancestor that clips its overflow. When the element
 * is scrolled out of a clipping container, the returned rect is empty.
 */

const EMPTY: DOMRectLike = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }

export interface DOMRectLike {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

export function clippedRect(el: Element | null | undefined): DOMRectLike | null {
  if (!el || !el.isConnected) return null
  const base = el.getBoundingClientRect()
  if (base.width === 0 && base.height === 0) return null

  let clip: DOMRectLike = rectFromDOM(base)

  let cur: Element | null = el.parentElement
  while (cur && cur !== document.documentElement) {
    if (clipsOverflow(cur)) {
      const parentRect = cur.getBoundingClientRect()
      clip = intersect(clip, rectFromDOM(parentRect))
      if (clip.width <= 0 || clip.height <= 0) return null
    }
    cur = cur.parentElement
  }

  // Also clip to the viewport — pins anchored off-screen shouldn't render
  // their box on the opposite side of the page.
  const vw = window.innerWidth
  const vh = window.innerHeight
  clip = intersect(clip, { left: 0, top: 0, right: vw, bottom: vh, width: vw, height: vh })
  if (clip.width <= 0 || clip.height <= 0) return null
  return clip
}

export function isEffectivelyVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return false
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return false
  const cs = getComputedStyle(el)
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false
  return true
}

export function area(rect: DOMRectLike): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height)
}

export function centerDistance(a: DOMRectLike, b: DOMRectLike): number {
  const ax = a.left + a.width / 2
  const ay = a.top + a.height / 2
  const bx = b.left + b.width / 2
  const by = b.top + b.height / 2
  return Math.hypot(ax - bx, ay - by)
}

export function rectsAboutEqual(a: DOMRectLike, b: DOMRectLike, tol = 1.5): boolean {
  return (
    Math.abs(a.left - b.left) <= tol &&
    Math.abs(a.top - b.top) <= tol &&
    Math.abs(a.right - b.right) <= tol &&
    Math.abs(a.bottom - b.bottom) <= tol
  )
}

function clipsOverflow(el: Element): boolean {
  const cs = getComputedStyle(el)
  return (
    cs.overflow !== 'visible' ||
    cs.overflowX !== 'visible' ||
    cs.overflowY !== 'visible'
  )
}

function rectFromDOM(r: DOMRect): DOMRectLike {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  }
}

function intersect(a: DOMRectLike, b: DOMRectLike): DOMRectLike {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  if (right <= left || bottom <= top) return { ...EMPTY }
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}
