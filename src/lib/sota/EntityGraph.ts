// src/lib/sota/EntityGraph.ts
// Extracts named entities from SERP titles + NeuronWriter terms and measures
// how many of them appear (with cooccurrence to the primary keyword) in the
// generated article. Used by the BlogPostChecklist as `geo.entityCoverage`.

const STOPWORDS = new Set([
  'the','and','for','with','from','that','this','your','their','have','will','about',
  'which','when','where','what','have','been','into','more','than','also','they','them',
  'using','these','those','some','best','guide','top','how','why','what','vs','versus',
]);

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();

export interface EntityCandidate { entity: string; weight: number; }

/** Pull capitalized multi-word phrases + NW terms as entity candidates. */
export function extractEntityCandidates(opts: {
  serpTitles?: string[];
  paaQuestions?: string[];
  neuronTerms?: string[];
  primaryKeyword: string;
  max?: number;
}): EntityCandidate[] {
  const { serpTitles = [], paaQuestions = [], neuronTerms = [], primaryKeyword, max = 30 } = opts;
  const counts = new Map<string, number>();
  const bump = (raw: string, w = 1) => {
    const e = raw.trim();
    if (!e || e.length < 3) return;
    const k = norm(e);
    if (!k || STOPWORDS.has(k)) return;
    if (k === norm(primaryKeyword)) return;
    counts.set(k, (counts.get(k) || 0) + w);
  };

  // 1. NeuronWriter terms = highest authority
  neuronTerms.forEach(t => bump(t, 4));

  // 2. PAA questions — extract meaningful nouns
  paaQuestions.forEach(q => {
    (q.match(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+){0,3})\b/g) || []).forEach(m => bump(m, 2));
  });

  // 3. SERP competitor titles — capitalized phrases
  serpTitles.forEach(t => {
    (t.match(/\b([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]+){0,3})\b/g) || []).forEach(m => bump(m, 1));
  });

  return Array.from(counts.entries())
    .map(([entity, weight]) => ({ entity, weight }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max);
}

export interface EntityCoverageResult {
  total: number;
  covered: number;
  missing: string[];
  coverageRatio: number; // 0..1
}

export function measureEntityCoverage(html: string, entities: EntityCandidate[]): EntityCoverageResult {
  const text = norm(stripHtml(html));
  if (!entities.length) return { total: 0, covered: 0, missing: [], coverageRatio: 1 };
  const missing: string[] = [];
  let covered = 0;
  for (const { entity } of entities) {
    if (text.includes(entity)) covered++;
    else missing.push(entity);
  }
  return { total: entities.length, covered, missing, coverageRatio: covered / entities.length };
}
