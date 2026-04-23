import type { AncestorNode, CapturedElement, Confidence } from './types'

export function captureElement(el: Element): CapturedElement {
  const { selector, confidence, path } = buildSelector(el)
  const rect = el.getBoundingClientRect()
  return {
    selector,
    confidence,
    tag: el.tagName.toLowerCase(),
    text: short(el.textContent ?? '', 80),
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    path,
    ancestors: captureAncestors(el),
  }
}

function captureAncestors(el: Element): AncestorNode[] {
  const out: AncestorNode[] = []
  let cur: Element | null = el
  // Walk up to <body>; cap depth so JSON stays compact.
  while (cur && cur.nodeType === 1 && cur !== document.body && out.length < 8) {
    out.push(describeNode(cur))
    cur = cur.parentElement
  }
  return out
}

function describeNode(el: Element): AncestorNode {
  return {
    tag: el.tagName.toLowerCase(),
    classes: readableClasses(el),
    ariaLabel: el.getAttribute('aria-label'),
    role: el.getAttribute('role'),
    data: readDataAttrs(el),
    ownText: directText(el),
  }
}

function readableClasses(el: Element): string[] {
  // Drop CSS-in-JS noise (css-abc123, sc-abc123) and empty/huge tokens. Keep
  // Tailwind utilities, BEM, and normal class names that the agent can grep.
  return Array.from(el.classList).filter(
    (c) => c && !/^(css-|sc-|_|[a-z0-9]{8,}-)/.test(c) && c.length <= 40,
  )
}

function readDataAttrs(el: Element): Record<string, string> {
  const out: Record<string, string> = {}
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-')) continue
    // Skip React/devtools-internal data attrs.
    if (/^data-(react|reactid|radix-)/i.test(attr.name)) continue
    out[attr.name] = short(attr.value, 80)
  }
  return out
}

function directText(el: Element): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) text += node.textContent ?? ''
  }
  return short(text, 80)
}

function buildSelector(el: Element): { selector: string; confidence: Confidence; path: string } {
  const path = structuralPath(el)

  const testid = el.getAttribute('data-testid')
  if (testid) {
    return { selector: `[data-testid="${cssEscape(testid)}"]`, confidence: 'high', path }
  }

  if (el.id && /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(el.id) && !/[0-9]{3,}/.test(el.id)) {
    if (document.querySelectorAll(`#${cssEscape(el.id)}`).length === 1) {
      return { selector: `#${cssEscape(el.id)}`, confidence: 'high', path }
    }
  }

  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList).filter(
    (c) => c && !/^(css-|sc-|_|[a-z0-9]{5,}-)/.test(c) && c.length > 2 && c.length < 40,
  )
  if (classes.length) {
    const sel = `${tag}.${classes.slice(0, 3).map(cssEscape).join('.')}`
    try {
      if (document.querySelectorAll(sel).length === 1) {
        return { selector: sel, confidence: 'medium', path }
      }
    } catch {
      // invalid selector, fall through
    }
  }

  const aria = el.getAttribute('aria-label')
  if (aria) {
    return {
      selector: `${tag}[aria-label="${cssEscape(aria)}"]`,
      confidence: 'medium',
      path,
    }
  }

  return { selector: path, confidence: 'low', path }
}

function structuralPath(el: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.nodeType === 1 && cur !== document.body && parts.length < 6) {
    const tag = cur.tagName.toLowerCase()
    const parentEl: Element | null = cur.parentElement
    if (!parentEl) {
      parts.unshift(tag)
      break
    }
    const currentTag = cur.tagName
    const siblings = Array.from(parentEl.children).filter(
      (c: Element) => c.tagName === currentTag,
    )
    const idx = siblings.indexOf(cur) + 1
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${idx})` : tag)
    cur = parentEl
  }
  return parts.join(' > ')
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s)
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

function short(s: string, n: number): string {
  s = s.replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

export function resolveElement(el: CapturedElement): Element | null {
  try {
    if (el.selector) {
      const found = document.querySelector(el.selector)
      if (found) return found
    }
    if (el.path) {
      const found = document.querySelector(el.path)
      if (found) return found
    }
  } catch {
    // bad selector
  }
  return null
}
