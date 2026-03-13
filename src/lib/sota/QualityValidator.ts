// QUALITY VALIDATOR - Multi-Layer Content Validation
// 🔧 CHANGED: Added visual break validation, wall-of-text detection,
//             tighter scoring baselines, and polishReadability enhancements

import type { QualityScore, ContentMetrics, WallOfTextViolation, VisualBreakValidationResult } from './types';

// AI trigger phrases to detect and remove
const AI_TRIGGER_PHRASES = [
  // Existing ones (keep all)
  'as an ai',
  'as a language model',
  'i can\'t browse the web',
  'in this article',
  'this article will',
  'we will explore',
  'in conclusion',
  'it\'s important to note',
  'it is worth noting',
  'as we can see',
  'in today\'s world',
  'in the ever-evolving',
  'in this comprehensive guide',
  'delve into',
  'delves into',
  'dive deep into',
  'at the end of the day',
  'first and foremost',
  'needless to say',
  'without further ado',
  'in a nutshell',
  'the bottom line is',
  'to summarize',
  'in summary',
  'to sum up',
  'as mentioned earlier',
  'as previously mentioned',
  'it goes without saying',
  'interestingly enough',
  'as a matter of fact',
  'for all intents and purposes',
  'revolutionize',
  'game-changer',
  'cutting-edge',
  'state-of-the-art',
  'leverage',
  'synergy',
  'paradigm shift',
  'holistic approach',
  'robust solution',
  'seamlessly',
  'empower',
  'utilize',
  // NEW — expanded AI detection
  'it\'s worth mentioning',
  'it bears mentioning',
  'it should be noted',
  'this is particularly true',
  'this is especially true',
  'this is particularly important',
  'plays a crucial role',
  'plays a vital role',
  'plays an important role',
  'in the realm of',
  'in the landscape of',
  'navigating the complexities',
  'navigating the world of',
  'a testament to',
  'stands as a testament',
  'serves as a reminder',
  'cannot be overstated',
  'can\'t be overstated',
  'the importance of .* cannot',
  'unlock the full potential',
  'unlock the power',
  'unlock the secrets',
  'the power of',
  'harness the power',
  'tap into the power',
  'elevate your',
  'take your .* to the next level',
  'embark on a journey',
  'embark on this journey',
  'on this journey',
  'throughout this journey',
  'a world where',
  'imagine a world',
  'in a world where',
  'ever-changing landscape',
  'rapidly evolving',
  'fast-paced world',
  'digital landscape',
  'digital age',
  'whether you\'re a seasoned',
  'whether you are a seasoned',
  'whether you\'re a beginner',
  'seasoned professional',
  'seasoned veteran',
  'look no further',
  'search no more',
  'you\'re not alone',
  'you are not alone',
  'rest assured',
  'fear not',
  'fret not',
  'with that being said',
  'that being said',
  'having said that',
  'with that said',
  'without a doubt',
  'there\'s no denying',
  'there is no denying',
  'it\'s no secret',
  'it is no secret',
  'boasts a wide range',
  'boasts an impressive',
  'offers a wide range',
  'offers a plethora',
  'a plethora of',
  'a myriad of',
  'myriad of',
  'a wealth of',
  'a multitude of',
  'a wide array of',
  'a vast array of',
  'a comprehensive range',
  'comprehensive overview',
  'comprehensive understanding',
  'gain valuable insights',
  'valuable insights',
  'valuable information',
  'actionable insights',
  'informed decisions',
  'informed decision',
  'make informed',
  'well-informed',
  'pros and cons',
  'delve deeper',
  'explore the world of',
  'explore the intricacies',
  'explore the nuances',
  'the intricacies of',
  'the nuances of',
  'the complexities of',
  'shed light on',
  'sheds light on',
  'pave the way',
  'paves the way',
  'when it comes to',
  'it comes as no surprise',
  'it should come as no surprise',
  'in today\'s digital',
  'in today\'s fast-paced',
  'in this day and age',
  'in today\'s competitive',
  'moreover',
  'furthermore',
  'additionally',
  'consequently',
  'subsequently',
  'nevertheless',
  'notwithstanding',
  'henceforth',
  'thereby',
  'therein',
  'thereof',
  'wherein',
  'whilst',
  'amongst',
  'endeavor',
  'endeavors',
  'endeavour',
  'commence',
  'commences',
  'facilitate',
  'facilitates',
  'facilitate the',
  'encompasses',
  'constitutes',
  'necessitate',
  'necessitates',
  'pertaining to',
  'in light of',
  'by virtue of',
  'on the other hand',
  'in contrast',
  'conversely',
  'it\'s crucial to',
  'it is crucial to',
  'it\'s essential to',
  'it is essential to',
  'it\'s imperative to',
  'it is imperative to',
  'it\'s vital to',
  'it is vital to',
  'the key takeaway is',
  'one of the key',
  'one of the most important',
  'are you looking to',
  'if you\'re looking to',
  'if you are looking to',
  'have you ever wondered',
  'ever wondered',
  'you may be wondering',
  'you might be wondering',
  'the answer is simple',
  'the answer lies in',
  'the short answer is',
  'in essence',
  'at its core',
  'fundamentally',
  'ultimately',
  'essentially',
];

// 🆕 NEW: Block-level tags that count as "visual breaks" for the 200-word rule
const VISUAL_BREAK_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'table', 'ul', 'ol',
  'figure', 'img', 'hr', 'div',
  'details', 'aside', 'section', 'pre',
]);

function countSyllables(word: string): number {
  word = word.toLowerCase().trim().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;

  let count = 0;
  const vowels = 'aeiouy';
  let prevIsVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !prevIsVowel) count++;
    prevIsVowel = isVowel;
  }

  if (word.endsWith('e') && !word.endsWith('le') && count > 1) count--;
  if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded') && count > 1) count--;
  if (word.endsWith('es') && !word.endsWith('ses') && !word.endsWith('zes') && count > 1) count--;

  return Math.max(1, count);
}

function calculateFleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  return 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
}

// =====================================================================
// 🆕 NEW: Visual Break Validation (Goal #5)
// =====================================================================

/**
 * Count words in a string after stripping HTML tags.
 */
function countWordsInText(text: string): number {
  return text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
}

/**
 * Validate that HTML content has no more than `maxConsecutiveWords` of
 * paragraph text without a visual break element in between.
 *
 * @param html - The HTML content to validate
 * @param maxConsecutiveWords - Maximum words allowed between breaks (default: 200)
 * @returns Validation result with any violations found
 */
export function validateVisualBreaks(
  html: string,
  maxConsecutiveWords: number = 200,
): VisualBreakValidationResult {
  const violations: WallOfTextViolation[] = [];

  // Parse block-level elements in order
  const blockRegex = /(<(?:p|h[1-6]|div|blockquote|table|ul|ol|li|figure|figcaption|section|article|aside|details|summary|pre|hr|img)[^>]*>[\s\S]*?<\/(?:p|h[1-6]|div|blockquote|table|ul|ol|li|figure|figcaption|section|article|aside|details|summary|pre)>|<(?:hr|img)[^>]*\/?>)/gi;

  interface HtmlBlock {
    tag: string;
    html: string;
    wordCount: number;
  }

  const blocks: HtmlBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    const raw = match[0];
    const tagMatch = raw.match(/^<(\w+)/);
    const tag = tagMatch ? tagMatch[1].toLowerCase() : 'p';
    blocks.push({ tag, html: raw, wordCount: countWordsInText(raw) });
  }

  let consecutiveWords = 0;
  let runStartIndex = -1;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isVisualBreak = VISUAL_BREAK_TAGS.has(block.tag) && block.tag !== 'p';

    if (isVisualBreak) {
      if (consecutiveWords > maxConsecutiveWords && runStartIndex >= 0) {
        violations.push({ blockIndex: runStartIndex, wordCount: consecutiveWords });
      }
      consecutiveWords = 0;
      runStartIndex = -1;
    } else {
      if (runStartIndex === -1) runStartIndex = i;
      consecutiveWords += block.wordCount;
    }
  }

  // Check trailing run
  if (consecutiveWords > maxConsecutiveWords && runStartIndex >= 0) {
    violations.push({ blockIndex: runStartIndex, wordCount: consecutiveWords });
  }

  return { valid: violations.length === 0, violations };
}

// =====================================================================
// Content Analysis
// =====================================================================

export function analyzeContent(content: string): ContentMetrics {
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const words = textContent.split(/\s+/).filter(w => w.length > 0);
  const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = content.split(/<\/p>|<br\s*\/?>\s*<br\s*\/?>/gi).filter(p => p.trim().length > 0);

  const h1Count = (content.match(/<h1[^>]*>/gi) || []).length;
  const h2Count = (content.match(/<h2[^>]*>/gi) || []).length;
  const h3Count = (content.match(/<h3[^>]*>/gi) || []).length;
  const headingCount = h1Count + h2Count + h3Count;

  const imageCount = (content.match(/<img[^>]*>/gi) || []).length;
  const linkCount = (content.match(/<a[^>]*href/gi) || []).length;
  const readabilityGrade = calculateFleschKincaid(textContent);
  const estimatedReadTime = Math.ceil(words.length / 200);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    headingCount,
    imageCount,
    linkCount,
    keywordDensity: 0,
    readabilityGrade,
    estimatedReadTime
  };
}

export function calculateKeywordDensity(content: string, keyword: string): number {
  const textContent = content.replace(/<[^>]*>/g, ' ').toLowerCase();
  const words = textContent.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const keywordLower = keyword.toLowerCase().trim();
  const keywordParts = keywordLower.split(/\s+/);

  if (keywordParts.length === 1) {
    const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = textContent.match(regex);
    return ((matches?.length || 0) / words.length) * 100;
  }

  const fullText = words.join(' ');
  const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  const matches = fullText.match(regex);
  return ((matches?.length || 0) / words.length) * 100;
}

export function detectAITriggerPhrases(content: string): string[] {
  const lowerContent = content.toLowerCase();
  return AI_TRIGGER_PHRASES.filter(phrase => lowerContent.includes(phrase));
}

export function calculateQualityScore(
  content: string,
  keyword: string,
  existingLinks: string[] = [],
  contentGaps: string[] = []
): QualityScore {
  const metrics = analyzeContent(content);
  const aiPhrases = detectAITriggerPhrases(content);
  const keywordDensity = calculateKeywordDensity(content, keyword);
  const contentLower = content.toLowerCase();
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const internalLinks = existingLinks.length;

  const improvements: string[] = [];

  // 🆕 NEW: Visual break validation (Goal #5)
  const visualBreakResult = validateVisualBreaks(content, 200);

  // --- READABILITY (0-100) ---
  const readabilityScore = (() => {
    let score = 0;
    if (metrics.readabilityGrade >= 5 && metrics.readabilityGrade <= 10) {
      score += 50;
    } else if (metrics.readabilityGrade >= 4 && metrics.readabilityGrade <= 12) {
      score += 35;
      improvements.push('Adjust reading level closer to grade 6-9');
    } else {
      score += 15;
      improvements.push(metrics.readabilityGrade > 12 ? 'Simplify language significantly' : 'Add more depth');
    }

    const avgWordsPerSentence = metrics.wordCount / Math.max(metrics.sentenceCount, 1);
    if (avgWordsPerSentence <= 20) score += 20;
    else if (avgWordsPerSentence <= 25) score += 12;
    else { score += 5; improvements.push('Shorten sentences for readability'); }

    const avgWordsPerParagraph = metrics.wordCount / Math.max(metrics.paragraphCount, 1);
    if (avgWordsPerParagraph >= 30 && avgWordsPerParagraph <= 150) score += 15;
    else if (avgWordsPerParagraph < 30) score += 10;
    else { score += 5; improvements.push('Break up long paragraphs'); }

    const hasContractions = /\b(don't|won't|can't|it's|that's|we're|you'll|they've|doesn't|isn't|wasn't|aren't|couldn't|wouldn't|shouldn't)\b/i.test(textContent);
    if (hasContractions) score += 8;

    const hasQuestions = /\?/.test(textContent);
    if (hasQuestions) score += 7;

    // 🆕 NEW: Penalize wall-of-text violations (Goal #5)
    if (!visualBreakResult.valid) {
      const violationCount = visualBreakResult.violations.length;
      const penalty = Math.min(20, violationCount * 7); // -7 per violation, max -20
      score -= penalty;
      improvements.push(
        `${violationCount} wall-of-text violation(s) found: consecutive paragraphs exceed 200 words without a visual break element`
      );
    }

    return Math.min(100, Math.max(0, score));
  })();

  // --- SEO (0-100) ---
  const seoScore = (() => {
    let score = 0;

    if (keywordDensity >= 0.8 && keywordDensity <= 3.0) score += 30;
    else if (keywordDensity >= 0.5 && keywordDensity <= 4.0) { score += 20; improvements.push('Fine-tune keyword density'); }
    else { score += 5; improvements.push(`Adjust keyword density (currently ${keywordDensity.toFixed(1)}%)`); }

    if (metrics.headingCount >= 8) score += 25;
    else if (metrics.headingCount >= 5) score += 20;
    else if (metrics.headingCount >= 3) { score += 12; improvements.push('Add more headings for structure'); }
    else { score += 4; improvements.push('Add H2/H3 headings throughout'); }

    if (internalLinks >= 8) score += 20;
    else if (internalLinks >= 5) score += 15;
    else if (internalLinks >= 2) { score += 8; improvements.push('Add more internal links'); }
    else { score += 2; improvements.push('Add internal links to related content'); }

    if (metrics.wordCount >= 2500) score += 15;
    else if (metrics.wordCount >= 1500) { score += 10; improvements.push('Increase word count to 2500+'); }
    else { score += 3; improvements.push(`Word count too low (${metrics.wordCount})`); }

    const keywordInHeadings = (content.match(/<h[1-3][^>]*>.*?<\/h[1-3]>/gi) || [])
      .some(h => h.toLowerCase().includes(keyword.toLowerCase()));
    if (keywordInHeadings) score += 10;

    return Math.min(100, score);
  })();

  // --- E-E-A-T (0-100) ---
  const eeatScore = (() => {
    let score = 15; // 🔧 CHANGED: Lowered from 40 — must earn E-E-A-T signals

    const citationMatches = contentLower.match(/according to|study\b|research\b|report\b|published|journal|university|institute/g);
    const citationCount = citationMatches?.length || 0;
    if (citationCount >= 8) score += 15;
    else if (citationCount >= 4) score += 10;
    else if (citationCount >= 1) score += 5;

    const expertMatches = contentLower.match(/\bdr\.|\bprofessor\b|\bphd\b|\bmd\b|\bexpert\b|\bspecialist\b/g);
    const expertCount = expertMatches?.length || 0;
    if (expertCount >= 4) score += 12;
    else if (expertCount >= 2) score += 8;
    else if (expertCount >= 1) score += 4;

    const experienceSignals = contentLower.match(/\bi personally\b|\bmy experience\b|\bwhen i\b|\bi tested\b|\bi found\b|\bi've\b|\bin my \d/g);
    const experienceCount = experienceSignals?.length || 0;
    if (experienceCount >= 3) score += 12;
    else if (experienceCount >= 1) score += 7;

    const hasSpecificData = /\d{1,3}(?:\.\d+)?%/.test(content);
    const hasYearRefs = /20(?:2[3-9]|3\d)/.test(content);
    if (hasSpecificData) score += 8;
    if (hasYearRefs) score += 6;

    const hasLimitations = /caveat|limitation|drawback|downside|however|one thing to note|keep in mind/i.test(textContent);
    if (hasLimitations) score += 7;

    if (aiPhrases.length === 0) score += 5;
    else if (aiPhrases.length <= 2) score += 2;
    else score -= aiPhrases.length;

    // 🆕 NEW: Bonus for rich visual elements (Goal #4 — encourages better design)
    const hasStyledBoxes = (content.match(/border-left:\s*\d+px\s+solid/gi) || []).length;
    const hasTables = (content.match(/<table/gi) || []).length;
    const hasBlockquotes = (content.match(/<blockquote/gi) || []).length;
    const visualRichness = hasStyledBoxes + hasTables + hasBlockquotes;
    if (visualRichness >= 8) score += 10;
    else if (visualRichness >= 4) score += 6;
    else if (visualRichness >= 2) score += 3;

    return Math.min(100, Math.max(0, score));
  })();

  // --- UNIQUENESS (0-100) ---
  const uniquenessScore = (() => {
    let score = 30; // 🔧 CHANGED: Lowered from 85 — must demonstrate genuine uniqueness

    score -= aiPhrases.length * 4;
    if (aiPhrases.length > 0) {
      improvements.push(`Remove AI phrases: ${aiPhrases.slice(0, 3).join(', ')}`);
    }

    const hasOpinions = /\bhonestly\b|\bi think\b|\bi believe\b|\bin my view\b|\breal talk\b|\bhere's the thing\b/i.test(textContent);
    if (hasOpinions) score += 8;

    const hasAnalogies = /\blike\s+a\b|\bimagine\b|\bthink of it as\b|\bpicture this\b/i.test(textContent);
    if (hasAnalogies) score += 5;

    const hasShortSentences = textContent.split(/[.!?]/).filter(s => s.trim().split(/\s+/).length <= 5 && s.trim().length > 0).length;
    if (hasShortSentences >= 5) score += 4;

    // 🆕 NEW: Bonus for sentence-length variation (anti-AI-detection signal)
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 10) {
      const lengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      // High variation → more human-like
      if (stdDev >= 8) score += 10;
      else if (stdDev >= 5) score += 6;
      else if (stdDev >= 3) score += 3;
    }

    // 🆕 NEW: Bonus for contractions density (human writing signal)
    const contractionMatches = textContent.match(/\b\w+n't\b|\b\w+'re\b|\b\w+'ve\b|\b\w+'ll\b|\b\w+'s\b|\b\w+'d\b|\b\w+'m\b/gi);
    const contractionCount = contractionMatches?.length || 0;
    const contractionDensity = metrics.wordCount > 0 ? (contractionCount / metrics.wordCount) * 100 : 0;
    if (contractionDensity >= 1.5) score += 8;
    else if (contractionDensity >= 0.8) score += 4;

    return Math.min(100, Math.max(20, score)); // 🔧 CHANGED: Floor lowered from 60 to 20
  })();

  // --- FACT ACCURACY (0-100) ---
  const factAccuracyScore = (() => {
    let score = 25; // 🔧 CHANGED: Lowered from 72 — must include verifiable facts

    const statMatches = content.match(/\d+(?:\.\d+)?%|\d+(?:,\d{3})+|\d+\s*(?:million|billion|thousand)/g);
    const statCount = statMatches?.length || 0;
    if (statCount >= 8) score += 14;
    else if (statCount >= 4) score += 10;
    else if (statCount >= 1) score += 5;

    const yearMatches = content.match(/20\d{2}/g);
    const yearCount = new Set(yearMatches || []).size;
    if (yearCount >= 3) score += 8;
    else if (yearCount >= 1) score += 4;

    const hasSourceNames = /\b(?:harvard|stanford|mit|oxford|mayo clinic|cdc|who|nih|fda|gartner|mckinsey|forrester|statista|pew research)\b/i.test(textContent);
    if (hasSourceNames) score += 8;

    // 🆕 NEW: Bonus for structured data (tables with numbers = verifiable claims)
    const tableWithData = /<table[\s\S]*?\d+[\s\S]*?<\/table>/gi;
    const dataTableCount = (content.match(tableWithData) || []).length;
    if (dataTableCount >= 2) score += 10;
    else if (dataTableCount >= 1) score += 5;

    return Math.min(100, score);
  })();

  // --- GAP COVERAGE (0-100) ---
  const gapCoverageScore = (() => {
    if (!contentGaps || contentGaps.length === 0) return 100;
    const textLower = textContent.toLowerCase();
    const covered = contentGaps.filter(gap => {
      const gapWords = gap.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      // Fuzzy match: at least half the meaningful words appear
      const matchCount = gapWords.filter(w => textLower.includes(w)).length;
      return matchCount >= Math.ceil(gapWords.length * 0.5);
    });
    return Math.round((covered.length / contentGaps.length) * 100);
  })();

  // --- OVERALL (weighted average) ---
  const overall = Math.round(
    readabilityScore * 0.15 +
    seoScore * 0.20 +
    eeatScore * 0.20 +
    uniquenessScore * 0.10 +
    factAccuracyScore * 0.15 +
    gapCoverageScore * 0.20
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    readability: readabilityScore,
    seo: seoScore,
    eeat: eeatScore,
    uniqueness: uniquenessScore,
    factAccuracy: factAccuracyScore,
    passed: overall >= 85,
    improvements
  };
}

export function removeAIPhrases(content: string): string {
  let cleaned = content;

  // Remove exact AI trigger phrases
  for (const phrase of AI_TRIGGER_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[\\s>])(${escaped})([\\s,.:;!?)<]|$)`, 'gi');
    cleaned = cleaned.replace(regex, (_m, p1, _p2, p3) => `${p1}${p3}`);
  }

  // Replace stiff AI transitions with natural connectors
  const transitionReplacements: [RegExp, string[]][] = [
    [/\bMoreover,?\s*/gi, ['Plus, ', 'And ', 'On top of that, ', '']],
    [/\bFurthermore,?\s*/gi, ['Also, ', 'And ', 'What\'s more, ', '']],
    [/\bAdditionally,?\s*/gi, ['Also, ', 'Plus, ', 'And ', '']],
    [/\bConsequently,?\s*/gi, ['So ', 'That means ', 'Because of this, ', '']],
    [/\bSubsequently,?\s*/gi, ['Then ', 'After that, ', 'Next, ', '']],
    [/\bNevertheless,?\s*/gi, ['Still, ', 'But ', 'Even so, ', '']],
    [/\bNotwithstanding,?\s*/gi, ['Even so, ', 'But ', 'Still, ', '']],
    [/\bUltimately,?\s*/gi, ['In the end, ', 'When it comes down to it, ', '', '']],
    [/\bEssentially,?\s*/gi, ['Basically, ', 'Put simply, ', '', '']],
    [/\bFundamentally,?\s*/gi, ['At its core, ', '', 'Really, ', '']],
    [/\bIn essence,?\s*/gi, ['Put simply, ', 'Bottom line: ', '', '']],
    [/\bConversely,?\s*/gi, ['On the flip side, ', 'But ', '', '']],
    [/\bIt is important to note that\s*/gi, ['', 'Worth knowing: ', 'Key point: ', '']],
    [/\bIt should be noted that\s*/gi, ['', 'Quick note: ', '', '']],
    [/\bIt is worth noting that\s*/gi, ['', 'Here\'s the thing: ', '', '']],
    [/\bIn order to\s*/gi, ['To ', 'To ', 'To ', 'To ']],
    [/\bDue to the fact that\s*/gi, ['Because ', 'Since ', 'Because ', 'Since ']],
    [/\bAt this point in time,?\s*/gi, ['Right now, ', 'Now, ', 'Today, ', '']],
    [/\bFor all intents and purposes,?\s*/gi, ['Basically, ', 'In practice, ', '', '']],
  ];

  for (const [pattern, replacements] of transitionReplacements) {
    cleaned = cleaned.replace(pattern, () => {
      return replacements[Math.floor(Math.random() * replacements.length)];
    });
  }

  // Clean up spacing artifacts
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s{2,}/g, '> ')
    .replace(/\s{2,}</g, ' <')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?]){2,}/g, '$1');

  return cleaned.trim();
}

/**
 * Final cheap polish: ensures scannability for WordPress HTML.
 * - collapses long paragraphs
 * - standardizes spacing
 * 🔧 CHANGED: Enhanced to also normalize excessive <br> runs and apply
 *   paragraph splitting at a tighter 70-word threshold.
 */
export function polishReadability(html: string): string {
  let out = html;

  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  out = out.replace(/\n{3,}/g, '\n\n');

  // Split overly long <p> blocks (70 words max)
  out = out.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (m, attrs, inner) => {
    const plain = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.split(' ').length <= 70) return m;

    const sentences = inner.split(/(?<=[.!?])\s+/);
    let cur = '';
    const paras: string[] = [];
    for (const s of sentences) {
      const next = (cur ? cur + ' ' : '') + s;
      const wc = next.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      if (wc > 65 && cur) {
        paras.push(`<p${attrs}>${cur.trim()}</p>`);
        cur = s;
      } else {
        cur = next;
      }
    }
    if (cur.trim()) paras.push(`<p${attrs}>${cur.trim()}</p>`);
    return paras.join('\n');
  });

  return out;
}
