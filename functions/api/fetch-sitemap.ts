/// <reference types="@cloudflare/workers-types" />

import { isPublicUrl } from "../../src/lib/shared/isPublicUrl";
import { getCorsHeadersForCF } from "../../src/lib/shared/corsHeaders";

interface Env {
  CORS_ALLOWED_ORIGINS?: string;
}

function jsonError(msg: string, status: number, cors: Record<string, string>) {
  return new Response(
    JSON.stringify({ success: false, error: msg, status }),
    { status, headers: { ...cors, "Content-Type": "application/json" } },
  );
}

async function fetchWithRetry(url: string, maxRetries = 2, timeout = 20_000): Promise<Response> {
  for (let i = 0; i <= maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ContentOptimizer/3.0)",
          Accept: "application/xml, text/xml, text/html, */*",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      if (i === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const cors = getCorsHeadersForCF(origin, env.CORS_ALLOWED_ORIGINS);

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

    const response = await fetchWithRetry(targetUrl, 2, 20_000);

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
