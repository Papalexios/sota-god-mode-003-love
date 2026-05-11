// src/lib/shared/corsHeaders.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION CORS CONFIGURATION — replaces wildcard "*" in all endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Allowed origins for CORS. In production, restrict to your actual domains.
 * Set via CORS_ALLOWED_ORIGINS environment variable (comma-separated).
 * Falls back to permissive list for development.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://contentoptimizer.app",
  "https://www.contentoptimizer.app",
  "https://cozy-vite-starter.lovable.app",
];

function isAllowedPreviewOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}

/**
 * Build CORS headers for a given request origin.
 * Returns wildcard only if the origin matches the allowlist.
 */
export function buildCorsHeaders(
  requestOrigin: string | null,
  allowedOrigins?: string[],
): Record<string, string> {
  const origins = allowedOrigins ?? DEFAULT_ALLOWED_ORIGINS;
  const isAllowed = !!requestOrigin && (origins.includes(requestOrigin) || isAllowedPreviewOrigin(requestOrigin));

  return {
    "Access-Control-Allow-Origin": isAllowed ? requestOrigin : origins[0] || "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-NeuronWriter-Key, X-API-KEY, X-NW-Api-Key, X-NW-Endpoint",
  };
}

/**
 * For Cloudflare Pages Functions: parse allowed origins from environment or use defaults.
 * In production, set CORS_ALLOWED_ORIGINS as a Cloudflare Pages environment variable.
 */
export function getCorsHeadersForCF(
  requestOrigin: string | null,
  envOrigins?: string,
): Record<string, string> {
  const origins = envOrigins
    ? envOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;

  return buildCorsHeaders(requestOrigin, origins);
}
