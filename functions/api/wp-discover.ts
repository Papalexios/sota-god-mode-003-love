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
  return new Response(
    JSON.stringify({ success: false, error: msg, status }),
    { status, headers: cors },
  );
}

async function fetchWpLinks(
  origin: string,
  endpoint: "posts" | "pages",
  opts: { perPage: number; maxPages: number; maxUrls: number }
): Promise<string[]> {
  const perPage = Math.min(100, Math.max(1, opts.perPage));
  const maxPages = Math.max(1, opts.maxPages);
  const maxUrls = Math.max(1, opts.maxUrls);
  const out = new Set<string>();

  const mkUrl = (page: number) =>
    `${origin}/wp-json/wp/v2/${endpoint}?per_page=${perPage}&page=${page}&_fields=link`;

  const fetchPage = async (page: number) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(mkUrl(page), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
        },
        signal: controller.signal,
      });
      const json: any = await res.json().catch(() => null);
      const totalPages = Number(res.headers.get("x-wp-totalpages")) || undefined;
      if (!res.ok || !Array.isArray(json)) return { links: [] as string[], totalPages };
      const links = json
        .filter((i: any) => typeof i?.link === "string" && i.link.startsWith("http"))
        .map((i: any) => i.link);
      return { links, totalPages };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const first = await fetchPage(1);
  for (const l of first.links) {
    if (out.size >= maxUrls) break;
    out.add(l);
  }

  const finalPage = first.totalPages ? Math.min(first.totalPages, maxPages) : maxPages;
  const concurrency = 4;
  let page = 2;

  while (page <= finalPage && out.size < maxUrls) {
    const batch = Array.from({ length: concurrency }, (_, i) => page + i).filter((p) => p <= finalPage);
    page += batch.length;
    const results = await Promise.all(batch.map((p) => fetchPage(p)));
    for (const r of results) {
      for (const l of r.links) {
        if (out.size >= maxUrls) break;
        out.add(l);
      }
      if (!first.totalPages && r.links.length === 0) {
        page = finalPage + 1;
        break;
      }
    }
  }

  return Array.from(out);
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
    const siteUrl = body?.siteUrl;

    if (!siteUrl || typeof siteUrl !== "string") {
      return jsonError("siteUrl is required", 400, cors);
    }

    const t = siteUrl.trim();
    const withProto = t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;
    if (!isPublicUrl(withProto)) {
      return jsonError("URL must be a public HTTP/HTTPS address", 400, cors);
    }

    const siteOrigin = new URL(withProto).origin;
    const perPage = Number(body?.perPage ?? 100);
    const maxPages = Number(body?.maxPages ?? 250);
    const maxUrls = Number(body?.maxUrls ?? 100000);
    const includePages = body?.includePages !== false;

    const urls = new Set<string>();
    const postLinks = await fetchWpLinks(siteOrigin, "posts", { perPage, maxPages, maxUrls });
    postLinks.forEach((u) => urls.add(u));

    if (includePages && urls.size < maxUrls) {
      const pageLinks = await fetchWpLinks(siteOrigin, "pages", { perPage, maxPages, maxUrls: maxUrls - urls.size });
      pageLinks.forEach((u) => urls.add(u));
    }

    return new Response(
      JSON.stringify({ success: true, urls: Array.from(urls) }),
      { status: 200, headers: cors }
    );
  } catch (e: any) {
    return jsonError(e?.message || String(e), 500, cors);
  }
};
