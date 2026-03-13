// src/lib/sota/SOTAInternalLinkEngine.ts
// SOTA Internal Link Engine v4.0 — Enterprise-Grade Contextual Linking
// Exports: SOTAInternalLinkEngine (class), createInternalLinkEngine (factory)

import type { InternalLink } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SitePage {
  url: string;
  title: string;
  keywords?: string[];
}

interface LinkCandidate {
  page: SitePage;
  anchor: string;
  relevanceScore: number;
  position: 'early' | 'middle' | 'late';
  context: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function extractSlugKeywords(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';
    return slug
      .split(/[-_]/)
      .filter(w => w.length > 2)
      .filter(w => !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'how', 'what', 'why', 'are', 'was', 'has'].includes(w.toLowerCase()))
      .map(w => w.toLowerCase());
  } catch {
    return [];
  }
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*[-|–—]\s*.*$/, '')  // Remove site name after dash/pipe
    .replace(/^\d+\.\s*/, '')         // Remove leading numbers
    .trim();
}

function generateAnchorText(page: SitePage): string {
  const cleaned = cleanTitle(page.title);

  if (cleaned.length > 5 && cleaned.length <= 60) {
    return cleaned;
  }

  if (cleaned.length > 60) {
    const parts = cleaned.split(/[:\-–—|]/).map(s => s.trim()).filter(s => s.length > 5);
    if (parts[0] && parts[0].length <= 55) return parts[0];
    return cleaned.substring(0, 50).replace(/\s\w+$/, '').trim();
  }

  const keywords = page.keywords || extractSlugKeywords(page.url);
  if (keywords.length >= 2) {
    return keywords.slice(0, 4).join(' ').replace(/^\w/, c => c.toUpperCase());
  }

  return cleaned || 'related guide';
}

function calculatePageRelevance(
  page: SitePage,
  contentText: string,
  primaryKeyword?: string
): number {
  let score = 0;
  const titleLower = (page.title || '').toLowerCase();
  const urlLower = (page.url || '').toLowerCase();
  const contentLower = contentText.toLowerCase();

  const pageKeywords = page.keywords || extractSlugKeywords(page.url);

  // Title words appearing in content
  const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
  for (const word of titleWords) {
    if (contentLower.includes(word)) score += 5;
  }

  // Page keywords appearing in content
  for (const kw of pageKeywords) {
    if (contentLower.includes(kw)) score += 8;
  }

  // Primary keyword match
  if (primaryKeyword) {
    const pkLower = primaryKeyword.toLowerCase();
    if (titleLower.includes(pkLower) || urlLower.includes(pkLower.replace(/\s+/g, '-'))) {
      score += 25;
    }
    // Partial match
    const pkWords = pkLower.split(/\s+/).filter(w => w.length > 3);
    for (const word of pkWords) {
      if (titleLower.includes(word) || urlLower.includes(word)) score += 10;
    }
  }

  // Bonus for descriptive URLs (not just IDs)
  if (pageKeywords.length >= 2) score += 5;

  return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class SOTAInternalLinkEngine {
  private sitePages: SitePage[];

  constructor(sitePages?: SitePage[]) {
    this.sitePages = sitePages || [];
  }

  /**
   * Update the list of available site pages for linking.
   */
  updateSitePages(pages: SitePage[] | undefined): void {
    this.sitePages = pages || [];
  }

  /**
   * Analyze content and generate internal link opportunities.
   * Returns InternalLink[] with anchor text, target URL, relevance score, and position.
   */
  generateLinkOpportunities(
    htmlContent: string,
    maxLinks: number = 12,
    primaryKeyword?: string
  ): InternalLink[] {
    const MIN_LINKS = 6;
    const effectiveMax = Math.max(MIN_LINKS, Math.min(maxLinks, 12));
    if (!this.sitePages || this.sitePages.length === 0) return [];
    if (!htmlContent || htmlContent.trim().length === 0) return [];

    const contentText = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    // Filter out non-content pages
    const contentPages = this.sitePages.filter(p => {
      const lowerUrl = (p.url || '').toLowerCase();
      if (/\/(tag|category|author|page|feed|wp-admin|wp-content|cart|checkout|my-account|wp-json)/i.test(lowerUrl)) return false;
      if (!lowerUrl.startsWith('http')) return false;
      return true;
    });

    // Score each page for relevance
    const scored: LinkCandidate[] = contentPages.map(page => {
      const relevance = calculatePageRelevance(page, contentText, primaryKeyword);
      const anchor = generateAnchorText(page);
      return {
        page,
        anchor,
        relevanceScore: relevance,
        position: 'middle' as const,
        context: `Link to ${cleanTitle(page.title)}`,
      };
    });

    // Sort by relevance (highest first)
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Select top candidates, ensuring URL diversity
    const selected: LinkCandidate[] = [];
    const usedDomainPaths = new Set<string>();

    for (const candidate of scored) {
      if (selected.length >= effectiveMax) break;
      if (candidate.relevanceScore < 5) continue;

      try {
        const urlObj = new URL(candidate.page.url);
        const pathKey = urlObj.pathname.replace(/\/$/, '');
        if (usedDomainPaths.has(pathKey)) continue;
        usedDomainPaths.add(pathKey);
      } catch {
        continue;
      }

      selected.push(candidate);
    }

    // Assign positions (distribute across content)
    const positions: ('early' | 'middle' | 'late')[] = [];
    const count = selected.length;
    for (let i = 0; i < count; i++) {
      if (i < count / 3) positions.push('early');
      else if (i < (count * 2) / 3) positions.push('middle');
      else positions.push('late');
    }

    return selected.map((candidate, i) => ({
      anchor: candidate.anchor,
      targetUrl: candidate.page.url,
      context: candidate.context,
      relevanceScore: candidate.relevanceScore,
      position: positions[i] || 'middle',
      priority: 1,
    }));
  }

  /**
   * Inject internal links into HTML content at contextually appropriate locations.
   * Inserts links as natural sentences at the end of suitable paragraphs.
   */
  injectContextualLinks(
    htmlContent: string,
    links: InternalLink[]
  ): string {
    if (!htmlContent || !links || links.length === 0) return htmlContent;

    const paragraphs = htmlContent.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
    if (paragraphs.length === 0) return htmlContent;

    const totalParagraphs = paragraphs.length;
    const earlyEnd = Math.floor(totalParagraphs * 0.3);
    const middleEnd = Math.floor(totalParagraphs * 0.7);

    const usedIndices = new Set<number>();
    let result = htmlContent;

    for (const link of links) {
      // Skip if this URL is already in the content
      if (result.toLowerCase().includes(link.targetUrl.toLowerCase())) continue;

      let targetRange: [number, number];
      switch (link.position) {
        case 'early':
          targetRange = [1, Math.max(2, earlyEnd)];
          break;
        case 'middle':
          targetRange = [Math.max(1, earlyEnd), middleEnd];
          break;
        case 'late':
          targetRange = [middleEnd, Math.max(middleEnd + 1, totalParagraphs - 1)];
          break;
        default:
          targetRange = [1, totalParagraphs - 1];
      }

      let bestIdx = -1;
      let bestScore = -1;

      for (let i = targetRange[0]; i <= targetRange[1] && i < totalParagraphs; i++) {
        if (usedIndices.has(i)) continue;

        const p = paragraphs[i];
        // Skip paragraphs that already have links
        if (/<a\s/i.test(p)) continue;
        // Skip very short paragraphs
        const pText = p.replace(/<[^>]*>/g, '').trim();
        if (pText.length < 40) continue;

        // Prefer longer paragraphs and those with related content
        let relevance = Math.min(20, pText.length / 20);
        const anchorWords = link.anchor.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const pLower = pText.toLowerCase();
        for (const word of anchorWords) {
          if (pLower.includes(word)) relevance += 10;
        }

        if (relevance > bestScore) {
          bestScore = relevance;
          bestIdx = i;
        }
      }

      // Fallback: any available paragraph in range
      if (bestIdx === -1) {
        for (let i = targetRange[0]; i <= targetRange[1] && i < totalParagraphs; i++) {
          if (!usedIndices.has(i)) {
            const pText = paragraphs[i].replace(/<[^>]*>/g, '').trim();
            if (pText.length >= 30 && !/<a\s/i.test(paragraphs[i])) {
              bestIdx = i;
              break;
            }
          }
        }
      }

      if (bestIdx === -1) continue;

      usedIndices.add(bestIdx);

      const originalP = paragraphs[bestIdx];
      const linkHtml = `<a href="${link.targetUrl}" style="color:#059669;text-decoration:underline;text-decoration-color:rgba(5,150,105,0.3);text-underline-offset:3px;font-weight:600;" title="${link.anchor.replace(/"/g, '&quot;')}">${link.anchor}</a>`;

      const contextPhrases = [
        `For a deeper dive, check out our guide on ${linkHtml}.`,
        `You might also find our resource on ${linkHtml} helpful.`,
        `Learn more in our detailed breakdown of ${linkHtml}.`,
        `We cover this in more detail in ${linkHtml}.`,
        `Related reading: ${linkHtml}.`,
        `For practical examples, see ${linkHtml}.`,
      ];

      const phrase = contextPhrases[usedIndices.size % contextPhrases.length];
      const modifiedP = originalP.replace(/<\/p>/i, ` ${phrase}</p>`);
      result = result.replace(originalP, modifiedP);
    }

    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY EXPORT (required by EnterpriseContentOrchestrator)
// ═══════════════════════════════════════════════════════════════════════════════

export function createInternalLinkEngine(
  sitePages?: SitePage[]
): SOTAInternalLinkEngine {
  return new SOTAInternalLinkEngine(sitePages);
}

export default SOTAInternalLinkEngine;
