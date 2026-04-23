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
  /** Max additional ports to try when the preferred port is in use. */
  maxFallbacks?: number
}

export interface BridgeServer {
  close: () => Promise<void>
  broadcast: (msg: BridgeMessage) => void
  clientCount: () => number
  port: number
}

export async function startBridgeServer(opts: BridgeServerOptions): Promise<BridgeServer> {
  const { port: preferredPort, host = '127.0.0.1', maxFallbacks = 10 } = opts
  const wss = await listenWithFallback(preferredPort, host, maxFallbacks)
  const port = (wss.address() as { port: number }).port
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

  return { close, broadcast, clientCount: () => clients.size, port }
}

async function listenWithFallback(
  preferredPort: number,
  host: string,
  maxFallbacks: number,
): Promise<WebSocketServer> {
  let lastErr: NodeJS.ErrnoException | null = null
  for (let attempt = 0; attempt <= maxFallbacks; attempt++) {
    // First attempt uses the preferred port; subsequent attempts ask the OS
    // for any free port (port 0) so we don't collide repeatedly.
    const port = attempt === 0 ? preferredPort : 0
    try {
      return await tryListen(port, host)
    } catch (err) {
      const e = err as NodeJS.ErrnoException
      if (e.code !== 'EADDRINUSE') throw err
      lastErr = e
    }
  }
  throw lastErr ?? new Error('failed to bind bridge server')
}

function tryListen(port: number, host: string): Promise<WebSocketServer> {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port, host })
    const onError = (err: Error) => {
      wss.off('listening', onListening)
      reject(err)
    }
    const onListening = () => {
      wss.off('error', onError)
      resolve(wss)
    }
    wss.once('error', onError)
    wss.once('listening', onListening)
  })
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
