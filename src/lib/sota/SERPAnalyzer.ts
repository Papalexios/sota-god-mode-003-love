// src/lib/sota/SERPAnalyzer.ts
// ═══════════════════════════════════════════════════════════════════════════════
// SERP ANALYZER v2.2 — Real-Time Search Results Analysis
//
// v2.2 Fix:
//   • FIXED: serpCache.set() now stores plain results, NOT Promise.resolve(results).
//     The old code cached a Promise object. The cache's .set() method in the old
//     cache.ts called .finally() on the value — when SOTAContentGenerationEngine
//     passed a plain object to generationCache.set(), the old cache tried to call
//     .finally() on it → "TypeError: r.finally is not a function" → crash.
//
// ═══════════════════════════════════════════════════════════════════════════════

import type { SERPResult, SERPAnalysis } from './types';
import { serpCache } from './cache';

export class SERPAnalyzer {
  private serperApiKey: string;

  constructor(serperApiKey: string) {
    this.serperApiKey = serperApiKey;
  }

  async fetchSERP(keyword: string, country: string = 'us'): Promise<SERPResult[]> {
    if (!this.serperApiKey) {
      console.warn('No Serper API key provided');
      return [];
    }

    // Check cache
    const cacheKey = { keyword, country };
    const cached = serpCache.get<SERPResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: keyword,
          gl: country,
          num: 10
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = await response.json();
      const results: SERPResult[] = (data.organic || []).map((result: Record<string, unknown>, index: number) => ({
        title: result.title as string || '',
        url: result.link as string || '',
        snippet: result.snippet as string || '',
        position: index + 1,
        domain: this.extractDomain(result.link as string || '')
      }));

      // ✅ FIX: Cache the plain results array, NOT Promise.resolve(results).
      //    Old code:  serpCache.set(cacheKey, Promise.resolve(results), 30 * 60 * 1000);
      //    This cached a Promise object. The old cache.ts called .finally() on
      //    values passed to .set(). When other code (SOTAContentGenerationEngine)
      //    passed a plain object to generationCache.set(), the old cache tried
      //    .finally() on it → TypeError → crash.
      serpCache.set(cacheKey, results, 30 * 60 * 1000);

      return results;
    } catch (error) {
      console.error('Error fetching SERP:', error);
      return [];
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  async analyze(keyword: string, country: string = 'us'): Promise<SERPAnalysis> {
    const serpData = await this.fetchSERP(keyword, country);

    if (serpData.length === 0) {
      return this.getDefaultAnalysis(keyword);
    }

    const avgWordCount = this.estimateAvgWordCount(serpData);
    const commonHeadings = this.extractCommonHeadings(serpData, keyword);
    const contentGaps = this.identifyContentGaps(serpData, keyword);
    const userIntent = this.classifyIntent(serpData, keyword);
    const semanticEntities = this.extractEntities(serpData);
    const relatedSearches = this.extractRelatedTopics(serpData, keyword);

    // Merge related searches into gaps for broader coverage
    const allGaps = [...new Set([...contentGaps, ...relatedSearches])].slice(0, 25);

    return {
      avgWordCount,
      commonHeadings,
      contentGaps: allGaps,
      userIntent,
      semanticEntities,
      topCompetitors: serpData.slice(0, 5),
      recommendedWordCount: Math.max(avgWordCount + 500, 2500),
      recommendedHeadings: this.generateRecommendedHeadings(keyword, userIntent, allGaps)
    };
  }

  private estimateAvgWordCount(serpData: SERPResult[]): number {
    const avgSnippetWords = serpData.reduce((sum, r) => sum + r.snippet.split(' ').length, 0) / serpData.length;

    if (avgSnippetWords > 40) return 3000;
    if (avgSnippetWords > 30) return 2500;
    if (avgSnippetWords > 20) return 2000;
    return 1800;
  }

  private extractCommonHeadings(serpData: SERPResult[], keyword: string): string[] {
    const headingPatterns = [
      `What is ${keyword}`,
      `How to ${keyword}`,
      `Best ${keyword}`,
      `${keyword} Guide`,
      `${keyword} Tips`,
      `Why ${keyword}`,
      `${keyword} Benefits`,
      `${keyword} vs`,
      `Top ${keyword}`,
      `${keyword} for Beginners`
    ];

    return headingPatterns.filter(heading => {
      const headingLower = heading.toLowerCase();
      return serpData.some(r =>
        r.title.toLowerCase().includes(headingLower) ||
        r.snippet.toLowerCase().includes(headingLower)
      );
    }).slice(0, 6);
  }

  private identifyContentGaps(serpData: SERPResult[], keyword: string): string[] {
    const gaps: string[] = [];

    const potentialTopics = [
      'pricing', 'cost', 'alternatives', 'comparison',
      'pros and cons', 'features', 'benefits', 'drawbacks',
      'how it works', 'getting started', 'advanced tips',
      'common mistakes', 'best practices', 'case studies',
      'statistics', 'trends', 'future', '2025 updates',
      'for beginners', 'vs competitors', 'ROI', 'tools',
      'step by step', 'checklist', 'templates', 'examples',
      'expert opinions', 'research findings', 'benchmarks'
    ];

    potentialTopics.forEach(topic => {
      const found = serpData.some(r =>
        r.snippet.toLowerCase().includes(topic) ||
        r.title.toLowerCase().includes(topic)
      );
      if (!found) {
        gaps.push(`${keyword} ${topic}`);
      }
    });

    return gaps.slice(0, 15);
  }

  /**
   * Extract related topics from SERP titles and snippets that aren't in the keyword.
   * This simulates "People Also Ask" / "Related Searches" gap analysis.
   */
  private extractRelatedTopics(serpData: SERPResult[], keyword: string): string[] {
    const keywordWords = new Set(keyword.toLowerCase().split(/\s+/));
    const topics = new Set<string>();

    serpData.forEach(result => {
      // Extract unique phrases from titles
      const titleWords = result.title.split(/[-|–—:]/);
      titleWords.forEach(phrase => {
        const cleaned = phrase.trim();
        if (cleaned.length > 10 && cleaned.length < 60) {
          const phraseWords = cleaned.toLowerCase().split(/\s+/);
          const hasNewInfo = phraseWords.some(w => w.length > 3 && !keywordWords.has(w));
          if (hasNewInfo) {
            topics.add(cleaned);
          }
        }
      });
    });

    return Array.from(topics).slice(0, 10);
  }

  private classifyIntent(serpData: SERPResult[], keyword: string): SERPAnalysis['userIntent'] {
    const words = keyword.toLowerCase().split(/\s+/);

    const transactionalWords = ['buy', 'price', 'deal', 'discount', 'cheap', 'purchase', 'order', 'coupon'];
    const commercialWords = ['best', 'top', 'vs', 'versus', 'review', 'reviews', 'comparison', 'compare', 'alternative', 'alternatives'];
    const navigationalWords = ['login', 'sign up', 'signup', 'website', 'official', 'download', 'app'];

    if (words.some(w => transactionalWords.includes(w))) return 'transactional';
    if (words.some(w => commercialWords.includes(w))) return 'commercial';
    if (words.some(w => navigationalWords.includes(w))) return 'navigational';

    return 'informational';
  }

  private extractEntities(serpData: SERPResult[]): string[] {
    const entities = new Set<string>();

    serpData.forEach(result => {
      const text = `${result.title} ${result.snippet}`;
      const matches = text.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
      matches.forEach(match => {
        if (match.length > 3 && !['The', 'This', 'That', 'These', 'What', 'How', 'Why', 'When', 'Where'].includes(match)) {
          entities.add(match);
        }
      });
    });

    return Array.from(entities).slice(0, 15);
  }

  private generateRecommendedHeadings(
    keyword: string,
    intent: SERPAnalysis['userIntent'],
    gaps: string[]
  ): string[] {
    const headings: string[] = [];

    headings.push(`What is ${keyword}?`);

    if (intent === 'informational') {
      headings.push(`How ${keyword} Works`);
      headings.push(`Key Benefits of ${keyword}`);
      headings.push(`Getting Started with ${keyword}`);
    } else if (intent === 'transactional') {
      headings.push(`Best ${keyword} Options in 2025`);
      headings.push(`${keyword} Pricing Comparison`);
      headings.push(`How to Choose the Right ${keyword}`);
    } else if (intent === 'commercial') {
      headings.push(`${keyword} Features Comparison`);
      headings.push(`Pros and Cons of ${keyword}`);
      headings.push(`Top Alternatives to ${keyword}`);
    }

    gaps.slice(0, 2).forEach(gap => {
      headings.push(gap.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
    });

    headings.push(`Frequently Asked Questions`);
    headings.push(`Conclusion`);

    return headings;
  }

  private getDefaultAnalysis(keyword: string): SERPAnalysis {
    return {
      avgWordCount: 2000,
      commonHeadings: [
        `What is ${keyword}?`,
        `How to ${keyword}`,
        `Benefits of ${keyword}`,
        `Best Practices`,
        `FAQ`
      ],
      contentGaps: [],
      userIntent: 'informational',
      semanticEntities: [],
      topCompetitors: [],
      recommendedWordCount: 2500,
      recommendedHeadings: [
        `What is ${keyword}?`,
        `How ${keyword} Works`,
        `Key Benefits`,
        `Getting Started`,
        `Best Practices`,
        `Common Mistakes to Avoid`,
        `FAQ`,
        `Conclusion`
      ]
    };
  }
}

export function createSERPAnalyzer(serperApiKey: string): SERPAnalyzer {
  return new SERPAnalyzer(serperApiKey);
}
