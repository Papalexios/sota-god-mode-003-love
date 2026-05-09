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
    if (r) {
      // Strip heavy / sensitive fields before writing to localStorage.
      const { currentHtml: _h, apiKeys: _k, serperKey: _s, ...persistable } = r;
      localStorage.setItem("wpco:lastFactCheck", JSON.stringify(persistable));
    }
  } catch { /* ignore */ }
  subs.forEach(fn => { try { fn(r); } catch { /* ignore */ } });
}

/** Patch the in-memory report (skips localStorage rewrite of heavy fields). */
export function updateLatestFactCheckReport(patch: Partial<FactCheckReport>): void {
  if (!latest) return;
  latest = { ...latest, ...patch };
  setLatestFactCheckReport(latest);
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

// ─── Paragraph matching (draft → final) ──────────────────────────────────────
export interface ParagraphMatch {
  html: string;
  text: string;
  similarity: number; // 0..1 Jaccard over token sets
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9%$.]+/gi) || [];
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * Find the paragraph in `html` that best matches the original `draftText`.
 * Returns null when no paragraph clears the similarity threshold (claim removed).
 */
export function findBestMatchingParagraph(
  html: string,
  draftText: string,
  threshold = 0.25,
): ParagraphMatch | null {
  const blocks = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  const draftTokens = tokenize(draftText);
  let best: ParagraphMatch | null = null;
  for (const raw of blocks) {
    const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    const sim = jaccard(draftTokens, tokenize(text));
    if (!best || sim > best.similarity) best = { html: raw, text, similarity: sim };
  }
  return best && best.similarity >= threshold ? best : null;
}

// ─── Word-level diff (LCS) ───────────────────────────────────────────────────
export type DiffOp = { type: "equal" | "insert" | "delete"; text: string };

export function wordDiff(a: string, b: string): DiffOp[] {
  const aw = a.split(/(\s+)/);
  const bw = b.split(/(\s+)/);
  const m = aw.length, n = bw.length;
  // LCS DP — capped to keep memory bounded
  if (m * n > 250_000) {
    return [{ type: "delete", text: a }, { type: "insert", text: b }];
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = aw[i] === bw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  const push = (op: DiffOp) => {
    const last = ops[ops.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else ops.push(op);
  };
  while (i < m && j < n) {
    if (aw[i] === bw[j])      { push({ type: "equal",  text: aw[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push({ type: "delete", text: aw[i] }); i++; }
    else                      { push({ type: "insert", text: bw[j] }); j++; }
  }
  while (i < m) { push({ type: "delete", text: aw[i++] }); }
  while (j < n) { push({ type: "insert", text: bw[j++] }); }
  return ops;
}

// ─── Single-claim re-check ──────────────────────────────────────────────────
export interface RecheckResult {
  ok: boolean;
  message?: string;
  claim?: FactCheckClaim;
  /** Updated full HTML, when reconciliation replaced the matching paragraph. */
  updatedHtml?: string;
}

export interface RecheckEngine {
  generateWithModel: (params: any) => Promise<{ content: string }>;
}

/**
 * Re-runs Serper (cache-bypassed) for one claim and asks the model to
 * reconcile only the matching paragraph in `currentHtml`. Updates the
 * latest report in-place with new sources, outcome, and paragraph snapshots.
 */
export async function recheckClaim(args: {
  index: number;
  engine: RecheckEngine;
}): Promise<RecheckResult> {
  const report = getLatestFactCheckReport();
  if (!report) return { ok: false, message: "No fact-check report in memory." };
  const claim = report.claims.find(c => c.index === args.index);
  if (!claim) return { ok: false, message: `Claim #${args.index + 1} not found.` };
  if (!report.serperKey) return { ok: false, message: "Serper API key missing — cannot re-check." };
  if (!report.currentHtml) return { ok: false, message: "Current article HTML missing — generate again first." };
  if (!report.model) return { ok: false, message: "Model context missing — generate again first." };

  const queryText = claim.claim.slice(0, 140);
  const query = `${report.keyword} ${queryText}`;

  // 1) Fresh Serper call (bypass cache, then refresh cache on success).
  const t0 = Date.now();
  let sources: FactCheckSource[] = [];
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": report.serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    if (!res.ok) return { ok: false, message: `Serper HTTP ${res.status}` };
    const data = await res.json();
    sources = (data.organic || []).slice(0, 5).map((o: any) => ({
      title: o.title || "", snippet: o.snippet || "", link: o.link || "",
    }));
    if (sources.length) setCachedSerper(buildSerperCacheKey(report.keyword, claim.claim), sources);
  } catch (e: any) {
    return { ok: false, message: `Serper error: ${e?.message || e}` };
  }

  if (sources.length === 0) {
    Object.assign(claim, {
      sources, query, cached: false,
      latencyMs: Date.now() - t0, recheckedAt: Date.now(),
      outcome: "unverified" as FactCheckOutcome,
    });
    setLatestFactCheckReport({ ...report });
    return { ok: true, message: "No live evidence found.", claim };
  }

  // 2) Identify the paragraph in current HTML to rewrite.
  const target = findBestMatchingParagraph(
    report.currentHtml,
    claim.finalText || claim.claim,
    0.2,
  );
  if (!target) {
    Object.assign(claim, {
      sources, query, cached: false,
      latencyMs: Date.now() - t0, recheckedAt: Date.now(),
      outcome: "removed" as FactCheckOutcome,
      finalParagraphHtml: "",
      finalText: "",
    });
    setLatestFactCheckReport({ ...report });
    return { ok: true, message: "Claim no longer present in article.", claim };
  }

  // 3) Focused reconciliation prompt — single paragraph only.
  const evidenceBlock = sources.map(s => `- ${s.title}: ${s.snippet} (${s.link})`).join("\n");
  const prompt = `Re-verify this single paragraph against fresh live web evidence.
Rules:
1. If supported, keep wording but tighten it.
2. If contradicted, correct numbers/dates to match the most authoritative source (.gov / .edu / primary first).
3. If unverifiable, soften ("studies suggest", "industry estimates") or remove the unverifiable claim.
4. Never invent statistics. Preserve <p> tag and any inline links/embeds.

KEYWORD: ${report.keyword}

LIVE EVIDENCE:
${evidenceBlock}

ORIGINAL PARAGRAPH (HTML):
${target.html}

Return ONLY the rewritten <p>...</p> block.`;

  let rewritten = "";
  try {
    const result = await args.engine.generateWithModel({
      prompt,
      systemPrompt: "You are a senior fact-checker. Only output a single rewritten <p>...</p> block.",
      model: report.model as any,
      apiKeys: report.apiKeys || {},
      temperature: 0.15,
      maxTokens: 1200,
    });
    const m = result.content.match(/<p[\s\S]*?<\/p>/i);
    if (m) rewritten = m[0];
  } catch (e: any) {
    return { ok: false, message: `Model rewrite failed: ${e?.message || e}` };
  }

  if (!rewritten) {
    return { ok: false, message: "Model did not return a valid <p> block." };
  }

  const updatedHtml = report.currentHtml.replace(target.html, rewritten);
  const newText = rewritten.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const outcome: FactCheckOutcome = newText === target.text
    ? "kept"
    : classifyClaimOutcome(claim.claim, rewritten);

  Object.assign(claim, {
    sources, query, cached: false,
    latencyMs: Date.now() - t0, recheckedAt: Date.now(),
    finalParagraphHtml: rewritten,
    finalText: newText,
    outcome,
  });
  report.currentHtml = updatedHtml;
  setLatestFactCheckReport({ ...report });
  return { ok: true, message: "Claim re-checked and reconciled.", claim, updatedHtml };
}
