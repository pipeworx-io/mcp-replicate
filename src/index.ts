interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Replicate MCP.
 */


const BASE = 'https://api.replicate.com/v1';
const UA = 'pipeworx-mcp-replicate/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  { name: 'list_models', description: 'List public models.', inputSchema: { type: 'object', properties: { cursor: { type: 'string' } } } },
  { name: 'model', description: 'Model detail.', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, name: { type: 'string' } }, required: ['owner', 'name'] } },
  { name: 'model_versions', description: 'List versions.', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, name: { type: 'string' } }, required: ['owner', 'name'] } },
  {
    name: 'model_version',
    description: 'Version detail.',
    inputSchema: { type: 'object', properties: { owner: { type: 'string' }, name: { type: 'string' }, version_id: { type: 'string' } }, required: ['owner', 'name', 'version_id'] },
  },
  { name: 'search_models', description: 'Model search.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'collections', description: 'Model collections.', inputSchema: { type: 'object', properties: {} } },
  { name: 'collection', description: 'Collection detail.', inputSchema: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] } },
  {
    name: 'create_prediction',
    description: 'Kick off a model run.',
    inputSchema: {
      type: 'object',
      properties: { version: { type: 'string' }, input: {}, webhook: { type: 'string' }, webhook_events_filter: { type: 'array', items: { type: 'string' } }, stream: { type: 'boolean' } },
      required: ['version', 'input'],
    },
  },
  { name: 'prediction', description: 'Single prediction (poll).', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_predictions', description: 'Recent predictions.', inputSchema: { type: 'object', properties: { cursor: { type: 'string' } } } },
  { name: 'cancel_prediction', description: 'Cancel a prediction.', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'list_deployments', description: 'Your deployments.', inputSchema: { type: 'object', properties: { cursor: { type: 'string' } } } },
  { name: 'deployment', description: 'Deployment detail.', inputSchema: { type: 'object', properties: { owner: { type: 'string' }, name: { type: 'string' } }, required: ['owner', 'name'] } },
  {
    name: 'create_deployment_prediction',
    description: 'Run via a deployment.',
    inputSchema: {
      type: 'object',
      properties: { owner: { type: 'string' }, name: { type: 'string' }, input: {}, webhook: { type: 'string' }, webhook_events_filter: { type: 'array', items: { type: 'string' } }, stream: { type: 'boolean' } },
      required: ['owner', 'name', 'input'],
    },
  },
  { name: 'account', description: 'Your account.', inputSchema: { type: 'object', properties: {} } },
  { name: 'hardware', description: 'Available hardware types.', inputSchema: { type: 'object', properties: {} } },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = (args._apiKey as string | undefined)?.trim();
  if (!apiKey) throw new Error('Replicate requires an API key. Set PLATFORM_REPLICATE_KEY or pass ?_apiKey=… (free trial credits at https://replicate.com).');
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA, Authorization: `Bearer ${apiKey}` };
  const reqStr = (k: string, ex: string) => {
    const v = args[k];
    if (typeof v !== 'string' || !v.trim()) throw new Error(`Required argument "${k}" is missing. Pass a string like ${ex}.`);
    return v;
  };
  const get = async (path: string, params?: Record<string, unknown>) => {
    const p = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v != null) p.set(k, String(v));
    const url = `${BASE}${path}${[...p].length ? `?${p}` : ''}`;
    const res = await fetch(url, { headers });
    if (res.status === 401 || res.status === 403) throw new Error('Replicate: invalid API key.');
    if (!res.ok) throw new Error(`Replicate: ${res.status}`);
    return res.json();
  };
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) throw new Error('Replicate: invalid API key.');
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate: ${res.status} ${text.slice(0, 200)}`);
    }
    return res.json();
  };
  switch (name) {
    case 'list_models':
      return get('/models', { cursor: args.cursor });
    case 'model':
      return get(`/models/${encodeURIComponent(reqStr('owner', '"black-forest-labs"'))}/${encodeURIComponent(reqStr('name', '"flux-schnell"'))}`);
    case 'model_versions':
      return get(`/models/${encodeURIComponent(reqStr('owner', '"black-forest-labs"'))}/${encodeURIComponent(reqStr('name', '"flux-schnell"'))}/versions`);
    case 'model_version':
      return get(`/models/${encodeURIComponent(reqStr('owner', '"black-forest-labs"'))}/${encodeURIComponent(reqStr('name', '"flux-schnell"'))}/versions/${encodeURIComponent(reqStr('version_id', '"<id>"'))}`);
    case 'search_models':
      return get('/models', { query: reqStr('query', '"flux"') });
    case 'collections':
      return get('/collections');
    case 'collection':
      return get(`/collections/${encodeURIComponent(reqStr('slug', '"text-to-image"'))}`);
    case 'create_prediction':
      return post('/predictions', {
        version: reqStr('version', '"<version_id>"'),
        input: args.input,
        webhook: args.webhook,
        webhook_events_filter: args.webhook_events_filter,
        stream: args.stream,
      });
    case 'prediction':
      return get(`/predictions/${encodeURIComponent(reqStr('id', '"<id>"'))}`);
    case 'list_predictions':
      return get('/predictions', { cursor: args.cursor });
    case 'cancel_prediction':
      return post(`/predictions/${encodeURIComponent(reqStr('id', '"<id>"'))}/cancel`, {});
    case 'list_deployments':
      return get('/deployments', { cursor: args.cursor });
    case 'deployment':
      return get(`/deployments/${encodeURIComponent(reqStr('owner', '"<owner>"'))}/${encodeURIComponent(reqStr('name', '"<name>"'))}`);
    case 'create_deployment_prediction':
      return post(`/deployments/${encodeURIComponent(reqStr('owner', '"<owner>"'))}/${encodeURIComponent(reqStr('name', '"<name>"'))}/predictions`, {
        input: args.input,
        webhook: args.webhook,
        webhook_events_filter: args.webhook_events_filter,
        stream: args.stream,
      });
    case 'account':
      return get('/account');
    case 'hardware':
      return get('/hardware');
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
