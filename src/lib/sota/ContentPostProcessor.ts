// src/lib/sota/ContentPostProcessor.ts
// SOTA Content Post-Processor v5.0 — Anti-AI Detection, Visual Break Enforcement, FAQ Builder
// Exports: ContentPostProcessor (class), enhanceHtmlDesign, injectMissingTerms, addFaqSection,
//          postProcessContent, removeAIPatterns

import type { PostProcessingResult } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ProcessOptions {
  maxConsecutiveWords?: number;
  usePullQuotes?: boolean;
}

interface Violation {
  startIndex: number;
  endIndex: number;
  wordCount: number;
  textSnippet: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PHRASE REMOVAL
// ═══════════════════════════════════════════════════════════════════════════════

const AI_PHRASE_PATTERNS: RegExp[] = [
  /\bin today's (?:fast-paced|digital|modern|ever-changing|ever-evolving|competitive|dynamic) (?:world|landscape|era|environment|age)\b/gi,
  /\bin the ever-(?:evolving|changing|expanding|growing)\b/gi,
  /\bin this comprehensive guide\b/gi,
  /\bin this article,? we (?:will|shall|are going to)\b/gi,
  /\bin conclusion\b/gi,
  /\bto (?:sum up|summarize|wrap up|recap)\b/gi,
  /\bwithout further ado\b/gi,
  /\bit'?s (?:important|worth|crucial|vital|essential) to (?:note|mention|remember|understand|recognize|highlight) that\b/gi,
  /\bit should be noted that\b/gi,
  /\bin the realm of\b/gi,
  /\bdelve(?:s|d)? (?:into|deeper)\b/gi,
  /\ba testament to\b/gi,
  /\bundeniably\b/gi,
  /\bit goes without saying\b/gi,
  /\blet'?s (?:dive|explore|delve|get started|begin|take a look)\b/gi,
  /\bwhether you'?re a (?:beginner|seasoned|novice|expert)\b[^.]*[.]/gi,
  /\blook no further\b/gi,
  /\byou'?re not alone\b/gi,
  /\brest assured\b/gi,
  /\ba (?:plethora|myriad|wealth|wide array|vast array) of\b/gi,
  /\bcannot be overstated\b/gi,
  /\bplays a (?:crucial|vital|pivotal|key|important) role\b/gi,
  /\bstands as a testament\b/gi,
  /\bunlock the (?:power|potential|secrets?)\b/gi,
  /\btake [\w\s]+ to the next level\b/gi,
  /\bare you looking to\b/gi,
  /\bhave you ever wondered\b/gi,
  /\bas we all know\b/gi,
  /\bneedless to say\b/gi,
  /\bgame.?changer\b/gi,
  /\bseamless(?:ly)?\b/gi,
  /\brobust\b/gi,
  /\bleverage(?:s|d)?\b/gi,
  /\butilize(?:s|d)?\b/gi,
  /\bfacilitate(?:s|d)?\b/gi,
  /\bholistic\b/gi,
  /\btapestry\b/gi,
  /\bembark(?:s|ed)? on\b/gi,
  /\bparamount\b/gi,
  /\bpivotal\b/gi,
  /\bencompass(?:es|ed|ing)?\b/gi,
  /\bgroundbreaking\b/gi,
  /\bcutting-edge\b/gi,
  /\bstate-of-the-art\b/gi,
  /\bsynergy\b/gi,
  /\bparadigm\b/gi,
  /\bendeavou?r(?:s|ed)?\b/gi,
  /\bcommence(?:s|d)?\b/gi,
  /\bharness(?:es|ed|ing)?\b/gi,
  /\bbolster(?:s|ed)?\b/gi,
  /\bgarner(?:s|ed)?\b/gi,
  /\bpropel(?:s|led)?\b/gi,
  /\bunderscore(?:s|d)?\b/gi,
  /\bepitomize(?:s|d)?\b/gi,
  /\btransformative\b/gi,
  /\brevolutionize(?:s|d)?\b/gi,
  /\bmoreover,?\s/gi,
  /\bfurthermore,?\s/gi,
  /\badditionally,?\s/gi,
  /\bconsequently,?\s/gi,
  /\bsubsequently,?\s/gi,
  /\bnevertheless,?\s/gi,
  /\bnotwithstanding,?\s/gi,
];

/**
 * Remove known AI-detectable phrases and replace banned words.
 * Exported for use in post-processing pipelines.
 */
export function removeAIPatterns(html: string): string {
  if (!html) return '';
  let cleaned = html;

  for (const pattern of AI_PHRASE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // SOTA: Strip leaked template placeholders like "[Action-oriented headline ...]" or "[2 sentences of ...]"
  // These are prompt instructions to the LLM, never meant to appear in the published article.
  const PLACEHOLDER_PATTERN = /\[([^\]\n]{6,200})\]/g;
  cleaned = cleaned.replace(PLACEHOLDER_PATTERN, (match, inner: string) => {
    const lower = inner.toLowerCase();
    const looksLikeInstruction =
      /\b(headline|sentence|paragraph|topic|placeholder|insert here|write|action[-\s]oriented|tell them|guidance|timeframe|cta|call to action|ultra-specific|practical|number or|first person|your\s+\w+\s+here)\b/.test(
        lower,
      );
    return looksLikeInstruction ? '' : match;
  });

  // Clean up leftover artifacts (including empty containers from stripped placeholders)
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/g, '');
  cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/g, '');
  cleaned = cleaned.replace(/\.\s*\./g, '.');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');

  return cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL BREAK ELEMENT FACTORIES (dynamic, contextual — no static canned text)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a contextual break element based on surrounding content.
 * Extracts a short phrase from the preceding paragraph to make the element feel organic.
 */
function buildContextualBreakElement(
  precedingParagraphText: string,
  elementIndex: number,
): string {
  // Extract a short theme phrase from the preceding paragraph
  const words = precedingParagraphText.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean);
  const themeSlice = words.slice(0, Math.min(6, words.length)).join(' ');
  const theme = themeSlice || 'this concept';

  const templates = [
    // Pro Tip (indigo)
    (t: string) =>
      `<div style="background: #ffffff; border: 1px solid #e0e7ff; border-left: 5px solid #6366f1; padding: 24px 28px; margin: 36px 0; border-radius: 0 16px 16px 0; box-shadow: 0 4px 20px rgba(99, 102, 241, 0.08); max-width: 100%; box-sizing: border-box;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
    <span style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px;">💡</span>
    <strong style="color: #3730a3; font-size: 17px; font-weight: 800;">Pro Tip</strong>
  </div>
  <p style="color: #334155; font-size: 17px; margin: 0; line-height: 1.8;">If you're applying what we just covered about ${t}, start small — test it on one page first, measure for 2 weeks, then scale.</p>
</div>`,
    // Key Insight (green)
    (t: string) =>
      `<div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #16a34a; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 36px 0; max-width: 100%; box-sizing: border-box;">
  <p style="font-weight: 700; color: #15803d; margin: 0 0 8px; font-size: 16px;">🔑 Key Insight</p>
  <p style="color: #166534; margin: 0; line-height: 1.7;">The section above about ${t} is where 80% of the value sits. Don't skip past it — re-read it if you need to.</p>
</div>`,
    // Important Note (amber)
    (t: string) =>
      `<div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #d97706; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 36px 0; max-width: 100%; box-sizing: border-box;">
  <p style="font-weight: 700; color: #92400e; margin: 0 0 8px; font-size: 16px;">📌 Don't Skip This</p>
  <p style="color: #78350f; margin: 0; line-height: 1.7;">What we just covered about ${t} trips up even experienced practitioners. Bookmark this section.</p>
</div>`,
    // Quick Summary (blue)
    (t: string) =>
      `<div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-left: 4px solid #2563eb; padding: 20px 24px; border-radius: 0 12px 12px 0; margin: 36px 0; max-width: 100%; box-sizing: border-box;">
  <p style="font-weight: 700; color: #1e40af; margin: 0 0 8px; font-size: 16px;">📋 Quick Recap</p>
  <p style="color: #1e3a5f; margin: 0; line-height: 1.7;">Get the fundamentals of ${t} right first. Advanced tactics won't save a weak foundation.</p>
</div>`,
    // Reality Check (red-tinted)
    (t: string) =>
      `<div style="background: #ffffff; border: 1px solid #fecaca; border-left: 5px solid #ef4444; padding: 24px 28px; margin: 36px 0; border-radius: 0 16px 16px 0; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.08); max-width: 100%; box-sizing: border-box;">
  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
    <span style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px;">⚠️</span>
    <strong style="color: #991b1b; font-size: 17px; font-weight: 800;">Reality Check</strong>
  </div>
  <p style="color: #334155; font-size: 17px; margin: 0; line-height: 1.8;">Most people rush through ${t} and pay for it later. Slow down here — the 10 minutes you invest now saves 10 hours of fixing mistakes.</p>
</div>`,
    // Expert Callout (purple)
    (t: string) =>
      `<blockquote style="border-left: 4px solid #8b5cf6; background: linear-gradient(135deg, #faf5ff 0%, #f5f3ff 100%); margin: 36px 0; padding: 24px 28px; border-radius: 0 16px 16px 0; max-width: 100%; box-sizing: border-box;">
  <p style="font-size: 18px; font-style: italic; color: #4c1d95; line-height: 1.8; margin: 0;">"When it comes to ${t}, the practitioners who get results are the ones who master the boring fundamentals first."</p>
</blockquote>`,
  ];

  const template = templates[elementIndex % templates.length];
  return template(theme);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASS — Visual Break Enforcement
// ═══════════════════════════════════════════════════════════════════════════════

export class ContentPostProcessor {
  static process(html: string, options: ProcessOptions = {}): PostProcessingResult {
    const maxWords = options.maxConsecutiveWords || 200;

    if (!html || html.trim().length === 0) {
      return { html, wasModified: false, violations: [], elementsInjected: 0 };
    }

    const violations = ContentPostProcessor.findViolations(html, maxWords);

    if (violations.length === 0) {
      return { html, wasModified: false, violations: [], elementsInjected: 0 };
    }

    let result = html;
    let elementsInjected = 0;

    const sortedViolations = [...violations].sort((a, b) => b.startIndex - a.startIndex);

    for (const violation of sortedViolations) {
      const violationHtml = result.substring(violation.startIndex, violation.endIndex);
      const paragraphs = violationHtml.match(/<\/p>/gi) || [];
      if (paragraphs.length < 2) continue;

      const midParagraphIndex = Math.floor(paragraphs.length / 2);
      let currentParagraphEnd = 0;
      let insertionPoint = -1;

      for (let i = 0; i <= midParagraphIndex; i++) {
        const nextEnd = violationHtml.indexOf('</p>', currentParagraphEnd);
        if (nextEnd !== -1) {
          currentParagraphEnd = nextEnd + 4;
          if (i === midParagraphIndex) {
            insertionPoint = violation.startIndex + currentParagraphEnd;
          }
        }
      }

      if (insertionPoint === -1) continue;

      // Extract preceding paragraph text for contextual element generation
      const precedingChunk = result.substring(
        Math.max(0, insertionPoint - 500),
        insertionPoint,
      );
      const breakElement = buildContextualBreakElement(precedingChunk, elementsInjected);

      result =
        result.substring(0, insertionPoint) +
        '\n\n' + breakElement + '\n\n' +
        result.substring(insertionPoint);
      elementsInjected++;
    }

    return {
      html: result,
      wasModified: elementsInjected > 0,
      violations: violations.map(v => ({ blockIndex: v.startIndex, wordCount: v.wordCount })),
      elementsInjected
    };
  }

  static findViolations(html: string, maxWords: number): Violation[] {
    const violations: Violation[] = [];

    const breakPatterns = [
      /<div\s[^>]*style\s*=/i, /<table[\s>]/i, /<blockquote[\s>]/i,
      /<details[\s>]/i, /<figure[\s>]/i, /<ul[\s>]/i, /<ol[\s>]/i,
      /<h[1-6][\s>]/i, /<hr[\s>/]/i, /<iframe[\s>]/i, /<!-- .* -->/i,
    ];

    const pBlocks = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    if (pBlocks.length === 0) return violations;

    let lastIndex = 0;
    let currentRunStart = -1;
    let currentRunWords = 0;

    for (let i = 0; i < pBlocks.length; i++) {
      const block = pBlocks[i];
      const blockIndex = html.indexOf(block, lastIndex);
      if (blockIndex === -1) continue;

      if (lastIndex > 0 && blockIndex > lastIndex) {
        const between = html.substring(lastIndex, blockIndex);
        const hasBreak = breakPatterns.some(pattern => pattern.test(between));

        if (hasBreak) {
          if (currentRunWords > maxWords && currentRunStart !== -1) {
            const text = html.substring(currentRunStart, lastIndex).replace(/<[^>]*>/g, ' ').trim();
            violations.push({
              startIndex: currentRunStart, endIndex: lastIndex,
              wordCount: currentRunWords, textSnippet: text.substring(0, 80) + '...',
            });
          }
          currentRunStart = blockIndex;
          currentRunWords = 0;
        }
      }

      if (currentRunStart === -1) currentRunStart = blockIndex;

      const plainText = block.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      currentRunWords += plainText ? plainText.split(' ').filter(Boolean).length : 0;
      lastIndex = blockIndex + block.length;
    }

    if (currentRunWords > maxWords && currentRunStart !== -1) {
      const text = html.substring(currentRunStart, lastIndex).replace(/<[^>]*>/g, ' ').trim();
      violations.push({
        startIndex: currentRunStart, endIndex: lastIndex,
        wordCount: currentRunWords, textSnippet: text.substring(0, 80) + '...',
      });
    }

    return violations;
  }

  static validate(html: string, maxWords: number = 200): { valid: boolean; violations: Violation[] } {
    const violations = ContentPostProcessor.findViolations(html, maxWords);
    return { valid: violations.length === 0, violations };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL ELEMENT ENFORCEMENT — ensures minimum visual richness
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensure content has minimum required visual elements.
 * Injects missing elements: Key Takeaways, Stat Highlights, Callout Boxes.
 */
export function ensureVisualElements(html: string, keyword: string): string {
  let output = html;
  let modified = false;

  // 1. Ensure Key Takeaways box exists
  if (!output.includes('key-takeaways') && !output.includes('Key Takeaways') && !output.includes('✦ Key Takeaways')) {
    const keyTakeawaysBox = `
<div class="key-takeaways" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border-left:5px solid #f59e0b;border-radius:0 16px 16px 0;padding:28px 32px;margin:32px 0;box-shadow:0 4px 20px rgba(245,158,11,0.1);">
  <strong style="color:#92400e;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">✦ Key Takeaways</strong>
  <ul style="margin:12px 0 0;padding:0 0 0 20px;color:#78350f;line-height:1.8;">
    <li><strong>Core insight:</strong> Understanding ${keyword} fundamentally changes your approach to results.</li>
    <li><strong>Critical metric:</strong> Top performers consistently outperform by focusing on the fundamentals first.</li>
    <li><strong>Action step:</strong> Start with the strategies outlined in this guide for measurable improvement within 30 days.</li>
  </ul>
</div>`;

    // Insert after first H2 or at the beginning
    const firstH2 = output.indexOf('</h2>');
    if (firstH2 !== -1) {
      const insertAfterP = output.indexOf('</p>', firstH2);
      if (insertAfterP !== -1) {
        output = output.slice(0, insertAfterP + 4) + '\n' + keyTakeawaysBox + '\n' + output.slice(insertAfterP + 4);
        modified = true;
      }
    }
  }

  // 2. Ensure at least one stat-highlight box
  if (!output.includes('stat-highlight') && !output.includes('font-size:clamp(48px')) {
    const statBox = `
<div class="stat-highlight" style="background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:20px;padding:40px;margin:40px 0;text-align:center;color:white;">
  <div style="font-size:clamp(48px,6vw,72px);font-weight:900;background:linear-gradient(135deg,#818cf8,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">87%</div>
  <p style="font-size:18px;color:#c7d2fe;margin:12px 0 0;">of professionals who master ${keyword} see measurable results within 90 days</p>
</div>`;

    // Insert after the 3rd H2 section
    const h2Matches = [...output.matchAll(/<h2[^>]*>/gi)];
    if (h2Matches.length >= 3) {
      const thirdH2Idx = h2Matches[2].index!;
      const nextH2 = h2Matches[3]?.index || output.length;
      const insertPoint = output.lastIndexOf('</p>', nextH2);
      if (insertPoint > thirdH2Idx) {
        output = output.slice(0, insertPoint + 4) + '\n' + statBox + '\n' + output.slice(insertPoint + 4);
        modified = true;
      }
    }
  }

  // 3. Ensure minimum callout boxes (at least 3 total: tip + warning + insight)
  const calloutCount = (output.match(/border-left:\s*\d+px\s+solid\s*#(?:4f46e5|16a34a|ea580c|6366f1|d97706)/gi) || []).length;
  if (calloutCount < 3) {
    const missingCount = 3 - calloutCount;
    const callouts = [
      `<div style="background:#f0fdf4;border-left:5px solid #16a34a;border-radius:0 12px 12px 0;padding:24px 28px;margin:36px 0;">
  <p style="font-weight:700;color:#15803d;margin:0 0 8px;font-size:16px;">💡 Pro Tip</p>
  <p style="color:#166534;margin:0;line-height:1.7;">The most effective approach to ${keyword} starts with understanding the basics deeply before moving to advanced tactics. Don't skip the fundamentals.</p>
</div>`,
      `<div style="background:#fff7ed;border-left:5px solid #ea580c;border-radius:0 12px 12px 0;padding:24px 28px;margin:36px 0;">
  <p style="font-weight:700;color:#9a3412;margin:0 0 8px;font-size:16px;">⚠️ Common Mistake</p>
  <p style="color:#7c2d12;margin:0;line-height:1.7;">Most people rush through ${keyword} implementation without measuring their baseline. Always track your starting metrics first.</p>
</div>`,
      `<div style="background:#eef2ff;border-left:5px solid #4f46e5;border-radius:0 12px 12px 0;padding:24px 28px;margin:36px 0;">
  <p style="font-weight:700;color:#3730a3;margin:0 0 8px;font-size:16px;">🔑 Key Insight</p>
  <p style="color:#312e81;margin:0;line-height:1.7;">Research shows that consistent application of ${keyword} principles yields compounding returns over time. The earlier you start, the greater the advantage.</p>
</div>`,
    ];

    const h2Matches = [...output.matchAll(/<h2[^>]*>/gi)];
    for (let i = 0; i < Math.min(missingCount, callouts.length); i++) {
      const targetH2Idx = h2Matches[Math.min(i + 1, h2Matches.length - 1)]?.index;
      if (targetH2Idx) {
        const insertPoint = output.lastIndexOf('</p>', targetH2Idx);
        if (insertPoint !== -1) {
          output = output.slice(0, insertPoint + 4) + '\n' + callouts[i] + '\n' + output.slice(insertPoint + 4);
          modified = true;
        }
      }
    }
  }

  return output;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE EXPORTED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enhance HTML with styled headings, spacing, and typography.
 * Only styles elements that don't already have inline styles.
 */
export function enhanceHtmlDesign(html: string): string {
  if (!html) return '';
  let result = html;

  // Style ONLY unstyled elements (check for existing style attribute)
  result = result.replace(
    /<h2>([^<]+)<\/h2>/g,
    '<h2 style="color: #0f172a; font-size: 30px; font-weight: 900; margin: 56px 0 24px 0; padding-bottom: 14px; border-bottom: 4px solid #10b981; letter-spacing: -0.025em; line-height: 1.2;">$1</h2>',
  );
  result = result.replace(
    /<h3>([^<]+)<\/h3>/g,
    '<h3 style="color: #1e293b; font-size: 23px; font-weight: 800; margin: 40px 0 16px 0; letter-spacing: -0.02em; line-height: 1.3;">$1</h3>',
  );
  result = result.replace(
    /<h4>([^<]+)<\/h4>/g,
    '<h4 style="color: #334155; font-size: 19px; font-weight: 700; margin: 32px 0 12px 0; line-height: 1.3;">$1</h4>',
  );
  result = result.replace(
    /<p(?!\s)>/g,
    '<p style="font-size: 18px; margin: 0 0 20px 0; line-height: 1.8; color: #334155;">',
  );
  result = result.replace(/<ul(?!\s)>/g, '<ul style="margin: 0 0 24px 0; padding-left: 24px;">');
  result = result.replace(/<ol(?!\s)>/g, '<ol style="margin: 0 0 24px 0; padding-left: 24px;">');
  result = result.replace(/<li(?!\s)>/g, '<li style="margin: 0 0 12px 0; line-height: 1.75;">');

  // Spacing between block elements
  result = result.replace(/<\/div>\s*<h2/g, '</div>\n\n<h2');
  result = result.replace(/<\/p>\s*<h2/g, '</p>\n\n<h2');

  // Remove empty paragraphs
  result = result.replace(/<p[^>]*>\s*<\/p>/g, '');

  return result;
}

/**
 * Inject missing NeuronWriter terms naturally into existing paragraphs.
 *
 * v5.0: Uses 14 varied sentence templates, contextual paragraph matching,
 * and no-repeat logic to avoid AI-detectable patterns.
 */
export function injectMissingTerms(
  html: string,
  missingTerms: string[],
): string {
  if (!html || !missingTerms || missingTerms.length === 0) return html;

  // Sentence templates — each produces a different syntactic structure.
  const TEMPLATES: Array<(term: string) => string> = [
    (t) => ` That's especially true when you factor in ${t}.`,
    (t) => ` Smart practitioners pay close attention to ${t} at this stage.`,
    (t) => ` The same logic applies to ${t} — don't overlook it.`,
    (t) => ` ${capitalize(t)} fits directly into this approach, and skipping it costs you.`,
    (t) => ` You'll also want to think about how ${t} affects your results here.`,
    (t) => ` One thing most guides miss? The connection between this and ${t}.`,
    (t) => ` And yes — ${t} matters more than most people realize at this point.`,
    (t) => ` If you're ignoring ${t}, you're leaving value on the table.`,
    (t) => ` Here's the kicker: ${t} changes the equation entirely.`,
    (t) => ` Real-world data shows ${t} has a measurable impact on outcomes here.`,
    (t) => ` For what it's worth, ${t} is something the top performers always nail.`,
    (t) => ` Quick note: ${t} deserves more attention than it usually gets.`,
    (t) => ` Factor in ${t} and the picture starts to look different.`,
    (t) => ` Don't sleep on ${t} — it compounds over time.`,
  ];

  let result = html;
  const termsToInject = missingTerms.slice(0, 30);

  // Find all substantial paragraphs (50+ chars of text content)
  const paragraphRegex = /<p[^>]*>([^<]{50,})<\/p>/gi;
  const paragraphPositions: Array<{ index: number; text: string; endIndex: number }> = [];
  let pMatch: RegExpExecArray | null;

  while ((pMatch = paragraphRegex.exec(result)) !== null) {
    paragraphPositions.push({
      index: pMatch.index,
      text: pMatch[1],
      endIndex: pMatch.index + pMatch[0].length,
    });
  }

  if (paragraphPositions.length === 0) return result;

  // Distribute terms across paragraphs evenly, avoiding same-paragraph clustering
  const interval = Math.max(1, Math.floor(paragraphPositions.length / termsToInject.length));
  let lastTemplateIndex = -1;
  let injectedCount = 0;

  for (let i = 0; i < termsToInject.length; i++) {
    const term = termsToInject[i];
    const targetIdx = Math.min(i * interval, paragraphPositions.length - 1);
    const para = paragraphPositions[targetIdx];

    // Skip if term already exists in this paragraph
    if (para.text.toLowerCase().includes(term.toLowerCase())) continue;

    // Pick a template that's different from the last one used
    let templateIdx = (i * 3 + 7) % TEMPLATES.length; // deterministic spread
    if (templateIdx === lastTemplateIndex) {
      templateIdx = (templateIdx + 1) % TEMPLATES.length;
    }
    lastTemplateIndex = templateIdx;

    const sentence = TEMPLATES[templateIdx](term);

    // Find the </p> closing tag for this paragraph and insert before it
    // Account for offset from previous injections
    const closingTag = '</p>';
    const searchStart = para.index + (injectedCount * 80); // rough offset estimate
    const closingPos = result.indexOf(closingTag, searchStart);
    if (closingPos === -1) continue;

    result = result.substring(0, closingPos) + sentence + result.substring(closingPos);
    injectedCount++;
  }

  return result;
}

/**
 * Build and append a styled FAQ section from question/answer pairs.
 */
export function addFaqSection(
  html: string,
  faqs: Array<{ question: string; answer: string }>,
): string {
  if (!html || !faqs || faqs.length === 0) return html;

  const hasFaq = /<(details|h2)[^>]*>[\s\S]*?(?:faq|frequently asked|common questions)/i.test(html);
  if (hasFaq) return html;

  const faqItems = faqs.map(faq =>
    `<details style="margin: 12px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; max-width: 100%; box-sizing: border-box;">
  <summary style="padding: 18px 24px; background: #f8fafc; cursor: pointer; font-weight: 700; color: #0f172a; font-size: 17px; list-style: none; display: flex; justify-content: space-between; align-items: center;">
    ${escapeHtmlStr(faq.question)} <span style="font-size: 20px; color: #64748b;">+</span>
  </summary>
  <div style="padding: 16px 24px; color: #475569; font-size: 16px; line-height: 1.8; border-top: 1px solid #e2e8f0;">
    ${faq.answer}
  </div>
</details>`,
  ).join('\n');

  const faqSection = `
<div style="margin-top: 48px;">
  <h2 style="color: #0f172a; font-size: 30px; font-weight: 900; margin: 56px 0 24px 0; padding-bottom: 14px; border-bottom: 4px solid #10b981;">❓ Frequently Asked Questions</h2>
  ${faqItems}
</div>`;

  const refsMarker = html.indexOf('<!-- SOTA References Section -->');
  if (refsMarker !== -1) {
    return html.slice(0, refsMarker) + '\n\n' + faqSection + '\n\n' + html.slice(refsMarker);
  }

  return html + '\n\n' + faqSection;
}

/**
 * Comprehensive post-processing: AI removal + visual breaks + HTML enhancement.
 */
export function postProcessContent(
  html: string,
  options?: {
    maxConsecutiveWords?: number;
    usePullQuotes?: boolean;
    enhanceDesign?: boolean;
    removeAI?: boolean;
  },
): PostProcessingResult {
  if (!html) return { html: '', wasModified: false, violations: [], elementsInjected: 0 };

  let processed = html;

  // Step 0: Remove AI-detectable patterns (default: true)
  if (options?.removeAI !== false) {
    processed = removeAIPatterns(processed);
  }

  // Step 1: Enforce visual breaks
  const result = ContentPostProcessor.process(processed, {
    maxConsecutiveWords: options?.maxConsecutiveWords || 200,
    usePullQuotes: options?.usePullQuotes !== false,
  });

  // Step 2: Enhance HTML design (default: true)
  if (options?.enhanceDesign !== false) {
    result.html = enhanceHtmlDesign(result.html);
    result.wasModified = true;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function escapeHtmlStr(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default ContentPostProcessor;
