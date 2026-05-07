// src/lib/sota/AIVisibility.ts
// Heuristic "would an LLM cite this paragraph?" scorer. No extra LLM call.
// A paragraph is "citation-worthy" when it contains at least one of:
//   - a number/percentage/$ amount
//   - a year (19xx / 20xx)
//   - a named source (capitalized 2-word phrase + comma + year, OR (Source, YYYY))
//   - a quoted phrase
//   - a "X out of Y" or "N studies/users/companies"
// We then compute the % of substantive paragraphs that pass.

const stripTags = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const PATTERNS: RegExp[] = [
  /\b\d+(?:\.\d+)?\s?%/,
  /\$\s?\d{2,}/,
  /\b(?:19|20)\d{2}\b/,
  /\b\d+\s+(?:out\s+of|of|in)\s+\d+\b/i,
  /\b\d{2,}\s+(?:studies|users|people|customers|companies|hours|days|years|brands|founders|samples|respondents)\b/i,
  /\(\s*[A-Z][A-Za-z& ]+,\s*(?:19|20)\d{2}\s*\)/,
  /"[^"]{15,}"/,
  /\b(?:according to|reported by|published in|study by|research from)\s+[A-Z]/,
];

export interface AIVisibilityResult {
  totalParagraphs: number;
  citationWorthy: number;
  ratio: number;        // 0..1
  weakParagraphs: number; // paragraphs lacking citation-worthy signals
}

export function measureAIVisibility(html: string): AIVisibilityResult {
  const paras = (html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [])
    .map(stripTags)
    .filter(t => t.split(/\s+/).length >= 25); // ignore tiny intros/CTAs

  if (paras.length === 0) {
    return { totalParagraphs: 0, citationWorthy: 0, ratio: 0, weakParagraphs: 0 };
  }

  let worthy = 0;
  for (const p of paras) {
    if (PATTERNS.some(rx => rx.test(p))) worthy++;
  }
  return {
    totalParagraphs: paras.length,
    citationWorthy: worthy,
    ratio: worthy / paras.length,
    weakParagraphs: paras.length - worthy,
  };
}
