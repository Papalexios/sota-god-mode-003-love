import { describe, it, expect } from 'vitest';
import { injectCitedQuotes } from '../CitedQuoteInjector';

describe('CitedQuoteInjector.injectCitedQuotes', () => {
  it('injects a hidden quote block after each H2', () => {
    const html = `
      <h2>Pricing</h2>
      <p>Stripe charges 2.9% plus $0.30 per transaction in 2024 across the US market.</p>
      <h2>Setup</h2>
      <p>Installation typically takes 45 minutes for most teams of three engineers.</p>
    `;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(2);
    const matches = r.html.match(/data-llm-quote/g) || [];
    expect(matches.length).toBe(2);
  });

  it('skips H2 sections that already contain a quote block', () => {
    const html = `
      <h2>Existing</h2>
      <div data-llm-quote>preset</div>
      <p>Some content here that is long enough to qualify for selection in our scorer.</p>
      <h2>Fresh</h2>
      <p>New section with a 50% statistic that should attract a quote injection.</p>
    `;
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
    const html = `
      <h2>Adoption</h2>
      <p>This is a generic statement without much value to a reader. The 2024 survey found 64% growth across SaaS firms. Another bland sentence follows here.</p>
    `;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(1);
    expect(r.html).toMatch(/data-llm-quote[^>]*>[^<]*64%/);
  });

  it('handles nested H2 attributes and class names', () => {
    const html = `<h2 class="fancy" id="x">Heading</h2><p>${'word '.repeat(20)}45% growth over five years.</p>`;
    const r = injectCitedQuotes(html);
    expect(r.injected).toBe(1);
  });
});
