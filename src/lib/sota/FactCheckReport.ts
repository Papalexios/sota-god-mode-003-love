// src/lib/sota/FactCheckReport.ts
// Shared store + cache for the live fact-check pass.
// - In-memory TTL cache for Serper lookups, keyed by (keyword + claim hash)
// - Pub/sub of the latest report so the /status page can render it
// - Robust claim-paragraph detector with scoring & false-positive filters

export interface FactCheckSource {
  title: string;
  snippet: string;
  link: string;
}

export type FactCheckOutcome =
  | "kept"        // claim survived unchanged
  | "corrected"   // wording changed in the final HTML
  | "removed"     // claim text no longer appears
  | "softened"    // changed but still present (heuristic)
  | "unverified"; // no evidence retrieved

export interface FactCheckClaim {
  index: number;
  claim: string;            // plain-text excerpt of the original draft paragraph
  query: string;            // serper query used
  sources: FactCheckSource[];
  outcome: FactCheckOutcome;
  cached: boolean;
  latencyMs?: number;
  // ─── Per-claim diff support ────────────────────────────────────────────
  originalParagraphHtml?: string; // raw <p>...</p> from the draft
  finalParagraphHtml?: string;    // best-match <p>...</p> from reconciled HTML ('' if removed)
  finalText?: string;             // plain-text version of finalParagraphHtml
  recheckedAt?: number;           // last manual re-check timestamp
}

export interface FactCheckReport {
  generatedAt: number;
  keyword: string;
  totalParagraphsScanned: number;
  candidatesDetected: number;
  claimsChecked: number;
  reconciled: boolean;          // model rewrite was applied
  claims: FactCheckClaim[];
  notes?: string;
  // ─── Re-check context (in-memory only; not persisted to localStorage) ──
  model?: string;
  apiKeys?: Record<string, string | undefined>;
  serperKey?: string;
  currentHtml?: string;         // post-reconciliation HTML, used + updated by re-check
}

// ─── Serper cache (per claim) ────────────────────────────────────────────────
interface CacheEntry { value: FactCheckSource[]; expiresAt: number }
const serperCache = new Map<string, CacheEntry>();
const SERPER_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const SERPER_MAX = 500;

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function buildSerperCacheKey(keyword: string, claimText: string): string {
  const norm = claimText.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 400);
  return `${keyword.toLowerCase().trim()}::${djb2(norm)}`;
}

export function getCachedSerper(key: string): FactCheckSource[] | undefined {
  const e = serperCache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) { serperCache.delete(key); return undefined; }
  return e.value;
}

export function setCachedSerper(key: string, value: FactCheckSource[]): void {
  if (serperCache.size >= SERPER_MAX) {
    const oldest = serperCache.keys().next().value;
    if (oldest !== undefined) serperCache.delete(oldest);
  }
  serperCache.set(key, { value, expiresAt: Date.now() + SERPER_TTL_MS });
}

// ─── Latest report store ─────────────────────────────────────────────────────
let latest: FactCheckReport | null = null;
const subs = new Set<(r: FactCheckReport | null) => void>();

export function getLatestFactCheckReport(): FactCheckReport | null { return latest; }

export function setLatestFactCheckReport(r: FactCheckReport | null): void {
  latest = r;
  try {
    if (r) localStorage.setItem("wpco:lastFactCheck", JSON.stringify(r));
  } catch { /* ignore */ }
  subs.forEach(fn => { try { fn(r); } catch { /* ignore */ } });
}

export function subscribeFactCheckReport(fn: (r: FactCheckReport | null) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function loadPersistedFactCheckReport(): FactCheckReport | null {
  try {
    const raw = localStorage.getItem("wpco:lastFactCheck");
    if (!raw) return null;
    latest = JSON.parse(raw) as FactCheckReport;
    return latest;
  } catch { return null; }
}

// ─── Claim paragraph detection ───────────────────────────────────────────────
// Goal: capture paragraphs that contain *verifiable* numerical/temporal/cited
// claims while filtering false positives like prices in product copy or
// generic year references in narrative ("since 2020 we have...").

const PATTERNS: Array<{ name: string; weight: number; re: RegExp }> = [
  // Statistics
  { name: "percent",   weight: 3, re: /\b\d{1,3}(?:\.\d+)?\s?%/ },
  { name: "ratio",     weight: 2, re: /\b\d+\s?(?:in|out of|of)\s?\d+\b/i },
  { name: "multiple",  weight: 2, re: /\b\d+(?:\.\d+)?\s?(?:x|×)\b/i },
  // Currency / large numbers
  { name: "currency",  weight: 2, re: /(?:\$|€|£|USD|EUR|GBP)\s?\d[\d,\.]*\s?(?:k|m|bn|million|billion|trillion)?\b/i },
  { name: "bigNumber", weight: 2, re: /\b\d{1,3}(?:,\d{3}){1,}\b/ },
  { name: "magnitude", weight: 2, re: /\b\d+(?:\.\d+)?\s?(?:million|billion|trillion|thousand|users|customers|companies|websites|searches|downloads)\b/i },
  // Dates
  { name: "year",      weight: 1, re: /\b(?:19[5-9]\d|20[0-4]\d)\b/ },
  { name: "monthYear", weight: 2, re: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/i },
  { name: "qtr",       weight: 2, re: /\bQ[1-4]\s?20\d{2}\b/i },
  // Citations / attributions
  { name: "according", weight: 3, re: /\baccording to\b/i },
  { name: "study",     weight: 3, re: /\b(?:study|studies|research|survey|report|whitepaper|meta-analysis|paper|trial)\b/i },
  { name: "source",    weight: 2, re: /\b(?:source|sources|cited|referenced)\s?:/i },
  { name: "experts",   weight: 2, re: /\b(?:experts|analysts|researchers|scientists)\s+(?:say|claim|argue|found|reported|estimate)/i },
  { name: "publishers",weight: 3, re: /\b(?:Gartner|Forrester|McKinsey|Statista|Pew|Nielsen|HubSpot|Ahrefs|Semrush|Backlinko|Moz|SimilarWeb)\b/i },
  // Hard quantification words near a number
  { name: "growth",    weight: 2, re: /\b\d+(?:\.\d+)?\s?%\s+(?:growth|increase|decrease|rise|drop|decline|gain|loss|improvement)/i },
];

// Patterns that should disqualify a candidate (commerce / list-y noise).
const FALSE_POSITIVE = [
  /^\s*\$?\d+(?:\.\d{2})?\s*(?:\/|per)\s*(?:mo|month|user|seat)/i, // pricing line
  /^\s*\d+\s*\.\s+/,                                                 // numbered list item
];

export interface DetectedClaimParagraph {
  raw: string;       // original <p>...</p> HTML
  text: string;      // plain text
  score: number;
  matched: string[]; // pattern names matched
}

export function detectClaimParagraphs(html: string, max = 6): DetectedClaimParagraph[] {
  const blocks = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const candidates: DetectedClaimParagraph[] = [];

  for (const raw of blocks) {
    const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 18 || wordCount > 220) continue;
    if (FALSE_POSITIVE.some(re => re.test(text))) continue;

    let score = 0;
    const matched: string[] = [];
    for (const p of PATTERNS) {
      if (p.re.test(text)) { score += p.weight; matched.push(p.name); }
    }

    // Require at least one "hard" signal: percent, currency/big number, citation,
    // dated month/year, study/according — bare 4-digit year is not enough alone.
    const hardSignals = matched.filter(m =>
      m !== "year"
    );
    if (hardSignals.length === 0) continue;
    if (score < 3) continue;

    candidates.push({ raw, text, score, matched });
  }

  // De-duplicate near-identical paragraphs (same first 80 chars).
  const seen = new Set<string>();
  const deduped: DetectedClaimParagraph[] = [];
  for (const c of candidates.sort((a, b) => b.score - a.score)) {
    const key = c.text.slice(0, 80).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
    if (deduped.length >= max) break;
  }
  return deduped;
}

// Heuristic: did `claim` survive into `finalHtml`?
export function classifyClaimOutcome(
  originalText: string,
  finalHtml: string,
): FactCheckOutcome {
  const finalText = finalHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").toLowerCase();
  const orig = originalText.toLowerCase();
  // Look for a long-ish unique slice
  const slice = orig.slice(0, Math.min(80, orig.length));
  if (finalText.includes(slice)) return "kept";
  // Try a shorter substring window
  const tokens = orig.split(/\s+/).filter(t => t.length > 4);
  const numericToken = tokens.find(t => /\d/.test(t));
  if (numericToken && finalText.includes(numericToken.toLowerCase())) return "corrected";
  // Check overlap of distinctive keywords
  const keywords = tokens.slice(0, 8);
  const hits = keywords.filter(k => finalText.includes(k.toLowerCase())).length;
  if (hits >= Math.ceil(keywords.length * 0.4)) return "softened";
  return "removed";
}
