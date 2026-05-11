import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface ProxyRequest {
  endpoint: string;
  method?: string;
  body?: any;
}

const NEURON_API_BASE = 'https://app.neuronwriter.com/neuron-api/0.5/writer';
const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type, x-nw-api-key, x-nw-endpoint, x-neuronwriter-key, x-api-key';
const ALLOWED_ENDPOINTS = new Set(['/list-projects', '/list-queries', '/new-query', '/get-query', '/get-content', '/set-content']);

function endpointTimeout(endpoint: string): number {
  if (endpoint === '/new-query') return 45_000;
  if (endpoint === '/get-query') return 20_000;
  if (endpoint === '/list-projects' || endpoint === '/list-queries') return 15_000;
  return 30_000;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    },
  });
}

console.info('neuronwriter-proxy starting v1.2');

serve(async (req: Request) => {
  try {
    const { method } = req;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': ALLOWED_HEADERS,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        },
      });
    }

    const contentType = req.headers.get('content-type') || '';
    let payload: ProxyRequest | null = null;

    if (contentType.includes('application/json')) {
      payload = await req.json().catch(() => null);
    } else {
      const text = await req.text();
      if (text) {
        try { payload = JSON.parse(text); } catch { payload = null; }
      }
    }

    if (!payload || !payload.endpoint) {
      return jsonResponse({ error: 'invalid_request', message: 'Request must be JSON with an "endpoint" field.' }, 400);
    }

    // The API key is passed securely from the UI via the proxy request body or header.
    // If you prefer headers (which we updated the UI to send earlier, but then reverted),
    // let's grab it from the payload body if present, or Deno.env as a fallback.
    // Wait, in my LAST commit to your repo (Commit 9209b18), I wrapped the payload 
    // but the API key wasn't explicitly passed in `payload.body` anymore because I reverted 
    // to match your Edge function structure.
    
    // Let's look for the API key in the custom header we were sending:
    // Accept API key from (in priority order): request body, custom headers, env var.
    // The UI sends it in the body as `apiKey` and also in `X-NeuronWriter-Key` / `X-NW-Api-Key` headers.
    const bodyApiKey = (payload as any)?.apiKey || (payload as any)?.body?.apiKey;
    const apiKey =
      bodyApiKey ||
      req.headers.get('X-NW-Api-Key') ||
      req.headers.get('X-NeuronWriter-Key') ||
      req.headers.get('X-API-KEY') ||
      Deno.env.get('NEURONWRITER_API_KEY');

    if (!apiKey) {
      return jsonResponse({ error: 'missing_api_key', message: 'NeuronWriter API Key is required (provide in body.apiKey, X-NeuronWriter-Key header, or NEURONWRITER_API_KEY env).' }, 400);
    }

    // Construct the actual NeuronWriter URL
    // e.g. /projects -> https://app.neuronwriter.com/neuron-api/0.5/writer/projects
    const cleanEndpoint = payload.endpoint.startsWith('/') ? payload.endpoint : '/' + payload.endpoint;
    if (!ALLOWED_ENDPOINTS.has(cleanEndpoint)) {
      return jsonResponse({ error: 'unsupported_endpoint', message: 'Unsupported NeuronWriter endpoint.' }, 400);
    }
    const targetUrl = `${NEURON_API_BASE}${cleanEndpoint}`;
    const forwardMethod = (payload.method || 'POST').toUpperCase();
    if (!['POST', 'PUT'].includes(forwardMethod)) {
      return jsonResponse({ error: 'unsupported_method', message: 'Unsupported NeuronWriter method.' }, 400);
    }

    const forwardHeaders = new Headers();
    // NeuronWriter strictly requires X-API-KEY header
    forwardHeaders.set('X-API-KEY', apiKey);
    forwardHeaders.set('Accept', 'application/json');

    if (payload.body && Object.keys(payload.body).length > 0) {
      forwardHeaders.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpointTimeout(cleanEndpoint));
    const fetchOpts: RequestInit = {
      method: forwardMethod,
      headers: forwardHeaders,
      body: (payload.body && Object.keys(payload.body).length > 0) ? JSON.stringify(payload.body) : undefined,
      signal: controller.signal,
    };

    console.info(`Forwarding to: ${targetUrl} [${forwardMethod}]`);

    const res = await fetch(targetUrl, fetchOpts).finally(() => clearTimeout(timeoutId));
    const resText = await res.text();

    let resBody: any = resText;
    const resContentType = res.headers.get('content-type') || '';
    if (resContentType.includes('application/json')) {
      try { resBody = JSON.parse(resText); } catch { resBody = resText; }
    }

    // Build response with CORS
    return new Response(typeof resBody === 'string' ? resBody : JSON.stringify(resBody), {
      status: res.status,
      headers: {
        'Content-Type': resContentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      },
    });
  } catch (err) {
    console.error('proxy error', err);
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return jsonResponse({
      error: isTimeout ? 'timeout' : 'proxy_error',
      message: isTimeout ? 'NeuronWriter request timed out.' : String(err),
      details: (err instanceof Error ? err.stack : null)
    }, isTimeout ? 408 : 502);
  }
});