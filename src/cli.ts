import { run } from './server/index.js'

function parseArgs(argv: string[]): { port?: number; host?: string; help?: boolean } {
  const out: { port?: number; host?: string; help?: boolean } = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port' || a === '-p') {
      out.port = Number(argv[++i])
    } else if (a === '--host') {
      out.host = argv[++i]
    } else if (a === '--help' || a === '-h') {
      out.help = true
    }
  }
  return out
}

const cmd = process.argv[2]
const rest = process.argv.slice(3)

if (cmd === 'serve' || cmd === undefined) {
  const { port, host, help } = parseArgs(rest)
  if (help) {
    printHelp()
    process.exit(0)
  }
  run({ port, host }).catch((err) => {
    process.stderr.write(`annotate-mcp: ${(err as Error).message}\n`)
    process.exit(1)
  })
} else if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
  printHelp()
} else {
  process.stderr.write(`annotate-mcp: unknown command "${cmd}"\n`)
  printHelp()
  process.exit(1)
}

function printHelp(): void {
  process.stdout.write(`annotate-mcp — MCP server for in-page annotations

Usage:
  annotate-mcp serve [--port 47892] [--host 127.0.0.1]
  annotate-mcp help

Configure in .claude/settings.json:
  {
    "mcpServers": {
      "annotate": { "command": "npx", "args": ["-y", "annotate-mcp", "serve"] }
    }
  }

Then in your React app:
  import { Annotate } from 'annotate-mcp'
  import 'annotate-mcp/styles.css'

  <Annotate />
`)
}
