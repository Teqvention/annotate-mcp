import type { Annotation } from './types'

export interface BridgeMessage {
  v: 1
  kind: 'sync' | 'upsert' | 'delete' | 'clear' | 'hello'
  annotations?: Annotation[]
  annotation?: Annotation
  id?: string
  route?: string
}

export interface BridgeClient {
  send(msg: BridgeMessage): void
  close(): void
  readonly connected: boolean
}

export function createBridgeClient(
  port: number,
  onMessage: (msg: BridgeMessage) => void,
  onStatus: (connected: boolean) => void,
): BridgeClient {
  let ws: WebSocket | null = null
  let closed = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let connected = false

  const connect = () => {
    if (closed) return
    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}`)
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      connected = true
      onStatus(true)
      send({ v: 1, kind: 'hello', route: location.pathname + location.search })
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as BridgeMessage
        if (msg && msg.v === 1) onMessage(msg)
      } catch {
        // malformed, ignore
      }
    }

    ws.onclose = () => {
      connected = false
      onStatus(false)
      scheduleReconnect()
    }

    ws.onerror = () => {
      // fires before onclose; don't double-schedule
    }
  }

  const scheduleReconnect = () => {
    if (closed || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 5000)
  }

  const send = (msg: BridgeMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg))
      } catch {
        // drop on transport failure
      }
    }
  }

  connect()

  return {
    send,
    close() {
      closed = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    },
    get connected() {
      return connected
    },
  }
}
