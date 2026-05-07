import { describe, it, expect } from 'vitest';
import { injectCitedQuotes } from '../CitedQuoteInjector';

const longSentence = (extra = '') =>
  `This sentence has at least twelve words inside so it qualifies for the scorer to pick. ${extra}`;

describe('CitedQuoteInjector.injectCitedQuotes', () => {
  it('injects a hidden quote block after each H2', () => {
    const html =
      `<h2>Pricing</h2><p>${longSentence('Stripe charges 2.9% plus thirty cents per transaction in 2024.')}</p>` +
      `<h2>Setup</h2><p>${longSentence('Installation typically takes 45 minutes for most teams of three engineers.')}</p>`;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(2);
    expect((r.html.match(/data-llm-quote/g) || []).length).toBe(2);
  });

  it('skips H2 sections that already contain a quote block', () => {
    const html =
      `<h2>Existing</h2><div data-llm-quote>preset</div><p>${longSentence()}</p>` +
      `<h2>Fresh</h2><p>${longSentence('New section with a 50% statistic.')}</p>`;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(1);
  });

  it('returns html unchanged when there are no H2s', () => {
    const html = '<h3>Sub</h3><p>No top-level headings here at all.</p>';
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(0);
    expect(r.html).toBe(html);
  });

  it('prefers sentences with numbers/years when scoring', () => {
    const html =
      `<h2>Adoption</h2><p>${longSentence()} The 2024 survey found 64% growth across SaaS firms in our sample. ${longSentence()}</p>`;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(1);
    expect(r.html).toMatch(/data-llm-quote[^>]*>[^<]*64%/);
  });

  it('handles H2 with attributes and class names', () => {
    const html = `<h2 class="fancy" id="x">Heading</h2><p>${longSentence('45% growth over five years across the whole portfolio.')}</p>`;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(1);
  });
});
