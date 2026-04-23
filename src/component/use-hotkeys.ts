import { useEffect } from 'react'

export type NavDirection = 'up' | 'down' | 'left' | 'right'

interface HotkeyHandlers {
  toggle: () => void
  multiOn: () => void
  multiOff: () => void
  escape: () => void
  nav: (dir: NavDirection) => void
  commit: (opts: { multi: boolean }) => void
}

function isTypingContext(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false
  const tag = el.tagName.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    (el as HTMLElement).isContentEditable === true
  )
}

export function useHotkeys(enabled: boolean, handlers: HotkeyHandlers) {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (isTypingContext(document.activeElement)) return
        e.preventDefault()
        handlers.toggle()
        return
      }
      if (e.key === 'Shift') {
        handlers.multiOn()
        return
      }
      if (e.key === 'Escape') {
        handlers.escape()
        return
      }
      // Arrow navigation + Enter commit only fire when the user isn't typing,
      // and only while in annotation mode (the handler itself gates further
      // on whether there's a current navEl).
      if (isTypingContext(document.activeElement)) return
      const dir = arrowToDir(e.key)
      if (dir) {
        e.preventDefault()
        handlers.nav(dir)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        handlers.commit({ multi: e.shiftKey })
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') handlers.multiOff()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keyup', onKeyUp, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keyup', onKeyUp, true)
    }
  }, [enabled, handlers])
}

function arrowToDir(key: string): NavDirection | null {
  switch (key) {
    case 'ArrowUp':
      return 'up'
    case 'ArrowDown':
      return 'down'
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    default:
      return null
  }
}
