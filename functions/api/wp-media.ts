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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function jsonError(msg: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ success: false, error: msg, status }), {
    status,
    headers: cors,
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

function normalizeMedia(item: any) {
  return {
    id: Number(item?.id || 0),
    source_url: String(item?.source_url || ""),
    alt_text: String(item?.alt_text || ""),
    title: item?.title || { rendered: "" },
    caption: item?.caption || { rendered: "" },
    description: item?.description || { rendered: "" },
    media_type: String(item?.media_type || ""),
    mime_type: String(item?.mime_type || ""),
    media_details: item?.media_details || {},
    date: item?.date,
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
  const cors = getCorsHeaders(origin, env);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== "POST") {
    return jsonError("Method not allowed", 405, cors);
  }

  try {
    const body = await request.json<any>();

    const wpUrlRaw = String(body?.wpUrl || body?.wordpressUrl || "").trim();
    const username = String(body?.username || body?.wpUsername || "").trim();
    const appPassword = String(body?.appPassword || body?.wpAppPassword || "").trim();
    const keyword = String(body?.keyword || "").trim();
    const limit = Math.min(30, Math.max(2, Number(body?.limit ?? 20)));

    if (!wpUrlRaw || !username || !appPassword) {
      return jsonError("wpUrl, username and appPassword are required", 400, cors);
    }

    const wpUrl = wpUrlRaw.startsWith("http://") || wpUrlRaw.startsWith("https://")
      ? wpUrlRaw
      : `https://${wpUrlRaw}`;

    if (!isPublicUrl(wpUrl)) {
      return jsonError("WordPress URL must be a public HTTP/HTTPS address", 400, cors);
    }

    const originUrl = new URL(wpUrl).origin;
    const auth = btoa(`${username}:${appPassword}`);
    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "User-Agent": "SOTA-MediaFetcher/1.0",
    };

    const fields = "id,source_url,alt_text,title,caption,description,media_type,mime_type,media_details,date";

    const fetchPage = async (url: string): Promise<any[]> => {
      try {
        const res = await fetchWithTimeout(url, { method: "GET", headers }, 12_000);
        const json = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(json)) return [];
        return json;
      } catch {
        return [];
      }
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
    const dedup = new Map<number, any>();

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
      headers: cors,
    });
  } catch (e: any) {
    return jsonError(e?.message || String(e), 500, cors);
  }
};
