# onpay-mcp

[![npm version](https://img.shields.io/npm/v/@fatomate/onpay-mcp.svg)](https://www.npmjs.com/package/@fatomate/onpay-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

An [MCP](https://modelcontextprotocol.io) server that exposes the
[OnPay API v1](https://onpaysb.github.io/docs/developer/api-v1.html) as tools
any AI assistant (Claude Desktop, Claude Code, Cursor, Windsurf, …) can call.

> Unofficial, community-maintained. Not affiliated with or endorsed by OnPay.

## Tools

| Tool | OnPay endpoint | Description |
| --- | --- | --- |
| `sales_list` | `GET /sales.list` | List sale records (paginated, filterable, sortable) |
| `sales_get` | `GET /sales.get` | Get a single sale record by ID |
| `sales_update_shipping_info` | `POST /sales.update_shipping_info` | Set courier + tracking code for a sale |

## Configuration

The server needs your API token plus where your OnPay account lives:

- `ONPAY_TOKEN` — your API token from **Tetapan > Sistem > API & Webhook**
- **and one of:**
  - `ONPAY_ACCOUNT` — your subdomain, i.e. the `acme` in `https://acme.onpay.my`, **or**
  - `ONPAY_BASE_URL` — full API base URL if you use a **custom domain**, e.g. `https://shop.example.com/api/v1`

> ⚠️ Your API token can read every sale/customer record on the account. Keep it
> secret, store it only in your MCP client's config, and rotate it if exposed.

## Install

No local clone needed — MCP clients can run it on demand with `npx`.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "onpay": {
      "command": "npx",
      "args": ["-y", "@fatomate/onpay-mcp"],
      "env": {
        "ONPAY_ACCOUNT": "your-subdomain",
        "ONPAY_TOKEN": "your-api-token"
      }
    }
  }
}
```

Restart Claude Desktop and the three OnPay tools will be available.
(Using a custom domain? Replace `ONPAY_ACCOUNT` with
`"ONPAY_BASE_URL": "https://your-domain/api/v1"`.)

### Claude Code

```bash
claude mcp add onpay \
  --env ONPAY_ACCOUNT=your-subdomain \
  --env ONPAY_TOKEN=your-api-token \
  -- npx -y @fatomate/onpay-mcp
```

### Cursor / Windsurf / other MCP clients

Use the same `command: "npx"`, `args: ["-y", "@fatomate/onpay-mcp"]`, and `env`
block in that client's MCP config.

## Develop from source

```bash
git clone https://github.com/fatomate/onpay-mcp.git
cd onpay-mcp
npm install
npm run build

npm run watch     # recompile on change
npm run inspect   # open the MCP Inspector against the built server
```

The Inspector lets you call each tool with real arguments and see the raw
OnPay response.

## Notes

- Transport is **stdio** (the client launches the process). To expose this over
  HTTP later, swap `StdioServerTransport` for the Streamable HTTP transport from
  the SDK.
- Logs go to **stderr**; stdout is reserved for the MCP protocol.

## License

MIT — see [LICENSE](LICENSE).
