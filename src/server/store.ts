import type { Annotation } from '../component/types.js'

type Subscriber = (annotations: Annotation[]) => void

class Store {
  private annotations: Annotation[] = []
  private subscribers = new Set<Subscriber>()

  getAll(): Annotation[] {
    return this.annotations.slice()
  }

  get(id: string): Annotation | undefined {
    return this.annotations.find((a) => a.id === id)
  }

  replace(annotations: Annotation[]): void {
    this.annotations = annotations.slice()
    this.notify()
  }

  upsert(ann: Annotation): void {
    const idx = this.annotations.findIndex((a) => a.id === ann.id)
    if (idx >= 0) this.annotations[idx] = ann
    else this.annotations.push(ann)
    this.notify()
  }

  remove(id: string): boolean {
    const idx = this.annotations.findIndex((a) => a.id === id)
    if (idx < 0) return false
    this.annotations.splice(idx, 1)
    this.notify()
    return true
  }

  clear(): number {
    const count = this.annotations.length
    this.annotations = []
    this.notify()
    return count
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn)
    return () => {
      this.subscribers.delete(fn)
    }
  }

  private notify(): void {
    const snapshot = this.getAll()
    for (const fn of this.subscribers) {
      try {
        fn(snapshot)
      } catch {
        // subscriber error shouldn't break store
      }
    }
  }
}

export const store = new Store()
