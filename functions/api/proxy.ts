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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const cors = getCorsHeadersForCF(origin, env.CORS_ALLOWED_ORIGINS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return jsonError("Missing url parameter", 400, cors);
  }

  if (!isPublicUrl(targetUrl)) {
    return jsonError("URL must be a public HTTP/HTTPS address", 400, cors);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SOTA-Bot/3.0)",
        Accept: "application/xml, text/xml, text/html, */*",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

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
    const message = error instanceof Error ? error.message : "Failed to fetch upstream URL";
    const isTimeout = message.includes("abort");
    return jsonError(
      isTimeout ? "Request timed out" : message,
      isTimeout ? 408 : 500,
      cors,
    );
  }
};
