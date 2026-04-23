import { WebSocketServer, type WebSocket } from 'ws'
import { store } from './store.js'
import type { Annotation } from '../component/types.js'

interface BridgeMessage {
  v: 1
  kind: 'sync' | 'upsert' | 'delete' | 'clear' | 'hello'
  annotations?: Annotation[]
  annotation?: Annotation
  id?: string
  route?: string
}

export interface BridgeServerOptions {
  port: number
  host?: string
}

export function startBridgeServer(opts: BridgeServerOptions): {
  close: () => Promise<void>
  broadcast: (msg: BridgeMessage) => void
  clientCount: () => number
} {
  const { port, host = '127.0.0.1' } = opts
  const wss = new WebSocketServer({ port, host })
  const clients = new Set<WebSocket>()

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('message', (buf) => {
      try {
        const msg = JSON.parse(buf.toString()) as BridgeMessage
        if (!msg || msg.v !== 1) return
        handle(msg)
      } catch {
        // malformed
      }
    })
    ws.on('close', () => clients.delete(ws))
    ws.on('error', () => clients.delete(ws))
  })

  const broadcast = (msg: BridgeMessage) => {
    const data = JSON.stringify(msg)
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(data)
        } catch {
          // ignore
        }
      }
    }
  }

  const close = async () => {
    for (const ws of clients) {
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
    clients.clear()
    await new Promise<void>((resolve) => wss.close(() => resolve()))
  }

  return { close, broadcast, clientCount: () => clients.size }
}

function handle(msg: BridgeMessage): void {
  switch (msg.kind) {
    case 'sync':
      if (msg.annotations) store.replace(msg.annotations)
      break
    case 'upsert':
      if (msg.annotation) store.upsert(msg.annotation)
      break
    case 'delete':
      if (msg.id) store.remove(msg.id)
      break
    case 'clear':
      store.clear()
      break
    case 'hello':
      // route/ping, nothing to do server-side
      break
  }
}
