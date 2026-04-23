import { z } from 'zod'
import { store } from './store.js'
import type { Annotation, Confidence } from '../component/types.js'

export const listArgs = z.object({
  route: z.string().optional(),
  since: z.number().optional(),
  minConfidence: z.enum(['high', 'medium', 'low']).optional(),
})

export const readArgs = z.object({ id: z.string() })

export const clearArgs = z.object({ confirm: z.literal(true) })

const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 }

export function toolList(args: z.infer<typeof listArgs>) {
  const all = store.getAll()
  const filtered = all.filter((ann) => {
    if (args.route && ann.route !== args.route) return false
    if (args.since != null && ann.updatedAt < args.since) return false
    if (args.minConfidence) {
      const worst = Math.min(
        ...ann.elements.map((e) => CONFIDENCE_RANK[e.confidence]),
      )
      if (worst < CONFIDENCE_RANK[args.minConfidence]) return false
    }
    return true
  })
  return {
    total: all.length,
    returned: filtered.length,
    annotations: filtered.map(summarize),
  }
}

export function toolRead(args: z.infer<typeof readArgs>) {
  const ann = store.get(args.id)
  if (!ann) return { error: 'not_found', id: args.id }
  return { annotation: ann }
}

export function toolClear(_args: z.infer<typeof clearArgs>) {
  const deleted = store.clear()
  return { deleted }
}

export function toolDescribeCurrent() {
  const all = store.getAll()
  const latest = all[all.length - 1]
  const routes = Array.from(new Set(all.map((a) => a.route)))
  return {
    pinCount: all.length,
    routes,
    latest: latest
      ? {
          id: latest.id,
          comment: latest.comment,
          route: latest.route,
          createdAt: latest.createdAt,
          elementCount: latest.elements.length,
        }
      : null,
  }
}

function summarize(ann: Annotation) {
  return {
    id: ann.id,
    createdAt: ann.createdAt,
    updatedAt: ann.updatedAt,
    comment: ann.comment,
    route: ann.route,
    pin: ann.pin,
    elementCount: ann.elements.length,
    elements: ann.elements.map((e) => ({
      selector: e.selector,
      confidence: e.confidence,
      tag: e.tag,
      text: e.text,
    })),
  }
}
