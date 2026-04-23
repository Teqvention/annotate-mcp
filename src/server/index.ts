import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { startBridgeServer } from './bridge-server.js'
import {
  clearArgs,
  listArgs,
  readArgs,
  toolClear,
  toolDescribeCurrent,
  toolList,
  toolRead,
} from './tools.js'

export interface RunOptions {
  port?: number
  host?: string
}

export async function run(opts: RunOptions = {}): Promise<void> {
  const preferredPort = opts.port ?? 47892
  const host = opts.host ?? '127.0.0.1'

  const bridge = await startBridgeServer({ port: preferredPort, host })
  const port = bridge.port
  if (port !== preferredPort) {
    // stderr, not stdout — stdio MCP transport owns stdout.
    console.error(
      `[annotate-mcp] port ${preferredPort} in use, bound to ${port} instead. ` +
        `Pass port={${port}} to <Annotate /> to match.`,
    )
  }

  const server = new Server(
    { name: 'annotate-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_annotations',
        description:
          'List annotations captured from the browser. Optional filters: route, since (timestamp ms), minConfidence.',
        inputSchema: {
          type: 'object',
          properties: {
            route: { type: 'string', description: 'Filter by exact route/pathname.' },
            since: {
              type: 'number',
              description: 'Only return annotations updated after this ms timestamp.',
            },
            minConfidence: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'Drop annotations whose worst-element selector is below this confidence.',
            },
          },
        },
      },
      {
        name: 'read_annotation',
        description: 'Return the full detail for a single annotation by id.',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      {
        name: 'clear_annotations',
        description: 'Delete all annotations. Requires explicit confirm:true.',
        inputSchema: {
          type: 'object',
          properties: { confirm: { type: 'boolean', enum: [true] } },
          required: ['confirm'],
        },
      },
      {
        name: 'describe_current',
        description:
          'Lightweight snapshot: how many pins, on which routes, newest comment. Good first call.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'bridge_status',
        description: 'Whether a browser is currently connected over the WebSocket bridge.',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params
    try {
      switch (name) {
        case 'list_annotations': {
          const parsed = listArgs.parse(args ?? {})
          return toResult(toolList(parsed))
        }
        case 'read_annotation': {
          const parsed = readArgs.parse(args ?? {})
          return toResult(toolRead(parsed))
        }
        case 'clear_annotations': {
          const parsed = clearArgs.parse(args ?? {})
          const out = toolClear(parsed)
          bridge.broadcast({ v: 1, kind: 'clear' })
          return toResult(out)
        }
        case 'describe_current':
          return toResult(toolDescribeCurrent())
        case 'bridge_status':
          return toResult({
            connectedBrowsers: bridge.clientCount(),
            host,
            port,
          })
        default:
          return toResult({ error: 'unknown_tool', name })
      }
    } catch (err) {
      return toResult({ error: 'tool_error', message: (err as Error).message })
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  const shutdown = async () => {
    try {
      await bridge.close()
    } catch {
      /* ignore */
    }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function toResult(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  }
}
