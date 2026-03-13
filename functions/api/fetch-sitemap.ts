/// <reference types="@cloudflare/workers-types" />

import { isPublicUrl } from "../../src/lib/shared/isPublicUrl";

interface Env {
  CORS_ALLOWED_ORIGINS?: string;
}

function getCorsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const resolvedOrigin =
    allowed.length > 0 && origin && allowed.includes(origin)
      ? origin
      : allowed[0] || "";

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonError(msg: string, status: number, cors: Record<string, string>) {
  return new Response(
    JSON.stringify({ success: false, error: msg, status }),
    { status, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

async function fetchWithTimeout(url: string, timeout = 90_000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentOptimizer/3.0)",
        Accept: "application/xml, text/xml, text/html, */*",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const cors = getCorsHeaders(origin, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    let targetUrl: string | null = null;

    if (request.method === "GET") {
      const url = new URL(request.url);
      targetUrl = url.searchParams.get("url");
    } else if (request.method === "POST") {
      const body: Record<string, unknown> = await request.json();
      targetUrl = typeof body.url === "string" ? body.url : null;
    }

    if (!targetUrl) {
      return jsonError("Missing 'url' parameter", 400, cors);
    }

    if (!isPublicUrl(targetUrl)) {
      return jsonError("URL must be a public HTTP/HTTPS address", 400, cors);
    }

    const response = await fetchWithTimeout(targetUrl, 90_000);

    if (!response.ok) {
      return jsonError(
        `Upstream returned ${response.status}: ${response.statusText}`,
        response.status,
        cors,
      );
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    const text = await response.text();

    return new Response(text, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = message.includes("abort");
    return jsonError(
      isTimeout ? "Request timed out" : message,
      isTimeout ? 408 : 500,
      cors,
    );
  }
};
