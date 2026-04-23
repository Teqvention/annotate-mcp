/**
 * Meaningful element navigation used by the arrow-key selector.
 *
 * Naive `el.parentElement` / `el.firstElementChild` walk into every wrapper
 * div and feel random. These helpers skip wrappers that don't change what
 * the user sees — so each keystroke moves to a visually distinct box.
 */

import { area, centerDistance, isEffectivelyVisible, rectsAboutEqual } from './rect-utils'

/**
 * Up: walk to the first ancestor whose rect is visibly bigger than `el`.
 * Skips "display: contents" parents and transparent wrappers that add no
 * visible bounds.
 */
export function parentMeaningful(el: Element): Element | null {
  const baseRect = el.getBoundingClientRect()
  let cur: Element | null = el.parentElement
  while (cur && cur !== document.body) {
    if (insideAnnotateRoot(cur)) return null
    const cs = getComputedStyle(cur)
    if (cs.display === 'contents') {
      cur = cur.parentElement
      continue
    }
    const r = cur.getBoundingClientRect()
    if (!rectsAboutEqual(r, baseRect)) return cur
    cur = cur.parentElement
  }
  // Reached <body> — still a useful stop.
  return cur === document.body ? cur : null
}

/**
 * Down: pick the most meaningful child.
 *  - If exactly one visible child, take it.
 *  - Otherwise, take the child with the largest visible area; tie-break by
 *    the child whose center is closest to the parent's center.
 */
export function childMeaningful(el: Element): Element | null {
  const visible = visibleChildren(el)
  if (visible.length === 0) return null
  if (visible.length === 1) return visible[0]!

  const parentRect = el.getBoundingClientRect()
  let best: Element | null = null
  let bestArea = -1
  let bestDist = Infinity
  for (const child of visible) {
    const r = child.getBoundingClientRect()
    const a = area(r)
    if (a > bestArea + 4) {
      best = child
      bestArea = a
      bestDist = centerDistance(r, parentRect)
    } else if (Math.abs(a - bestArea) <= 4) {
      // Similar area — prefer the one closer to the parent's center.
      const d = centerDistance(r, parentRect)
      if (d < bestDist) {
        best = child
        bestDist = d
      }
    }
  }
  return best
}

/** Right: next visible element sibling; clamp at last (no wrap). */
export function nextSibling(el: Element): Element | null {
  let cur: Element | null = el.nextElementSibling
  while (cur) {
    if (!insideAnnotateRoot(cur) && isEffectivelyVisible(cur)) return cur
    cur = cur.nextElementSibling
  }
  return null
}

/** Left: previous visible element sibling; clamp at first (no wrap). */
export function prevSibling(el: Element): Element | null {
  let cur: Element | null = el.previousElementSibling
  while (cur) {
    if (!insideAnnotateRoot(cur) && isEffectivelyVisible(cur)) return cur
    cur = cur.previousElementSibling
  }
  return null
}

function visibleChildren(el: Element): Element[] {
  const out: Element[] = []
  for (const child of Array.from(el.children)) {
    if (insideAnnotateRoot(child)) continue
    if (!isEffectivelyVisible(child)) continue
    out.push(child)
  }
  return out
}

function insideAnnotateRoot(el: Element): boolean {
  return !!el.closest?.('.annotate-root')
}
