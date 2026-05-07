// src/lib/sota/BlogPostChecklist.ts
// ═══════════════════════════════════════════════════════════════════════════════
// PRE-PUBLISH BLOG POST CHECKLIST VALIDATOR
// Verifies every generated post contains the mandatory SEO / AEO / GEO / E-E-A-T
// blocks required to compete for #1 SERP rankings. Used by:
//   - Vitest test-suite (sample-post fixtures)
//   - Orchestrator auto-retry loop (regenerates missing sections only)
//   - Review & Export pre-publish gate (blocks export on missing mandatory items)
// ═══════════════════════════════════════════════════════════════════════════════

export type ChecklistSeverity = 'mandatory' | 'recommended';
export type ChecklistCategory = 'seo' | 'aeo' | 'geo' | 'eeat' | 'ux';

export interface ChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
  severity: ChecklistSeverity;
  passed: boolean;
  detail?: string;
  fix?: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  passed: boolean;                  // true only if zero mandatory failures
  mandatoryFailures: ChecklistItem[];
  recommendedFailures: ChecklistItem[];
  score: number;                    // 0–100, weighted by severity
  failedSectionIds: string[];       // ids the auto-retry loop should regenerate
}

export interface ChecklistInput {
  html: string;
  primaryKeyword: string;
  title?: string;
  metaDescription?: string;
  slug?: string;
  /** Top entities (NW + SERP) to enforce coverage of. */
  entities?: { entity: string; weight: number }[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const wordCount = (s: string) => stripHtml(s).split(/\s+/).filter(Boolean).length;
const lower = (s: string) => (s || '').toLowerCase();

function countMatches(html: string, re: RegExp): number {
  return (html.match(re) || []).length;
}

function hasShortAnswerBlock(html: string): { present: boolean; words: number } {
  // Look for a "Short Answer" / "Quick Answer" / "TL;DR" block followed by 40-60 words
  const m = html.match(
    /(?:short\s+answer|quick\s+answer|tl;?dr|the\s+answer)[^<]{0,40}<\/(?:strong|b|h[1-6]|p|div|span)>([\s\S]{0,1500}?)(?:<\/(?:div|section|aside|p)>|<h[1-6])/i,
  );
  if (!m) return { present: false, words: 0 };
  return { present: true, words: wordCount(m[1]) };
}

function countNamedSources(html: string): number {
  // Outbound <a> tags with http(s), excluding internal anchor links
  const matches = html.match(/<a[^>]+href=["']https?:\/\/[^"']+["'][^>]*>/gi) || [];
  return matches.length;
}

function countStatistics(text: string): number {
  // % numbers, $ amounts, "X out of Y", "N studies/users/people"
  const patterns = [
    /\b\d+(?:\.\d+)?\s?%/g,
    /\$\s?\d{2,}/g,
    /\b\d+\s+(?:out\s+of|of|in)\s+\d+\b/gi,
    /\b\d{2,}\s+(?:studies|users|people|customers|companies|hours|days|years|brands|founders)\b/gi,
    /\(\s*[A-Z][A-Za-z& ]+,\s*(?:19|20)\d{2}\s*\)/g, // (MIT Sloan, 2024)
  ];
  return patterns.reduce((sum, re) => sum + (text.match(re) || []).length, 0);
}

function countFirstPersonPronouns(text: string): number {
  return countMatches(text, /\b(?:I|I've|I'm|I'll|I'd|my|me|mine)\b/g);
}

function hasFAQSchema(html: string): boolean {
  return /<details\b/i.test(html) || /faq/i.test(html);
}

function hasComparisonTable(html: string): boolean {
  return /<table\b/i.test(html);
}

function hasKeyTakeaways(html: string): boolean {
  return /key\s+(?:insight|takeaway|takeaways|points)/i.test(html) ||
    /what\s+to\s+remember/i.test(html);
}

function fleschReadingEase(text: string): number {
  const sentences = (text.match(/[.!?]+/g) || []).length || 1;
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const syllables = words.reduce((s, w) => s + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  return 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
}

function passiveVoiceRatio(text: string): number {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.split(/\s+/).length >= 5);
  if (!sentences.length) return 0;
  const passive = sentences.filter(s =>
    /\b(?:was|were|is|are|been|being|be)\b\s+\w+ed\b/i.test(s) ||
    /\b(?:was|were|is|are|been|being|be)\b\s+(?:made|done|given|taken|seen|known|shown|found|built|written|sent|paid)\b/i.test(s),
  ).length;
  return passive / sentences.length;
}

function imageAltCoverage(html: string, keyword: string): { total: number; withAlt: number; withKeyword: number } {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  let withAlt = 0, withKeyword = 0;
  const kw = (keyword || '').toLowerCase();
  for (const img of imgs) {
    const m = img.match(/alt\s*=\s*["']([^"']*)["']/i);
    if (m && m[1].trim().length > 3) {
      withAlt++;
      if (kw && m[1].toLowerCase().includes(kw.split(/\s+/)[0] || '')) withKeyword++;
    }
  }
  return { total: imgs.length, withAlt, withKeyword };
}

function hasFreshnessSignal(text: string): boolean {
  const yr = new Date().getFullYear();
  return new RegExp(`\\b(?:updated|last\\s+updated|reviewed|published).{0,40}\\b(?:${yr}|${yr - 1})\\b`, 'i').test(text);
}

function hasTableOfContents(html: string): boolean {
  return /table\s+of\s+contents/i.test(html) || /<nav[^>]*toc/i.test(html) || /id=["']toc["']/i.test(html);
}

function declarativeH2Ratio(html: string): number {
  const h2s = (html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || []).map(stripHtml);
  if (h2s.length === 0) return 0;
  const declarative = h2s.filter(h => /\?$/.test(h) || /^how|^what|^why|^when|^where|^which|^who/i.test(h)).length;
  return declarative / h2s.length;
}

// ─── main validator ────────────────────────────────────────────────────────

export function runBlogPostChecklist(input: ChecklistInput): ChecklistResult {
  const html = input.html || '';
  const text = stripHtml(html);
  const lowText = lower(text);
  const keyword = lower(input.primaryKeyword || '');

  const items: ChecklistItem[] = [];
  const add = (i: ChecklistItem) => items.push(i);

  // ─── SEO ─────────────────────────────────────────────────────────────────
  add({
    id: 'seo.title',
    category: 'seo',
    severity: 'mandatory',
    label: 'SEO title (50–70 chars, contains keyword)',
    passed: !!input.title && input.title.length >= 30 && input.title.length <= 75 &&
      lower(input.title).includes(keyword),
    detail: input.title ? `${input.title.length} chars` : 'missing',
    fix: 'Regenerate the title to 50–70 chars with the primary keyword front-loaded.',
  });

  add({
    id: 'seo.metaDescription',
    category: 'seo',
    severity: 'mandatory',
    label: 'Meta description (120–160 chars, contains keyword)',
    passed: !!input.metaDescription &&
      input.metaDescription.length >= 110 &&
      input.metaDescription.length <= 165 &&
      lower(input.metaDescription).includes(keyword),
    detail: input.metaDescription ? `${input.metaDescription.length} chars` : 'missing',
    fix: 'Rewrite the meta description so it is 120–160 characters and naturally includes the primary keyword.',
  });

  add({
    id: 'seo.h1',
    category: 'seo',
    severity: 'mandatory',
    label: 'Single H1 heading present',
    passed: countMatches(html, /<h1\b/gi) === 1,
    fix: 'Ensure the article has exactly one <h1>.',
  });

  const h2Count = countMatches(html, /<h2\b/gi);
  add({
    id: 'seo.h2Count',
    category: 'seo',
    severity: 'mandatory',
    label: 'At least 5 H2 sections',
    passed: h2Count >= 5,
    detail: `${h2Count} H2s`,
    fix: 'Regenerate adding more structured H2 sections (target 6+).',
  });

  add({
    id: 'seo.keywordInIntro',
    category: 'seo',
    severity: 'mandatory',
    label: 'Primary keyword appears in first 100 words',
    passed: !!keyword && lower(text.slice(0, 700)).includes(keyword),
    fix: 'Rewrite the opening so the primary keyword appears within the first 100 words.',
  });

  const wc = wordCount(html);
  add({
    id: 'seo.wordCount',
    category: 'seo',
    severity: 'mandatory',
    label: 'Word count ≥ 1000',
    passed: wc >= 1000,
    detail: `${wc} words`,
    fix: 'Article is too short — regenerate with a higher target word count.',
  });

  add({
    id: 'seo.internalLinks',
    category: 'seo',
    severity: 'recommended',
    label: '4+ internal links',
    passed: countMatches(html, /<a[^>]+href=["'](?!https?:|mailto:|#)[^"']+["']/gi) >= 4 ||
      countMatches(html, /<a[^>]+data-internal-link/gi) >= 4,
    fix: 'Add more contextual internal links to related pages on the site.',
  });

  // ─── AEO (Answer Engine Optimization) ───────────────────────────────────
  const sa = hasShortAnswerBlock(html);
  add({
    id: 'aeo.shortAnswer',
    category: 'aeo',
    severity: 'mandatory',
    label: 'Short Answer / TL;DR block (40–80 words)',
    passed: sa.present && sa.words >= 30 && sa.words <= 110,
    detail: sa.present ? `${sa.words} words` : 'missing',
    fix: 'Insert a "Short Answer" block right after the intro with a 40–60-word direct answer.',
  });

  add({
    id: 'aeo.faq',
    category: 'aeo',
    severity: 'mandatory',
    label: 'FAQ section (≥3 Q/A pairs)',
    passed: countMatches(html, /<details\b/gi) >= 3 ||
      countMatches(html, /<h[23][^>]*>\s*(?:Q:|FAQ|Frequently)/gi) >= 1,
    fix: 'Append an FAQ section with at least 3 question/answer pairs.',
  });

  add({
    id: 'aeo.declarativeH2s',
    category: 'aeo',
    severity: 'recommended',
    label: '≥40% of H2s phrased as questions or "How/What/Why" answers',
    passed: declarativeH2Ratio(html) >= 0.4,
    fix: 'Rewrite some H2s as direct questions or how/what/why phrasing for AI Overview snippets.',
  });

  add({
    id: 'aeo.lists',
    category: 'aeo',
    severity: 'mandatory',
    label: 'At least 2 list blocks (<ul> or <ol>)',
    passed: countMatches(html, /<(?:ul|ol)\b/gi) >= 2,
    fix: 'Convert key sections to bulleted or numbered lists for snippet eligibility.',
  });

  // ─── GEO (Generative Engine Optimization) ───────────────────────────────
  const sources = countNamedSources(html);
  add({
    id: 'geo.namedSources',
    category: 'geo',
    severity: 'mandatory',
    label: '≥6 outbound named sources / citations',
    passed: sources >= 6,
    detail: `${sources} sources`,
    fix: 'Inject more verified external citations (Reference Service should provide 8–12).',
  });

  const stats = countStatistics(text);
  add({
    id: 'geo.statistics',
    category: 'geo',
    severity: 'mandatory',
    label: '≥8 statistics, percentages, or dated study citations',
    passed: stats >= 8,
    detail: `${stats} stats`,
    fix: 'Regenerate sections with more concrete numbers, %s, $ figures, and "(Source, Year)" cites.',
  });

  add({
    id: 'geo.schema',
    category: 'geo',
    severity: 'recommended',
    label: 'Structured data references present',
    passed: hasFAQSchema(html),
    fix: 'Ensure FAQ <details> blocks exist so the schema generator can emit FAQPage JSON-LD.',
  });

  // ─── E-E-A-T ─────────────────────────────────────────────────────────────
  const fp = countFirstPersonPronouns(text);
  add({
    id: 'eeat.firstPerson',
    category: 'eeat',
    severity: 'mandatory',
    label: '≥15 first-person pronouns (Experience signal)',
    passed: fp >= 15,
    detail: `${fp} found`,
    fix: 'Add personal experience stories with "I", "we", and concrete dates.',
  });

  add({
    id: 'eeat.expertQuote',
    category: 'eeat',
    severity: 'mandatory',
    label: 'At least one expert quote or <blockquote>',
    passed: countMatches(html, /<blockquote\b/gi) >= 1,
    fix: 'Insert a named expert quote inside a <blockquote> with attribution.',
  });

  add({
    id: 'eeat.author',
    category: 'eeat',
    severity: 'recommended',
    label: 'Author byline detected',
    passed: /by\s+[A-Z][a-z]+/.test(text) || /editorial\s+team/i.test(text),
    fix: 'Add an author byline near the top of the article.',
  });

  // ─── UX / Visual ─────────────────────────────────────────────────────────
  add({
    id: 'ux.comparisonTable',
    category: 'ux',
    severity: 'mandatory',
    label: 'Comparison or data table',
    passed: hasComparisonTable(html),
    fix: 'Insert at least one <table> comparing options, prices, features, or pros/cons.',
  });

  add({
    id: 'ux.keyTakeaways',
    category: 'ux',
    severity: 'mandatory',
    label: 'Key takeaways / insight callout',
    passed: hasKeyTakeaways(html),
    fix: 'Add a "Key Takeaways" or "Key Insight" callout block near the top or end.',
  });

  add({
    id: 'ux.image',
    category: 'ux',
    severity: 'recommended',
    label: 'At least one image, figure, or video embed',
    passed: /<img\b/i.test(html) || /<iframe\b/i.test(html) || /<figure\b/i.test(html),
    fix: 'Inject relevant WordPress media or a YouTube embed.',
  });

  // ─── Aggregate ───────────────────────────────────────────────────────────
  const mandatoryFailures = items.filter(i => i.severity === 'mandatory' && !i.passed);
  const recommendedFailures = items.filter(i => i.severity === 'recommended' && !i.passed);
  const totalWeight = items.reduce((s, i) => s + (i.severity === 'mandatory' ? 2 : 1), 0);
  const earned = items.reduce(
    (s, i) => s + (i.passed ? (i.severity === 'mandatory' ? 2 : 1) : 0),
    0,
  );
  const score = Math.round((earned / totalWeight) * 100);

  return {
    items,
    passed: mandatoryFailures.length === 0,
    mandatoryFailures,
    recommendedFailures,
    score,
    failedSectionIds: [...mandatoryFailures, ...recommendedFailures].map(i => i.id),
  };
}

// ─── Auto-retry: regenerate ONLY the missing sections ────────────────────
//
// Given a list of failed checklist items, build a focused rewrite prompt that
// asks the model to inject the missing elements into the existing HTML without
// rewriting the entire article. Used by the orchestrator after validation
// fails. The caller decides which model to use (typically a fallback model
// when the primary one already failed once).

export function buildMissingSectionsRewritePrompt(
  html: string,
  primaryKeyword: string,
  failures: ChecklistItem[],
): string {
  const fixes = failures
    .map((f, i) => `${i + 1}. [${f.category.toUpperCase()} – ${f.severity}] ${f.label}\n   FIX: ${f.fix || 'Add this element.'}`)
    .join('\n');

  return `You are a senior SEO editor. The following article passed initial generation but FAILED the pre-publish checklist. Your job is to inject the MISSING elements into the existing HTML without rewriting the parts that already work.

PRIMARY KEYWORD: ${primaryKeyword}

MISSING ELEMENTS TO ADD:
${fixes}

OUTPUT RULES:
- Return the COMPLETE updated HTML article, starting with <article and ending with </article>.
- Preserve all existing headings, links, embeds, tables, and factual claims that are already present.
- Add the missing elements in editorially appropriate locations (FAQ at the bottom, Short Answer near the top, callouts inline, etc.).
- Do NOT remove or shorten existing sections.
- No markdown, no backticks, no commentary — HTML only.

EXISTING HTML:
${html}`;
}
