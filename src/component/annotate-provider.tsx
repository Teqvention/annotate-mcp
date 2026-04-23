'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Portal } from '@radix-ui/react-portal'
import { Composer } from './composer'
import { HighlightLayer } from './highlight-layer'
import { PinLayer } from './pin'
import { Toolbar } from './toolbar'
import type { Annotation, CapturedElement, Mode } from './types'
import { captureElement } from './use-selector'
import { useAnnotations } from './use-annotations'
import { useHotkeys } from './use-hotkeys'
import { createBridgeClient, type BridgeClient } from './bridge-client'

export interface AnnotateProps {
  enabled?: boolean
  accent?: string
  hotkey?: string
  bridgePort?: number
  storageKey?: string
  adaptive?: boolean
  onAnnotation?: (ann: Annotation) => void
}

interface PendingPin {
  x: number
  y: number
  elements: CapturedElement[]
}

const DEFAULT_PORT = 47892

export function AnnotateProvider({
  enabled = process.env.NODE_ENV !== 'production',
  accent = 'oklch(68% 0.18 35)',
  bridgePort = DEFAULT_PORT,
  storageKey = 'annotate-mcp.v1',
  adaptive = true,
  onAnnotation,
}: AnnotateProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [mode, setMode] = useState<Mode>('off')
  const [multi, setMulti] = useState(false)
  const [multiSelection, setMultiSelection] = useState<Element[]>([])
  const [hoverEl, setHoverEl] = useState<Element | null>(null)
  const [pendingPin, setPendingPin] = useState<PendingPin | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null)
  const [connected, setConnected] = useState(false)

  const { annotations, create, update, remove, undoRemove, clearAll } =
    useAnnotations(storageKey)

  const bridgeRef = useRef<BridgeClient | null>(null)

  // Bridge connection
  useEffect(() => {
    if (!enabled || !mounted) return
    const client = createBridgeClient(
      bridgePort,
      (msg) => {
        if (msg.kind === 'clear') clearAll()
      },
      setConnected,
    )
    bridgeRef.current = client
    // initial sync
    client.send({ v: 1, kind: 'sync', annotations })
    return () => {
      client.close()
      bridgeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mounted, bridgePort])

  // Re-sync whenever annotations change (when connected)
  useEffect(() => {
    if (bridgeRef.current?.connected) {
      bridgeRef.current.send({ v: 1, kind: 'sync', annotations })
    }
  }, [annotations])

  const enter = useCallback(() => {
    if (mode === 'off') setMode('annotating')
  }, [mode])

  const exit = useCallback(() => {
    setMode('off')
    setMulti(false)
    setMultiSelection([])
    setHoverEl(null)
    setPendingPin(null)
    setEditingId(null)
  }, [])

  const toggleMode = useCallback(() => {
    if (mode === 'off') enter()
    else exit()
  }, [mode, enter, exit])

  const commitMulti = useCallback(() => {
    if (multiSelection.length === 0) {
      setMulti(false)
      return
    }
    const elements = multiSelection.map(captureElement)
    const rects = multiSelection.map((el) => el.getBoundingClientRect())
    const cx = rects.reduce((a, r) => a + r.left + r.width / 2, 0) / rects.length
    const cy = rects.reduce((a, r) => a + r.top + r.height / 2, 0) / rects.length
    setPendingPin({ x: cx, y: cy, elements })
    setMode('composing')
  }, [multiSelection])

  const cancelMulti = useCallback(() => {
    setMultiSelection([])
    setMulti(false)
  }, [])

  useHotkeys(enabled && mounted, {
    toggle: toggleMode,
    multiOn: () => {
      if (mode === 'annotating') setMulti(true)
    },
    multiOff: () => {
      if (mode === 'annotating' && multi) {
        if (multiSelection.length > 0) commitMulti()
        else setMulti(false)
      }
    },
    escape: () => {
      if (mode === 'composing') {
        setPendingPin(null)
        setEditingId(null)
        setMode('annotating')
      } else if (multi) cancelMulti()
      else if (mode === 'annotating') exit()
    },
  })

  // Overlay click
  const onOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'annotating') return
      e.preventDefault()
      e.stopPropagation()

      const overlay = e.currentTarget as HTMLElement
      overlay.style.pointerEvents = 'none'
      const target = document.elementFromPoint(e.clientX, e.clientY)
      overlay.style.pointerEvents = ''

      if (!target || target.closest('.annotate-root')) return

      if (multi) {
        setMultiSelection((sel) =>
          sel.includes(target) ? sel.filter((s) => s !== target) : [...sel, target],
        )
        return
      }
      setPendingPin({
        x: e.clientX,
        y: e.clientY,
        elements: [captureElement(target)],
      })
      setMode('composing')
    },
    [mode, multi],
  )

  const onOverlayMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'annotating' || multi) return
      const overlay = e.currentTarget as HTMLElement
      overlay.style.pointerEvents = 'none'
      const el = document.elementFromPoint(e.clientX, e.clientY)
      overlay.style.pointerEvents = ''
      if (el !== hoverEl && !(el && el.closest('.annotate-root'))) {
        setHoverEl(el)
      }
    },
    [mode, multi, hoverEl],
  )

  const handleSave = useCallback(
    (comment: string) => {
      const trimmed = comment.trim()
      if (editingId) {
        update(editingId, { comment: trimmed })
        const ann = annotations.find((a) => a.id === editingId)
        if (ann && onAnnotation) onAnnotation({ ...ann, comment: trimmed })
      } else if (pendingPin) {
        const ann = create({
          comment: trimmed,
          pin: { x: pendingPin.x, y: pendingPin.y },
          elements: pendingPin.elements,
          route: location.pathname + location.search,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        })
        onAnnotation?.(ann)
      }
      setPendingPin(null)
      setEditingId(null)
      setMultiSelection([])
      setMulti(false)
      setMode('annotating')
    },
    [editingId, pendingPin, annotations, create, update, onAnnotation],
  )

  const handleCancel = useCallback(() => {
    setPendingPin(null)
    setEditingId(null)
    setMode('annotating')
  }, [])

  const handleDelete = useCallback(() => {
    if (!editingId) return
    remove(editingId)
    setEditingId(null)
    setPendingPin(null)
    setMode('annotating')
    setToast({
      msg: 'Annotation deleted',
      undo: () => {
        undoRemove()
        setToast(null)
      },
    })
  }, [editingId, remove, undoRemove])

  const handleCopy = useCallback(() => {
    const json = JSON.stringify(annotations, null, 2)
    const write = navigator.clipboard?.writeText?.(json) ?? Promise.reject()
    write
      .then(() => setToast({ msg: 'Copied to clipboard' }))
      .catch(() => {
        ;(window as unknown as { __annotationsJson: string }).__annotationsJson = json
        setToast({ msg: 'Exposed at window.__annotationsJson' })
      })
  }, [annotations])

  const handleClearAll = useCallback(() => {
    if (annotations.length === 0) return
    if (!confirm(`Delete all ${annotations.length} annotations?`)) return
    const snapshot = annotations.slice()
    clearAll()
    setToast({
      msg: `Cleared ${snapshot.length} annotations`,
      undo: () => {
        snapshot.forEach((ann) =>
          create({
            comment: ann.comment,
            pin: ann.pin,
            elements: ann.elements,
            route: ann.route,
            viewport: ann.viewport,
          }),
        )
        setToast(null)
      },
    })
  }, [annotations, clearAll, create])

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const handlePinClick = useCallback(
    (id: string) => {
      const ann = annotations.find((a) => a.id === id)
      if (!ann) return
      if (mode === 'off') enter()
      setEditingId(id)
      setPendingPin({ x: ann.pin.x, y: ann.pin.y, elements: ann.elements })
      setMode('composing')
    },
    [annotations, mode, enter],
  )

  const composerData = useMemo(() => {
    if (mode !== 'composing') return null
    if (editingId) {
      const ann = annotations.find((a) => a.id === editingId)
      if (!ann) return null
      return {
        pin: ann.pin,
        elements: ann.elements,
        comment: ann.comment,
        index: annotations.findIndex((a) => a.id === editingId) + 1,
        editing: true as const,
      }
    }
    if (pendingPin) {
      return {
        pin: { x: pendingPin.x, y: pendingPin.y },
        elements: pendingPin.elements,
        comment: '',
        index: annotations.length + 1,
        editing: false as const,
      }
    }
    return null
  }, [mode, editingId, pendingPin, annotations])

  if (!enabled || !mounted) return null

  const active = mode !== 'off'
  const rootStyle: React.CSSProperties = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ['--annotate-accent' as any]: accent,
  }

  return (
    <Portal>
      <div
        className="annotate-root"
        style={rootStyle}
        data-active={active ? 'true' : 'false'}
        data-multi={multi ? 'true' : 'false'}
        data-adaptive={adaptive ? 'true' : 'false'}
      >
        <div
          className="annotate-overlay"
          onClick={onOverlayClick}
          onMouseMove={onOverlayMove}
        />

        <HighlightLayer
          annotations={annotations}
          hoverEl={hoverEl}
          multiSelection={multiSelection}
          composing={mode === 'composing'}
        />

        <PinLayer annotations={annotations} onPinClick={handlePinClick} />

        {active ? (
          <Toolbar
            mode={mode}
            multi={multi}
            multiCount={multiSelection.length}
            pinCount={annotations.length}
            connected={connected}
            onDone={commitMulti}
            onCancelMulti={cancelMulti}
            onCopy={handleCopy}
            onClear={handleClearAll}
            onExit={exit}
          />
        ) : null}

        {composerData ? (
          <Composer
            pin={composerData.pin}
            elements={composerData.elements}
            initialComment={composerData.comment}
            indexLabel={composerData.index}
            editing={composerData.editing}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={composerData.editing ? handleDelete : undefined}
          />
        ) : null}

        {toast ? (
          <div className="annotate-toast" data-visible="true" role="status">
            <span>{toast.msg}</span>
            {toast.undo ? (
              <button className="annotate-toast__btn" onClick={toast.undo} type="button">
                Undo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Portal>
  )
}
