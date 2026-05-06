// Vitest suite for the pre-publish blog-post checklist validator.
// Generates sample posts (compliant + intentionally broken) and asserts
// the validator catches every required block, structured section, and
// snippet-ready summary.

import { describe, it, expect } from 'vitest';
import {
  runBlogPostChecklist,
  buildMissingSectionsRewritePrompt,
} from '../BlogPostChecklist';

// ─── Sample post fixtures ────────────────────────────────────────────────

function buildCompliantSamplePost(keyword = 'blue house plants'): {
  html: string;
  title: string;
  metaDescription: string;
} {
  const title = `${keyword.replace(/\b\w/g, c => c.toUpperCase())}: 12 Proven Picks for 2026`; // ~52 chars
  const metaDescription = `Discover the best ${keyword} for low-light rooms — 12 tested picks, care tips, and the 3 mistakes that kill them in 2026. Real data inside.`;

  const html = `
<article>
  <h1>${title}</h1>
  <p>By Editorial Team — Updated 2026. I've spent 47 days testing ${keyword} in my own apartment, tracking 1,247 data points across 12 species. Here's what actually works.</p>

  <div class="short-answer"><strong>Short Answer:</strong> The best ${keyword} for beginners are the Pilea peperomioides, Senecio rowleyanus, and Strelitzia nicolai — all three tolerate indirect light, survive 14-day watering gaps, and stay under $40. I tested 12 species over 6 months and these three returned the highest survival rate (94%).</div>

  <div class="key-takeaways"><strong>Key Takeaways</strong>
    <ul>
      <li>Pick species with 73% or higher survival rate.</li>
      <li>Water every 7–10 days, not daily.</li>
      <li>Avoid south-facing windows after 2pm.</li>
    </ul>
  </div>

  <h2>What Are the Best Blue House Plants?</h2>
  <p>I tracked 1,247 data points (MIT Sloan, 2024 study referenced). Among 12 species, 73.2% survived 6 months under standard apartment conditions. My friend Sarah — runs a $4M e-commerce brand — confirmed the same pattern.</p>
  <ul>
    <li>Pilea peperomioides — 94% survival</li>
    <li>Senecio rowleyanus — 88% survival</li>
    <li>Strelitzia nicolai — 81% survival</li>
  </ul>
  <p>Visit <a href="https://www.rhs.org.uk/plants">RHS plant database</a> for verified care guides.</p>

  <h2>How Much Light Do They Need?</h2>
  <p>I measured lux levels for 30 days. Most species need 200–500 lux. My data shows 87% of failures happen below 150 lux. Read the <a href="/care-guide">internal care guide</a>.</p>
  <blockquote>"Most people overwater by 3x what these plants actually need." — Dr. Andrew Huberman, Stanford lab, 2024</blockquote>

  <h2>Why Do Most Owners Fail?</h2>
  <p>Two reasons: 62% overwater, 28% pick the wrong window. My own first attempt killed 4 plants in 30 days. I was wrong. Here's what changed: I started using a $12 moisture meter from <a href="https://www.amazon.com/dp/B07XYZ">Amazon</a>.</p>

  <h2>When Should You Repot?</h2>
  <p>Every 18 months on average. I tracked 47 repottings — 89% succeeded when done in spring. Reference: <a href="https://extension.umn.edu/houseplants">University of Minnesota Extension</a>.</p>
  <p>Also see <a href="/internal-link-2">our repotting guide</a> and <a href="/internal-link-3">soil-mix breakdown</a>.</p>

  <h2>Comparison: Top 3 Species</h2>
  <table>
    <thead><tr><th>Species</th><th>Light</th><th>Cost</th><th>Survival</th></tr></thead>
    <tbody>
      <tr><td>Pilea</td><td>Indirect</td><td>$25</td><td>94%</td></tr>
      <tr><td>Senecio</td><td>Bright</td><td>$18</td><td>88%</td></tr>
      <tr><td>Strelitzia</td><td>Indirect</td><td>$40</td><td>81%</td></tr>
    </tbody>
  </table>

  <h2>Frequently Asked Questions</h2>
  <details><summary>Q: How often should I water?</summary><div>Every 7–10 days, not daily. I tested both intervals across 12 plants over 90 days.</div></details>
  <details><summary>Q: Do they need fertilizer?</summary><div>Yes — once monthly in growing season. I use a $9 bottle that lasts 18 months.</div></details>
  <details><summary>Q: Can they survive winter?</summary><div>Yes if you keep them above 60°F. I lost 3 plants in 2023 by ignoring this.</div></details>

  <p>Verified sources: <a href="https://www.rhs.org.uk">RHS</a>, <a href="https://extension.umn.edu">UMN Extension</a>, <a href="https://www.almanac.com">Old Farmer's Almanac</a>.</p>
  <img src="https://example.com/plant.jpg" alt="${keyword}" />
</article>
`.trim();

  return { html, title, metaDescription };
}

function buildBrokenSamplePost(): {
  html: string;
  title: string;
  metaDescription: string;
} {
  return {
    title: 'Plants', // too short, no keyword
    metaDescription: 'A short bad meta.', // too short
    html: `<article><h1>Plants</h1><p>Plants are great. Lots of plants exist. The end.</p></article>`,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('runBlogPostChecklist — compliant sample post', () => {
  const sample = buildCompliantSamplePost();
  const result = runBlogPostChecklist({
    html: sample.html,
    title: sample.title,
    metaDescription: sample.metaDescription,
    primaryKeyword: 'blue house plants',
  });

  it('passes the mandatory checklist', () => {
    if (!result.passed) {
      // Surface what failed so future regressions are debuggable.
      console.log('Failures:', result.mandatoryFailures.map(f => f.id));
    }
    expect(result.passed).toBe(true);
    expect(result.mandatoryFailures).toHaveLength(0);
  });

  it('contains all required structured blocks', () => {
    const ids = result.items.filter(i => i.passed).map(i => i.id);
    expect(ids).toEqual(expect.arrayContaining([
      'seo.title',
      'seo.metaDescription',
      'seo.h1',
      'seo.h2Count',
      'seo.keywordInIntro',
      'seo.wordCount',
      'aeo.shortAnswer',
      'aeo.faq',
      'aeo.lists',
      'geo.namedSources',
      'geo.statistics',
      'eeat.firstPerson',
      'eeat.expertQuote',
      'ux.comparisonTable',
      'ux.keyTakeaways',
    ]));
  });

  it('produces a snippet-ready Short Answer block', () => {
    const sa = result.items.find(i => i.id === 'aeo.shortAnswer');
    expect(sa?.passed).toBe(true);
  });

  it('scores ≥85', () => {
    expect(result.score).toBeGreaterThanOrEqual(85);
  });
});

describe('runBlogPostChecklist — broken sample post', () => {
  const sample = buildBrokenSamplePost();
  const result = runBlogPostChecklist({
    html: sample.html,
    title: sample.title,
    metaDescription: sample.metaDescription,
    primaryKeyword: 'blue house plants',
  });

  it('blocks publish (mandatory failures present)', () => {
    expect(result.passed).toBe(false);
    expect(result.mandatoryFailures.length).toBeGreaterThan(5);
  });

  it('reports specific failed section ids the retry loop can target', () => {
    expect(result.failedSectionIds).toEqual(expect.arrayContaining([
      'seo.title',
      'aeo.shortAnswer',
      'aeo.faq',
      'geo.namedSources',
      'geo.statistics',
      'ux.comparisonTable',
      'ux.keyTakeaways',
    ]));
  });

  it('every failure carries a fix hint for the UI report', () => {
    for (const f of result.mandatoryFailures) {
      expect(f.fix && f.fix.length).toBeGreaterThan(0);
    }
  });
});

describe('buildMissingSectionsRewritePrompt', () => {
  it('targets only the failed elements (does not request a full rewrite)', () => {
    const sample = buildBrokenSamplePost();
    const result = runBlogPostChecklist({
      html: sample.html,
      title: sample.title,
      metaDescription: sample.metaDescription,
      primaryKeyword: 'plants',
    });
    const prompt = buildMissingSectionsRewritePrompt(
      sample.html,
      'plants',
      result.mandatoryFailures,
    );
    expect(prompt).toContain('MISSING ELEMENTS TO ADD');
    expect(prompt).toContain('Preserve all existing headings');
    expect(prompt).toContain('Short Answer');
    expect(prompt).toContain('FAQ');
  });
});
