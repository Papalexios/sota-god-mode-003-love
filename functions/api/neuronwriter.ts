/// <reference types="@cloudflare/workers-types" />

/**
 * SOTA NeuronWriter Proxy v3.0 — Enterprise-Grade
 * Cloudflare Pages Function — SINGLE SOURCE OF TRUTH for NeuronWriter proxying.
 * All other copies (api/neuronwriter.ts, supabase/functions/neuronwriter-proxy) are DELETED.
 */

import { getCorsHeadersForCF } from "../../src/lib/shared/corsHeaders";

const NEURON_API_BASE = "https://app.neuronwriter.com/neuron-api/0.5/writer";

interface Env {
  CORS_ALLOWED_ORIGINS?: string;
}

interface ProxyRequest {
  endpoint: string;
  method?: string;
  apiKey: string;
  body?: Record<string, unknown>;
}

interface NeuronAPIResponse {
  success: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  type?: string;
}

// ── Rate Limiter (per-worker in-memory) ─────────────────────────────────────

const rateLimiter = {
  tokens: 20,
  maxTokens: 20,
  refillRate: 2, // tokens per second
  lastRefill: Date.now(),

  tryAcquire(): boolean {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  },
};

async function makeNeuronRequest(
  endpoint: string,
  method: string,
  apiKey: string,
  body?: Record<string, unknown>,
  timeoutMs: number = 30000
): Promise<NeuronAPIResponse> {
  const cleanApiKey = apiKey.trim();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${NEURON_API_BASE}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "X-API-KEY": cleanApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "SOTAContentOptimizer/3.0",
      },
      signal: controller.signal,
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText.substring(0, 500) };
    }

    const result: NeuronAPIResponse = {
      success: response.ok,
      status: response.status,
      data: responseData,
    };

    if (!response.ok) {
      result.error = `NeuronWriter API error: ${response.status}`;
      result.type = "api_error";
    }

    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("abort") || errorMessage.includes("timeout");

    return {
      success: false,
      status: isTimeout ? 408 : 500,
      error: isTimeout ? "Request timed out" : errorMessage,
      type: isTimeout ? "timeout" : "network_error",
    };
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const cors = getCorsHeadersForCF(origin, env.CORS_ALLOWED_ORIGINS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  // Rate limiting
  if (!rateLimiter.tryAcquire()) {
    return new Response(
      JSON.stringify({ success: false, error: "Rate limit exceeded. Try again in a few seconds.", type: "rate_limit" }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": "5" } }
    );
  }

  try {
    const apiKeyFromHeader = request.headers.get("X-NeuronWriter-Key") || request.headers.get("X-API-KEY");

    if (request.method === "GET") {
      const url = new URL(request.url);
      const endpoint = url.searchParams.get("endpoint");
      const apiKey = url.searchParams.get("apiKey") || apiKeyFromHeader;

      if (!endpoint || !apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing endpoint or apiKey", type: "validation_error" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const result = await makeNeuronRequest(endpoint, "GET", apiKey);
      const httpStatus = result.success ? 200 : (result.status || 500);
      return new Response(JSON.stringify(result), {
        status: httpStatus,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      let body: ProxyRequest;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid JSON body", type: "parse_error" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      const { endpoint, method = "POST", apiKey, body: requestBody } = body;
      const finalApiKey = apiKey || apiKeyFromHeader;

      if (!endpoint) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing endpoint", type: "validation_error" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      if (!finalApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing API key", type: "validation_error" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      let timeout = 30000;
      if (endpoint === "/new-query") timeout = 45000;
      else if (endpoint === "/get-query") timeout = 20000;
      else if (endpoint === "/list-queries" || endpoint === "/list-projects") timeout = 15000;

      const result = await makeNeuronRequest(endpoint, method, finalApiKey, requestBody, timeout);
      const httpStatus = result.success ? 200 : (result.status || 500);
      return new Response(JSON.stringify(result), {
        status: httpStatus,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed", type: "method_error" }),
      { status: 405, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage, type: "internal_error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
};
