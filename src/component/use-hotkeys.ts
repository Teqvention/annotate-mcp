import { useEffect } from 'react'

interface HotkeyHandlers {
  toggle: () => void
  multiOn: () => void
  multiOff: () => void
  escape: () => void
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
      if (e.key === 'Shift') handlers.multiOn()
      if (e.key === 'Escape') handlers.escape()
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
