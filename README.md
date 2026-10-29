# @pipeworx/replicate

[Replicate](https://replicate.com/docs/reference/http) MCP — run open models (Flux, Llama, Whisper, etc.) and manage predictions. Free trial credits on signup.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1856+ live data sources. This is an independent, unofficial integration — not affiliated with, endorsed by, or published by the upstream provider.

## Auth

- Platform: `PLATFORM_REPLICATE_KEY`. BYO: `?_apiKey=…`.

## Tools (models)

- `list_models(cursor?)` — list public models
- `model(owner, name)` — model detail
- `model_versions(owner, name)` — list versions
- `model_version(owner, name, version_id)` — version detail
- `search_models(query)` — model search
- `collections()` — model collections
- `collection(slug)` — collection detail

## Tools (predictions)

- `create_prediction(version, input, webhook?, webhook_events_filter?, stream?)` — kick off a model run
- `prediction(id)` — single prediction (poll for completion)
- `list_predictions(cursor?)` — recent predictions
- `cancel_prediction(id)` — cancel a running prediction

## Tools (deployments)

- `list_deployments(cursor?)` — your deployments
- `deployment(owner, name)` — deployment detail
- `create_deployment_prediction(owner, name, input, webhook?, webhook_events_filter?, stream?)` — run via a deployment (faster cold starts)

## Tools (account)

- `account()` — your account
- `hardware()` — available hardware types

## Notes

- `create_prediction` returns immediately with the prediction in `starting` or `processing` state. Poll `prediction(id)` until `status` is `succeeded` or `failed`, OR pass a `webhook` URL to be notified.
- For LLM-style streaming, pass `stream=true` and use the returned `urls.stream` SSE endpoint.

## Data source

`https://api.replicate.com/v1`

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "replicate": {
      "url": "https://gateway.pipeworx.io/replicate/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/replicate/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1856+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/replicate_list_models \
  -H 'Content-Type: application/json' \
  -d '{}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/replicate_list_models`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Run it from npm

`@pipeworx/mcp-replicate` is a local stdio bridge to the Pipeworx gateway: your MCP client
starts it with `npx`, and it forwards every call to the same
`https://gateway.pipeworx.io/replicate/mcp` endpoint shown above. It needs network access;
there is no offline mode.

```json
{
  "mcpServers": {
    "replicate": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-replicate"]
    }
  }
}
```

Without a key it calls anonymously, capped at 50 calls a day. A free account
raises that to 200 a day: get a key at https://pipeworx.io/signup and add
`"env": { "PIPEWORX_API_KEY": "<your key>" }` to the server entry.
The key is sent as a Bearer token, the same way a hosted connection sends it,
so calls are metered and billed exactly as they are there.

It lists **only** this pack's tools by default. Set `PIPEWORX_META_TOOLS=1` to
also list `ask_pipeworx` and the other gateway-wide tools.

Behind an HTTPS proxy: Node's built-in `fetch` does not read `HTTPS_PROXY` by
default. Newer Node releases honour it when `NODE_USE_ENV_PROXY=1` is set; check
your Node version's documentation.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Replicate data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
