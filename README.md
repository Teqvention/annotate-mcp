# annotate-mcp

Figma-style in-page annotations for any React/Next.js app, with a bundled MCP server so Claude Code can read your pins directly.

Drop `<Annotate />` into your layout, press **Ctrl+A** (or Cmd+A), click any element, type a comment. Pins persist to `localStorage` and sync to the bundled MCP server over a local WebSocket. Claude reads them via MCP tools.

```bash
pnpm add annotate-mcp
```

```tsx
// app/layout.tsx
import { Annotate } from 'annotate-mcp'
import 'annotate-mcp/styles.css'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Annotate />
      </body>
    </html>
  )
}
```

```json
// .claude/settings.json
{
  "mcpServers": {
    "annotate": { "command": "npx", "args": ["-y", "annotate-mcp", "serve"] }
  }
}
```

That's the whole install. By default `<Annotate />` is dev-only (tree-shaken out of production builds); the MCP server is localhost-only and refuses to run in production.

## Keybindings

| Key | Action |
|---|---|
| `Ctrl+A` / `Cmd+A` | Toggle annotation mode (suppressed when typing in an input) |
| `Shift` (hold while in mode) | Multi-select — click several elements, release `Shift` to comment on the group |
| `Esc` | Cancel current step / exit mode |
| `Cmd+Enter` / `Ctrl+Enter` | Save comment from the composer |

## MCP tools Claude can call

| Tool | Purpose |
|---|---|
| `describe_current` | Quick snapshot: pin count, routes seen, latest comment. Good first call. |
| `list_annotations` | List all pins. Filters: `route`, `since`, `minConfidence`. |
| `read_annotation` | Full detail for one id, including element selectors with confidence. |
| `clear_annotations` | Delete everything. Requires `{ confirm: true }`. |
| `bridge_status` | Is a browser currently connected to the bridge? |

## Props

```tsx
<Annotate
  enabled={process.env.NODE_ENV !== 'production'}  // default
  accent="oklch(68% 0.18 35)"                       // default warm orange
  hotkey="mod+a"                                    // reserved for future remapping
  bridgePort={47892}                                // MCP server WebSocket port
  storageKey="annotate-mcp.v1"                      // localStorage key
  adaptive={true}                                   // follow prefers-color-scheme for surfaces
  onAnnotation={(ann) => {}}                        // fires after save
/>
```

## Data shape

```ts
interface Annotation {
  id: string
  createdAt: number
  updatedAt: number
  comment: string
  pin: { x: number; y: number }                      // viewport coordinates at save time
  elements: {
    selector: string                                 // best-available CSS selector
    confidence: 'high' | 'medium' | 'low'            // selector stability
    tag: string
    text: string
    rect: { x: number; y: number; width: number; height: number }
    path: string                                     // structural fallback
  }[]
  route: string
  viewport: { w: number; h: number }
}
```

Selector confidence ranking:

- **high** — `data-testid` or stable `#id`
- **medium** — `tag + classes` combo or `aria-label`
- **low** — structural `nth-of-type` path

## Offline / connection failure

If the MCP server isn't running, `<Annotate />` still works fully. Pins persist to `localStorage` and sync automatically when the server comes back. Claude can also read `window.__annotations` directly via Chrome DevTools MCP as a fallback.

## Production safety

- `enabled` defaults to `process.env.NODE_ENV !== 'production'`, which Next tree-shakes at build time — zero bytes in a prod bundle.
- The MCP server binds `127.0.0.1` only and throws on startup if `NODE_ENV=production`.

## License

MIT — see LICENSE.
