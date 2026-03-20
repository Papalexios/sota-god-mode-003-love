/// <reference types="@cloudflare/workers-types" />

import { isPublicUrl } from "../../src/lib/shared/isPublicUrl";
import { getCorsHeadersForCF } from "../../src/lib/shared/corsHeaders";

interface Env {
  CORS_ALLOWED_ORIGINS?: string;
}

// ── Rate Limiter ────────────────────────────────────────────────────────────

const rateLimiter = {
  tokens: 10,
  maxTokens: 10,
  refillRate: 1,
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

  if (request.method !== "POST") {
    return jsonError("Method not allowed", 405, cors);
  }

  if (!rateLimiter.tryAcquire()) {
    return new Response(
      JSON.stringify({ success: false, error: "Rate limit exceeded", type: "rate_limit" }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json", "Retry-After": "10" } },
    );
  }

  try {
    const body: Record<string, unknown> = await request.json();

    const wordpressUrl = String(body.wordpressUrl || body.wpUrl || "").replace(/\/+$/, "");
    const username = String(body.username || body.wpUsername || "");
    const appPassword = String(body.appPassword || body.wpPassword || body.wpAppPassword || "");

    if (!wordpressUrl || !username || !appPassword) {
      return jsonError("Missing WordPress URL, username, or app password.", 400, cors);
    }

    const wpUrlWithProto = wordpressUrl.startsWith("http") ? wordpressUrl : `https://${wordpressUrl}`;
    if (!isPublicUrl(wpUrlWithProto)) {
      return jsonError("WordPress URL must be a public HTTP/HTTPS address", 400, cors);
    }

    const title = String(body.title || "");
    const content = String(body.content || "");
    const excerpt = String(body.excerpt ?? "");
    const slug = body.slug ? String(body.slug) : undefined;
    const status = String(body.status ?? "publish");
    const categories = Array.isArray(body.categories) ? body.categories : undefined;
    const tags = Array.isArray(body.tags) ? body.tags : undefined;
    const seoTitle = String(body.seoTitle || "");
    const metaDescription = String(body.metaDescription || "");
    const sourceUrl = String(body.sourceUrl || "");
    const existingPostId = body.existingPostId;

    const apiUrl = `${wpUrlWithProto}/wp-json/wp/v2/posts`;
    const auth = btoa(`${username}:${appPassword}`);
    const authHeaders: Record<string, string> = {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    let targetPostId: number | null = existingPostId ? Number(existingPostId) : null;
    if (targetPostId !== null && isNaN(targetPostId)) targetPostId = null;

    if (!targetPostId && slug) {
      try {
        const searchRes = await fetch(`${apiUrl}?slug=${encodeURIComponent(slug)}&status=any`, { headers: authHeaders });
        if (searchRes.ok) {
          const posts: Array<{ id: number }> = await searchRes.json();
          if (posts.length > 0) targetPostId = posts[0].id;
        }
      } catch { /* ignore */ }
    }

    if (!targetPostId && sourceUrl) {
      try {
        const pathMatch = sourceUrl.match(/\/([^/]+)\/?$/);
        if (pathMatch) {
          const sourceSlug = pathMatch[1].replace(/\/$/, "");
          const searchRes = await fetch(`${apiUrl}?slug=${encodeURIComponent(sourceSlug)}&status=any`, { headers: authHeaders });
          if (searchRes.ok) {
            const posts: Array<{ id: number }> = await searchRes.json();
            if (posts.length > 0) targetPostId = posts[0].id;
          }
        }
      } catch { /* ignore */ }
    }

    const postData: Record<string, unknown> = { title, content, status };
    if (excerpt) postData.excerpt = excerpt;
    if (slug) {
      postData.slug = slug.replace(/^\/+|\/+$/g, "").split("/").pop() || slug;
    }
    if (categories) postData.categories = categories;
    if (tags) postData.tags = tags;

    if (metaDescription || seoTitle) {
      postData.meta = {
        _yoast_wpseo_metadesc: metaDescription || "",
        _yoast_wpseo_title: seoTitle || title,
        rank_math_description: metaDescription || "",
        rank_math_title: seoTitle || title,
        _aioseo_description: metaDescription || "",
        _aioseo_title: seoTitle || title,
      };
    }

    const targetUrl = targetPostId ? `${apiUrl}/${targetPostId}` : apiUrl;
    const method = targetPostId ? "PUT" : "POST";

    const wpRes = await fetch(targetUrl, {
      method,
      headers: authHeaders,
      body: JSON.stringify(postData),
    });

    const txt = await wpRes.text();
    let json: Record<string, unknown> = {};
    try { json = JSON.parse(txt); } catch { json = { raw: txt }; }

    if (!wpRes.ok) {
      let errorMessage = String(json?.message || `WordPress error (${wpRes.status})`);
      if (wpRes.status === 401) errorMessage = "Authentication failed. Check username and application password.";
      if (wpRes.status === 403) errorMessage = "Permission denied. Ensure the user has publish capabilities.";
      if (wpRes.status === 404) errorMessage = "WordPress REST API not found. Ensure permalinks are enabled.";
      return jsonError(errorMessage, wpRes.status, cors);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated: !!targetPostId,
        post: {
          id: json.id,
          url: json.link,
          link: json.link,
          status: json.status,
          title: (json.title as Record<string, string>)?.rendered || title,
          slug: json.slug,
        },
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return jsonError(
      isTimeout ? "Connection to WordPress timed out." : msg,
      isTimeout ? 408 : 500,
      cors,
    );
  }
};
