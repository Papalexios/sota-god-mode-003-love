// src/lib/shared/isPublicUrl.ts
// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDATED SSRF PROTECTION — Single Source of Truth
// Used by: server/routes.ts, functions/api/proxy.ts, functions/api/fetch-sitemap.ts,
//          functions/api/wp-discover.ts
// ═══════════════════════════════════════════════════════════════════════════════

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "[::1]",
  "metadata.google.internal",
  "metadata.internal",
  "instance-data",
]);

export function isPublicUrl(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();

  // Blocked hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) return false;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;

  // Block IPv6 private/link-local/loopback
  if (hostname.startsWith("[")) {
    const ipv6 = hostname.slice(1, -1).toLowerCase();
    if (
      ipv6 === "::1" ||
      ipv6 === "::" ||
      ipv6.startsWith("fc") ||
      ipv6.startsWith("fd") ||
      ipv6.startsWith("fe8") ||
      ipv6.startsWith("fe9") ||
      ipv6.startsWith("fea") ||
      ipv6.startsWith("feb") ||
      ipv6.startsWith("::ffff:127.") ||
      ipv6.startsWith("::ffff:10.") ||
      ipv6.startsWith("::ffff:192.168.") ||
      ipv6.startsWith("::ffff:169.254.")
    ) {
      return false;
    }
  }

  // Block IPv4 private ranges
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    if (parts[0] === 127 || parts[0] === 10 || parts[0] === 0) return false;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
    if (parts[0] === 192 && parts[1] === 168) return false;
    if (parts[0] === 169 && parts[1] === 254) return false;
  }

  // Block numeric/hex IP representations (prevent bypass via 0x7f000001, 2130706433, etc.)
  if (/^0x[0-9a-f]+$/i.test(hostname) || /^\d+$/.test(hostname)) return false;

  return true;
}
