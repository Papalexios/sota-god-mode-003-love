/// <reference types="@cloudflare/workers-types" />

import { isPublicUrl } from "../../src/lib/shared/isPublicUrl";
import { getCorsHeadersForCF } from "../../src/lib/shared/corsHeaders";

interface Env {
  CORS_ALLOWED_ORIGINS?: string;
}

function jsonError(msg: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ success: false, error: msg, status }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface NormalizedMedia {
  id: number;
  source_url: string;
  alt_text: string;
  title: { rendered: string } | string;
  caption: { rendered: string } | string;
  description: { rendered: string } | string;
  media_type: string;
  mime_type: string;
  media_details: Record<string, unknown>;
  date?: string;
}

function normalizeMedia(item: Record<string, unknown>): NormalizedMedia {
  return {
    id: Number(item?.id || 0),
    source_url: String(item?.source_url || ""),
    alt_text: String(item?.alt_text || ""),
    title: (item?.title as { rendered: string }) || { rendered: "" },
    caption: (item?.caption as { rendered: string }) || { rendered: "" },
    description: (item?.description as { rendered: string }) || { rendered: "" },
    media_type: String(item?.media_type || ""),
    mime_type: String(item?.mime_type || ""),
    media_details: (item?.media_details as Record<string, unknown>) || {},
    date: item?.date as string | undefined,
  };
}

function buildSearchTerms(keyword: string): string[] {
  const parts = keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);

  const uniq = Array.from(new Set(parts)).slice(0, 4);
  if (uniq.length === 0 && keyword.trim()) return [keyword.trim()];
  return uniq;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = request.headers.get("origin");
  const cors = getCorsHeadersForCF(origin, env.CORS_ALLOWED_ORIGINS);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return jsonError("Method not allowed", 405, cors);
  }

  try {
    const body: Record<string, unknown> = await request.json();

    const wpUrlRaw = String(body?.wpUrl || body?.wordpressUrl || "").trim();
    const username = String(body?.username || body?.wpUsername || "").trim();
    const appPassword = String(body?.appPassword || body?.wpAppPassword || "").trim();
    const keyword = String(body?.keyword || "").trim();
    const limit = Math.min(30, Math.max(2, Number(body?.limit ?? 20)));

    if (!wpUrlRaw) {
      return jsonError("wpUrl is required", 400, cors);
    }

    const wpUrl = wpUrlRaw.startsWith("http://") || wpUrlRaw.startsWith("https://")
      ? wpUrlRaw
      : `https://${wpUrlRaw}`;

    if (!isPublicUrl(wpUrl)) {
      return jsonError("WordPress URL must be a public HTTP/HTTPS address", 400, cors);
    }

    const originUrl = new URL(wpUrl).origin;
    const baseHeaders: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "SOTA-MediaFetcher/1.1",
    };
    const hasAuth = !!(username && appPassword);
    const headers: Record<string, string> = hasAuth
      ? { ...baseHeaders, Authorization: `Basic ${btoa(`${username}:${appPassword}`)}` }
      : baseHeaders;

    const fields = "id,source_url,alt_text,title,caption,description,media_type,mime_type,media_details,date";

    const fetchPage = async (url: string): Promise<Array<Record<string, unknown>>> => {
      const run = async (reqHeaders: Record<string, string>) => {
        try {
          const res = await fetchWithTimeout(url, { method: "GET", headers: reqHeaders }, 12_000);
          const json = await res.json().catch(() => null);
          return { ok: res.ok, status: res.status, items: Array.isArray(json) ? json : [] };
        } catch {
          return { ok: false, status: 0, items: [] as Array<Record<string, unknown>> };
        }
      };

      const first = await run(headers);
      if (first.ok && first.items.length > 0) return first.items;

      if (hasAuth && (first.status === 401 || first.status === 403)) {
        const retry = await run(baseHeaders);
        if (retry.ok) return retry.items;
      }

      return first.items;
    };

    const terms = buildSearchTerms(keyword);

    const searchUrls = terms.map((term) =>
      `${originUrl}/wp-json/wp/v2/media?per_page=40&page=1&search=${encodeURIComponent(term)}&_fields=${fields}`,
    );

    const fallbackLatest = `${originUrl}/wp-json/wp/v2/media?per_page=40&page=1&_fields=${fields}`;

    const results = await Promise.all([
      ...searchUrls.map((u) => fetchPage(u)),
      fetchPage(fallbackLatest),
    ]);

    const merged = results.flat();
    const dedup = new Map<number, Record<string, unknown>>();

    for (const item of merged) {
      const id = Number(item?.id || 0);
      if (!id) continue;
      if (!dedup.has(id)) dedup.set(id, item);
    }

    const images = Array.from(dedup.values())
      .map(normalizeMedia)
      .filter((item) =>
        item.source_url.startsWith("http") &&
        (item.media_type === "image" || item.mime_type.startsWith("image/")),
      )
      .slice(0, limit);

    return new Response(JSON.stringify({ success: true, images, total: images.length }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(msg, 500, cors);
  }
};
