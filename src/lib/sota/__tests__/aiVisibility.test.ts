import { describe, it, expect } from 'vitest';
import { measureAIVisibility } from '../AIVisibility';

const para = (txt: string) => `<p>${txt}</p>`;
const padding = ' filler word '.repeat(8); // pad to >=25 words

describe('AIVisibility.measureAIVisibility', () => {
  it('marks paragraphs containing percentages as citation-worthy', () => {
    const html = para('Adoption hit 73% in 2024 across enterprise teams.' + padding);
    const r = measureAIVisibility(html);
    expect(r.totalParagraphs).toBe(1);
    expect(r.citationWorthy).toBe(1);
    expect(r.ratio).toBe(1);
  });

  it('marks dollar amounts and named-source citations', () => {
    const html =
      para('Revenue jumped to $12,500 monthly per cohort, the team reported.' + padding) +
      para('According to Gartner, the trend is accelerating across SaaS.' + padding);
    const r = measureAIVisibility(html);
    expect(r.citationWorthy).toBe(2);
  });

  it('flags thin paragraphs with no signals', () => {
    const html = para('We believe content needs to be helpful and human and useful and clear.' + padding);
    const r = measureAIVisibility(html);
    expect(r.weakParagraphs).toBe(1);
    expect(r.ratio).toBe(0);
  });

  it('ignores tiny paragraphs (under 25 words)', () => {
    const html = para('Short one. Has 50% though.');
    const r = measureAIVisibility(html);
    expect(r.totalParagraphs).toBe(0);
  });

  it('computes ratio correctly across mixed paragraphs', () => {
    const html =
      para('A study from MIT in 2023 showed 45% improvement across users.' + padding) +
      para('Just opinion text without any numbers or sources to back it up.' + padding) +
      para('Revenue grew $2,400 in Q3 across all segments measured.' + padding);
    const r = measureAIVisibility(html);
    expect(r.totalParagraphs).toBe(3);
    expect(r.citationWorthy).toBe(2);
    expect(r.ratio).toBeCloseTo(2 / 3);
  });
});
