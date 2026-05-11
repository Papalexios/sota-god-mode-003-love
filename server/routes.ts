// server/routes.ts
// SOTA God Mode - Enterprise Routes v3.0

import { TTLCache, CircuitBreaker } from "./cache";
import type { Express, Request, Response } from "express";
import { db } from "./db";
import { generatedBlogPosts } from "../shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { publishToWordPress, type WordPressPublishPayload } from "../src/lib/wordpress/publish";
import { isPublicUrl } from "../src/lib/shared/isPublicUrl";

const sitemapCache = new TTLCache<string>(5 * 60_000, 200);
const neuronWriterBreaker = new CircuitBreaker({ name: "NeuronWriter", failureThreshold: 5, resetTimeoutMs: 60_000 });
const wordPressBreaker = new CircuitBreaker({ name: "WordPress", failureThreshold: 3, resetTimeoutMs: 30_000 });

const NEURON_API_BASE = "https://app.neuronwriter.com/neuron-api/0.5/writer";
const ALLOWED_NEURON_ENDPOINTS = new Set(["/list-projects", "/list-queries", "/new-query", "/get-query", "/get-content", "/set-content"]);

// ═══════════════════════════════════════════════════════════════════
// STANDARD ERROR RESPONSE
// ═══════════════════════════════════════════════════════════════════

interface ApiError {
  success: false;
  error: string;
  type?: string;
  status?: number;
}

function errorResponse(res: Response, statusCode: number, message: string, type?: string): void {
  const body: ApiError = { success: false, error: message };
  if (type) body.type = type;
  body.status = statusCode;
  res.status(statusCode).json(body);
}

// ═══════════════════════════════════════════════════════════════════
// FETCH WITH TIMEOUT HELPER
// ═══════════════════════════════════════════════════════════════════

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30_000,
): Promise<globalThis.Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION
// ═══════════════════════════════════════════════════════════════════

export function registerRoutes(app: Express): void {
  // ─── Blog Posts CRUD (requires DB) ─────────────────────────────
  if (db) {
    app.get("/api/blog-posts", async (req: Request, res: Response) => {
      try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
        const offset = Math.max(Number(req.query.offset) || 0, 0);

        const posts = await db!
          .select()
          .from(generatedBlogPosts)
          .orderBy(desc(generatedBlogPosts.generatedAt))
          .limit(limit)
          .offset(offset);

        const countResult = await db!
          .select({ count: sql<number>`count(*)::int` })
          .from(generatedBlogPosts);

        const total = countResult[0]?.count ?? 0;

        const store: Record<string, unknown> = {};
        for (const row of posts) {
          store[row.itemId] = {
            id: row.id,
            title: row.title,
            seoTitle: row.seoTitle,
            content: row.content,
            metaDescription: row.metaDescription,
            slug: row.slug,
            primaryKeyword: row.primaryKeyword,
            secondaryKeywords: row.secondaryKeywords || [],
            wordCount: row.wordCount,
            qualityScore: row.qualityScore || {
              overall: 0,
              readability: 0,
              seo: 0,
              eeat: 0,
              uniqueness: 0,
              factAccuracy: 0,
            },
            internalLinks: row.internalLinks || [],
            schema: row.schema,
            serpAnalysis: row.serpAnalysis,
            neuronWriterQueryId: row.neuronwriterQueryId,
            generatedAt: row.generatedAt?.toISOString(),
            model: row.model,
          };
        }

        res.json({ success: true, data: store, total, limit, offset });
      } catch (error) {
        console.error("[API] Load blog posts error:", error);
        errorResponse(res, 500, "Failed to load blog posts", "database_error");
      }
    });

    app.post("/api/blog-posts", async (req: Request, res: Response) => {
      try {
        const { itemId, content } = req.body;
        if (!itemId || !content) {
          return errorResponse(res, 400, "Missing itemId or content", "validation_error");
        }

        await db!
          .insert(generatedBlogPosts)
          .values({
            id: content.id,
            itemId,
            title: content.title,
            seoTitle: content.seoTitle,
            content: content.content,
            metaDescription: content.metaDescription,
            slug: content.slug,
            primaryKeyword: content.primaryKeyword,
            secondaryKeywords: content.secondaryKeywords,
            wordCount: content.wordCount,
            qualityScore: content.qualityScore,
            internalLinks: content.internalLinks,
            schema: content.schema,
            serpAnalysis: content.serpAnalysis,
            neuronwriterQueryId: content.neuronWriterQueryId,
            generatedAt: content.generatedAt ? new Date(content.generatedAt) : new Date(),
            model: content.model,
          })
          .onConflictDoUpdate({
            target: generatedBlogPosts.itemId,
            set: {
              title: content.title,
              seoTitle: content.seoTitle,
              content: content.content,
              metaDescription: content.metaDescription,
              slug: content.slug,
              primaryKeyword: content.primaryKeyword,
              secondaryKeywords: content.secondaryKeywords,
              wordCount: content.wordCount,
              qualityScore: content.qualityScore,
              internalLinks: content.internalLinks,
              schema: content.schema,
              serpAnalysis: content.serpAnalysis,
              neuronwriterQueryId: content.neuronWriterQueryId,
              generatedAt: content.generatedAt ? new Date(content.generatedAt) : new Date(),
              model: content.model,
              updatedAt: new Date(),
            },
          });

        res.json({ success: true });
      } catch (error) {
        console.error("[API] Save blog post error:", error);
        errorResponse(res, 500, "Failed to save blog post", "database_error");
      }
    });

    app.delete("/api/blog-posts/:itemId", async (req: Request, res: Response) => {
      try {
        const { itemId } = req.params;
        if (!itemId) {
          return errorResponse(res, 400, "Missing itemId", "validation_error");
        }
        await db!.delete(generatedBlogPosts).where(eq(generatedBlogPosts.itemId, itemId as string));
        res.json({ success: true });
      } catch (error) {
        console.error("[API] Delete blog post error:", error);
        errorResponse(res, 500, "Failed to delete blog post", "database_error");
      }
    });
  }

  // ─── NeuronWriter Proxy (with Circuit Breaker) ─────────────────
  // Register on both paths: /api/neuronwriter (canonical, matches Vercel function)
  // and /api/neuronwriter-proxy (legacy)
  const neuronWriterHandler = async (req: Request, res: Response) => {
    try {
      const { endpoint, method = "POST", apiKey, body: requestBody } = req.body;
      const apiKeyFromHeader = (req.headers["x-neuronwriter-key"] || req.headers["x-nw-api-key"] || req.headers["x-api-key"]) as string | undefined;
      const bodyApiKey = typeof requestBody?.apiKey === "string" ? requestBody.apiKey : undefined;
      const finalApiKey = apiKey || bodyApiKey || apiKeyFromHeader;

      if (!endpoint || typeof endpoint !== "string") {
        return errorResponse(res, 400, "Missing endpoint", "validation_error");
      }
      if (!finalApiKey || String(finalApiKey).trim().length < 5) {
        return errorResponse(res, 400, "Missing or invalid API key", "validation_error");
      }

      const cleanApiKey = String(finalApiKey).trim();
      // Ensure proper URL construction: base ends without slash, endpoint starts with slash
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const cleanMethod = String(method).toUpperCase();
      if (!ALLOWED_NEURON_ENDPOINTS.has(cleanEndpoint) || !["POST", "PUT"].includes(cleanMethod)) {
        return errorResponse(res, 400, "Unsupported NeuronWriter proxy request", "validation_error");
      }
      const url = `${NEURON_API_BASE}${cleanEndpoint}`;

      let timeoutMs = 45_000;
      if (cleanEndpoint === "/list-projects" || cleanEndpoint === "/list-queries") timeoutMs = 20_000;
      else if (cleanEndpoint === "/new-query") timeoutMs = 60_000;
      else if (cleanEndpoint === "/get-query") timeoutMs = 30_000;

      const result = await neuronWriterBreaker.execute(async () => {
        const fetchOptions: RequestInit = {
          method: cleanMethod,
          headers: {
            "X-API-KEY": cleanApiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "SOTAContentOptimizer/3.0",
          },
        };

        if (requestBody && (cleanMethod === "POST" || cleanMethod === "PUT")) {
          fetchOptions.body = JSON.stringify(requestBody);
        }

        const response = await fetchWithTimeout(url, fetchOptions, timeoutMs);
        const responseText = await response.text();

        let responseData: unknown;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText.substring(0, 500) };
        }

        return {
          success: response.ok,
          status: response.status,
          data: responseData,
        };
      });

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const isTimeout = message.includes("abort") || message.includes("timeout");
      const isCircuitOpen = message.includes("Circuit breaker");

      res.json({
        success: false,
        status: isCircuitOpen ? 503 : isTimeout ? 408 : 500,
        error: isCircuitOpen
          ? "NeuronWriter API is temporarily unavailable. Please wait and try again."
          : isTimeout
            ? "Request timed out. The NeuronWriter API may be slow — try again."
            : message,
        type: isCircuitOpen ? "circuit_open" : isTimeout ? "timeout" : "network_error",
      });
    }
  };
  app.post("/api/neuronwriter", neuronWriterHandler);
  app.post("/api/neuronwriter-proxy", neuronWriterHandler);

  // ─── Sitemap Fetch (with caching) ──────────────────────────────
  app.all("/api/fetch-sitemap", async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      let targetUrl: string | null = null;

      if (req.method === "GET") {
        targetUrl = req.query.url as string;
      } else if (req.method === "POST") {
        targetUrl = req.body?.url;
      }

      if (!targetUrl || typeof targetUrl !== "string") {
        return errorResponse(res, 400, "URL parameter is required", "validation_error");
      }

      if (!isPublicUrl(targetUrl)) {
        return errorResponse(res, 400, "URL must be a public HTTP/HTTPS address", "validation_error");
      }

      // Check cache
      const cached = sitemapCache.get(targetUrl);
      if (cached) {
        const elapsed = Date.now() - startTime;
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Fetch-Time", `${elapsed}ms`);
        return res.json({
          content: cached,
          contentType: "text/xml",
          url: targetUrl,
          size: cached.length,
          isXml: true,
          elapsed,
          cached: true,
        });
      }

      const response = await fetchWithTimeout(
        targetUrl,
        {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
            Accept: "application/xml, text/xml, text/html, */*",
            "Accept-Encoding": "gzip, deflate",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
          redirect: "follow",
        },
        45_000,
      );

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        return errorResponse(res, response.status, `Failed to fetch: HTTP ${response.status}`, "upstream_error");
      }

      const content = await response.text();
      const contentType = response.headers.get("content-type") || "text/plain";
      const isXml =
        contentType.includes("xml") ||
        content.trim().startsWith("<?xml") ||
        content.includes("<urlset") ||
        content.includes("<sitemapindex");

      // Cache XML sitemaps
      if (isXml) {
        sitemapCache.set(targetUrl, content, 5 * 60_000);
      }

      if (req.method === "GET" && isXml) {
        res.setHeader("Content-Type", contentType);
        res.setHeader("X-Fetch-Time", `${elapsed}ms`);
        res.setHeader("X-Cache", "MISS");
        return res.send(content);
      }

      res.json({
        content,
        contentType,
        url: targetUrl,
        size: content.length,
        isXml,
        elapsed,
        cached: false,
      });
    } catch (error: unknown) {
      const elapsed = Date.now() - startTime;
      const message = error instanceof Error ? error.message : "Unknown error";
      const isTimeout = message.includes("abort") || message.includes("timeout");
      errorResponse(
        res,
        isTimeout ? 408 : 500,
        isTimeout ? `Request timed out after ${Math.round(elapsed / 1000)}s` : message,
        isTimeout ? "timeout" : "fetch_error",
      );
    }
  });

  // ─── WordPress Media Search (REST API) ─────────────────────────
  app.post("/api/wp-media", async (req: Request, res: Response) => {
    try {
      const wpUrlRaw = String(req.body?.wpUrl || req.body?.wordpressUrl || "").trim();
      const username = String(req.body?.username || req.body?.wpUsername || "").trim();
      const appPassword = String(req.body?.appPassword || req.body?.wpAppPassword || "").trim();
      const keyword = String(req.body?.keyword || "").trim();
      const limit = Math.min(30, Math.max(2, Number(req.body?.limit ?? 20)));

      if (!wpUrlRaw) {
        return errorResponse(res, 400, "wpUrl is required", "validation_error");
      }

      const wpUrl = wpUrlRaw.startsWith("http://") || wpUrlRaw.startsWith("https://")
        ? wpUrlRaw
        : `https://${wpUrlRaw}`;

      if (!isPublicUrl(wpUrl)) {
        return errorResponse(res, 400, "WordPress URL must be a public HTTP/HTTPS address", "validation_error");
      }

      const originUrl = new URL(wpUrl).origin;
      const baseHeaders: Record<string, string> = {
        Accept: "application/json",
        "User-Agent": "SOTA-MediaFetcher/1.1",
      };
      const hasAuth = !!(username && appPassword);
      const authHeaders: Record<string, string> = hasAuth
        ? {
            ...baseHeaders,
            Authorization: `Basic ${Buffer.from(`${username}:${appPassword}`, "utf8").toString("base64")}`,
          }
        : baseHeaders;

      const fields = "id,source_url,alt_text,title,caption,description,media_type,mime_type,media_details,date";

      const fetchPage = async (url: string): Promise<any[]> => {
        const run = async (headers: Record<string, string>) => {
          try {
            const response = await fetchWithTimeout(url, { method: "GET", headers }, 12_000);
            const json: unknown = await response.json().catch(() => null);
            return {
              ok: response.ok,
              status: response.status,
              items: Array.isArray(json) ? (json as any[]) : [],
            };
          } catch {
            return { ok: false, status: 0, items: [] as any[] };
          }
        };

        const first = await run(authHeaders);
        if (first.ok && first.items.length > 0) return first.items;

        if (hasAuth && (first.status === 401 || first.status === 403)) {
          const retry = await run(baseHeaders);
          if (retry.ok) return retry.items;
        }

        return first.items;
      };

      const buildSearchTerms = (input: string): string[] => {
        const parts = input
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 2);
        const unique = Array.from(new Set(parts)).slice(0, 4);
        if (unique.length === 0 && input.trim()) return [input.trim()];
        return unique;
      };

      const terms = buildSearchTerms(keyword);
      const searchUrls = terms.map(
        (term) => `${originUrl}/wp-json/wp/v2/media?per_page=40&page=1&search=${encodeURIComponent(term)}&_fields=${fields}`,
      );
      const fallbackLatest = `${originUrl}/wp-json/wp/v2/media?per_page=40&page=1&_fields=${fields}`;

      const results = await Promise.all([
        ...searchUrls.map((u) => fetchPage(u)),
        fetchPage(fallbackLatest),
      ]);

      const dedup = new Map<number, any>();
      for (const item of results.flat()) {
        const id = Number(item?.id || 0);
        if (!id) continue;
        if (!dedup.has(id)) dedup.set(id, item);
      }

      const images = Array.from(dedup.values())
        .filter((item) => {
          const sourceUrl = String(item?.source_url || "");
          const mediaType = String(item?.media_type || "");
          const mimeType = String(item?.mime_type || "");
          return sourceUrl.startsWith("http") && (mediaType === "image" || mimeType.startsWith("image/"));
        })
        .slice(0, limit);

      res.json({ success: true, images, total: images.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      errorResponse(res, 500, message, "server_error");
    }
  });

  // ─── WordPress Publish (with Circuit Breaker) ──────────────────
  app.post("/api/wordpress-publish", async (req: Request, res: Response) => {
    try {
      const payload: WordPressPublishPayload = req.body;

      if (!payload.wpUrl || !payload.username || !payload.appPassword || !payload.title || !payload.content) {
        return errorResponse(res, 400, "Missing required fields: wpUrl, username, appPassword, title, content", "validation_error");
      }

      let baseUrl = payload.wpUrl.trim().replace(/\/+$/, "");
      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }

      if (!isPublicUrl(baseUrl)) {
        return errorResponse(res, 400, "WordPress URL must be a public HTTP/HTTPS address", "validation_error");
      }

      const result = await wordPressBreaker.execute(() =>
        publishToWordPress({ ...payload, wpUrl: baseUrl }),
      );

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown server error";
      const isCircuitOpen = message.includes("Circuit breaker");

      if (isCircuitOpen) {
        return errorResponse(res, 503, "WordPress is temporarily unreachable. Please wait and try again.", "circuit_open");
      }

      console.error("[WordPress] Unexpected error:", error);
      if (!res.headersSent) {
        errorResponse(res, 500, message, "server_error");
      }
    }
  });

  // ─── WP Discover ───────────────────────────────────────────────
  app.post("/api/wp-discover", async (req: Request, res: Response) => {
    try {
      const siteUrl = req.body?.siteUrl;
      if (!siteUrl || typeof siteUrl !== "string") {
        return errorResponse(res, 400, "siteUrl is required", "validation_error");
      }

      const t = siteUrl.trim();
      const withProto = t.startsWith("http://") || t.startsWith("https://") ? t : `https://${t}`;

      if (!isPublicUrl(withProto)) {
        return errorResponse(res, 400, "URL must be a public HTTP/HTTPS address", "validation_error");
      }

      const origin = new URL(withProto).origin;
      const perPage = Math.min(100, Math.max(1, Number(req.body?.perPage ?? 100)));
      const maxPages = Math.max(1, Number(req.body?.maxPages ?? 250));
      const maxUrls = Math.max(1, Number(req.body?.maxUrls ?? 100_000));
      const includePages = req.body?.includePages !== false;

      const fetchWpLinks = async (
        endpoint: "posts" | "pages",
        opts: { perPage: number; maxPages: number; maxUrls: number },
      ): Promise<string[]> => {
        const out = new Set<string>();
        const mkUrl = (page: number) =>
          `${origin}/wp-json/wp/v2/${endpoint}?per_page=${opts.perPage}&page=${page}&_fields=link`;

        const fetchPage = async (page: number) => {
          try {
            const response = await fetchWithTimeout(
              mkUrl(page),
              {
                method: "GET",
                headers: {
                  Accept: "application/json",
                  "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)",
                },
              },
              12_000,
            );

            const json: unknown = await response.json().catch(() => null);
            const totalPages = Number(response.headers.get("x-wp-totalpages")) || undefined;

            if (!response.ok || !Array.isArray(json)) return { links: [] as string[], totalPages };

            const links = (json as Array<Record<string, unknown>>)
              .filter((i) => typeof i?.link === "string" && String(i.link).startsWith("http"))
              .map((i) => String(i.link));
            return { links, totalPages };
          } catch {
            return { links: [] as string[], totalPages: undefined };
          }
        };

        const first = await fetchPage(1);
        for (const l of first.links) {
          if (out.size >= opts.maxUrls) break;
          out.add(l);
        }

        const finalPage = first.totalPages ? Math.min(first.totalPages, opts.maxPages) : opts.maxPages;
        const concurrency = 4;
        let page = 2;

        while (page <= finalPage && out.size < opts.maxUrls) {
          const batch = Array.from({ length: concurrency }, (_, i) => page + i).filter((p) => p <= finalPage);
          page += batch.length;
          const results = await Promise.all(batch.map(fetchPage));
          for (const r of results) {
            for (const l of r.links) {
              if (out.size >= opts.maxUrls) break;
              out.add(l);
            }
            if (!first.totalPages && r.links.length === 0) {
              page = finalPage + 1;
              break;
            }
          }
        }

        return Array.from(out);
      };

      const urls = new Set<string>();
      const postLinks = await fetchWpLinks("posts", { perPage, maxPages, maxUrls });
      postLinks.forEach((u) => urls.add(u));

      if (includePages && urls.size < maxUrls) {
        const pageLinks = await fetchWpLinks("pages", { perPage, maxPages, maxUrls: maxUrls - urls.size });
        pageLinks.forEach((u) => urls.add(u));
      }

      res.json({ success: true, urls: Array.from(urls), total: urls.size });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[wp-discover] Error:", msg);
      errorResponse(res, 500, msg, "server_error");
    }
  });
}
