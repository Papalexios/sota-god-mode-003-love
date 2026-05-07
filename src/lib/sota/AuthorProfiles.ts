// src/lib/sota/AuthorProfiles.ts
// Author profile types + brand-voice fingerprint extractor.
//
// AUTHORS: structured E-E-A-T data injected into Person + Article JSON-LD and
// surfaced inside the prompt as a real byline (single biggest E-E-A-T lever).
//
// VOICE FINGERPRINT: cheap statistical features computed from 3-5 of the
// user's best existing articles. Injected into the system prompt so output
// matches the user's actual writing style instead of the default
// Hormozi/Ferriss baseline.

export interface SocialProfile {
  platform: 'linkedin' | 'twitter' | 'github' | 'scholar' | 'website' | 'other';
  url: string;
}

export interface AuthorProfile {
  id: string;
  name: string;
  bio: string;                    // 1-2 sentences for byline
  jobTitle?: string;              // "Senior SEO Strategist"
  credentials: string[];          // ["MBA", "Certified Google Ads Pro"]
  expertiseAreas: string[];       // knowsAbout
  imageUrl?: string;
  email?: string;
  social: SocialProfile[];        // → schema.org sameAs
  yearsExperience?: number;
}

export interface VoiceFingerprint {
  /** Avg words per sentence. */
  avgSentenceLength: number;
  /** Std-dev of sentence length — proxy for "burstiness". */
  sentenceLengthStdDev: number;
  /** Words per paragraph. */
  avgParagraphLength: number;
  /** Em-dashes per 1000 words. */
  emDashRate: number;
  /** Contractions per 1000 words ("don't", "won't"...). */
  contractionRate: number;
  /** Questions per 1000 words. */
  questionRate: number;
  /** First-person pronouns per 1000 words. */
  firstPersonRate: number;
  /** Type-token ratio (vocabulary richness). */
  vocabRichness: number;
  /** Top 5 sentence-opening words. */
  topOpeners: string[];
  /** Source word count used to compute. */
  sampleWords: number;
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

export function extractVoiceFingerprint(samples: string[]): VoiceFingerprint {
  const text = samples.map(stripHtml).join('\n\n').replace(/\s+/g, ' ').trim();

  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.split(/\s+/).length >= 3);
  const sentenceLens = sentences.map(s => s.split(/\s+/).length);
  const avgSentence = sentenceLens.length
    ? sentenceLens.reduce((a, b) => a + b, 0) / sentenceLens.length
    : 0;
  const variance = sentenceLens.length
    ? sentenceLens.reduce((s, l) => s + (l - avgSentence) ** 2, 0) / sentenceLens.length
    : 0;
  const stdDev = Math.sqrt(variance);

  const paragraphs = text.split(/\n{2,}|(?<=[.!?])\s{4,}/).filter(p => p.trim().length > 0);
  const avgPara = paragraphs.length
    ? paragraphs.reduce((s, p) => s + p.split(/\s+/).length, 0) / paragraphs.length
    : 0;

  const words = text.split(/\s+/).filter(Boolean);
  const wc = words.length || 1;
  const per1k = (count: number) => Math.round((count / wc) * 1000 * 10) / 10;

  const emDashes = (text.match(/—|--/g) || []).length;
  const contractions = (text.match(/\b\w+'(?:t|s|re|ve|ll|d|m)\b/gi) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const firstPerson = (text.match(/\b(?:I|I've|I'm|I'll|I'd|my|me|mine|we|our|us)\b/g) || []).length;

  const lower = words.map(w => w.toLowerCase().replace(/[^a-z']/g, '')).filter(Boolean);
  const unique = new Set(lower).size;
  const ttr = lower.length ? unique / lower.length : 0;

  const openers = new Map<string, number>();
  for (const s of sentences) {
    const first = s.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z']/g, '');
    if (first && first.length > 0) openers.set(first, (openers.get(first) || 0) + 1);
  }
  const topOpeners = Array.from(openers.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(e => e[0]);

  return {
    avgSentenceLength: Math.round(avgSentence * 10) / 10,
    sentenceLengthStdDev: Math.round(stdDev * 10) / 10,
    avgParagraphLength: Math.round(avgPara),
    emDashRate: per1k(emDashes),
    contractionRate: per1k(contractions),
    questionRate: per1k(questions),
    firstPersonRate: per1k(firstPerson),
    vocabRichness: Math.round(ttr * 1000) / 1000,
    topOpeners,
    sampleWords: wc,
  };
}

/** Render the fingerprint as a directive block to inject into the system prompt. */
export function buildVoiceFingerprintDirective(fp: VoiceFingerprint): string {
  return `
BRAND VOICE FINGERPRINT — match these statistical patterns from the user's existing top-performing articles:
- Average sentence length: ${fp.avgSentenceLength} words (std dev ${fp.sentenceLengthStdDev}).
- Average paragraph length: ${fp.avgParagraphLength} words.
- Em-dash usage: ${fp.emDashRate} per 1000 words. Match this rate.
- Contraction usage: ${fp.contractionRate} per 1000 words. Match this rate.
- Question rate: ${fp.questionRate} per 1000 words.
- First-person pronoun rate: ${fp.firstPersonRate} per 1000 words.
- Vocabulary richness (type-token ratio): ${fp.vocabRichness}.
- Common sentence openers in this voice: ${fp.topOpeners.join(', ')}.
Hit these targets within ±15%. Do not exceed the user's natural sentence length.
`;
}

/** Convert AuthorProfile to the EEATProfile.author shape used by SchemaGenerator. */
export function authorProfileToEEAT(a: AuthorProfile) {
  return {
    name: a.name,
    credentials: a.credentials || [],
    publications: [],
    expertiseAreas: a.expertiseAreas || [],
    socialProfiles: (a.social || []).map(s => ({ platform: s.platform, url: s.url })),
    bio: a.bio,
    jobTitle: a.jobTitle,
    imageUrl: a.imageUrl,
  };
}
