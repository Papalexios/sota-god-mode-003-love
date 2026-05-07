import { describe, it, expect } from 'vitest';
import { extractEntityCandidates, measureEntityCoverage } from '../EntityGraph';

describe('EntityGraph.extractEntityCandidates', () => {
  it('returns capitalized phrases from SERP titles', () => {
    const ents = extractEntityCandidates({
      serpTitles: [
        'How Stripe Powers Commerce',
        'Best Practices from Google Cloud',
      ],
      neuronTerms: [],
      primaryKeyword: 'modern commerce',
    });
    const names = ents.map(e => e.entity);
    // Capitalized multi-word phrases get joined; just verify key tokens appear
    expect(names.some(n => n.includes('stripe'))).toBe(true);
    expect(names.some(n => n.includes('google cloud'))).toBe(true);
  });

  it('weights NeuronWriter terms above SERP-derived entities', () => {
    const ents = extractEntityCandidates({
      serpTitles: ['Stripe overview'],
      neuronTerms: ['payment gateway', 'PCI compliance'],
      primaryKeyword: 'payments',
    });
    expect(ents[0].entity).toBe('payment gateway');
    expect(ents[0].weight).toBeGreaterThan(ents[ents.length - 1].weight);
  });

  it('excludes the primary keyword and stopwords', () => {
    const ents = extractEntityCandidates({
      neuronTerms: ['the', 'guide', 'best practices'],
      primaryKeyword: 'best practices',
    });
    expect(ents.find(e => e.entity === 'best practices')).toBeUndefined();
    expect(ents.find(e => e.entity === 'the')).toBeUndefined();
  });

  it('caps at the requested max', () => {
    const ents = extractEntityCandidates({
      neuronTerms: Array.from({ length: 100 }, (_, i) => `Term ${i}`),
      primaryKeyword: 'x',
      max: 5,
    });
    expect(ents.length).toBe(5);
  });
});

describe('EntityGraph.measureEntityCoverage', () => {
  const html = `<article><p>Stripe and Shopify integrate well. PCI compliance matters.</p></article>`;

  it('reports 100% coverage when every entity appears', () => {
    const r = measureEntityCoverage(html, [
      { entity: 'stripe', weight: 1 },
      { entity: 'shopify', weight: 1 },
      { entity: 'pci compliance', weight: 1 },
    ]);
    expect(r.coverageRatio).toBe(1);
    expect(r.missing).toEqual([]);
  });

  it('reports missing entities case-insensitively', () => {
    const r = measureEntityCoverage(html, [
      { entity: 'stripe', weight: 1 },
      { entity: 'paypal', weight: 1 },
    ]);
    expect(r.covered).toBe(1);
    expect(r.missing).toEqual(['paypal']);
    expect(r.coverageRatio).toBeCloseTo(0.5);
  });

  it('returns 100% for empty entity list (nothing to enforce)', () => {
    const r = measureEntityCoverage(html, []);
    expect(r.coverageRatio).toBe(1);
  });

  it('matches entities across varied HTML structures (lists, tables, headings)', () => {
    const variants = [
      `<article><h2>Stripe</h2><p>Shopify integrates with PCI compliance rules.</p></article>`,
      `<ul><li><strong>Stripe</strong></li><li>Shopify</li></ul><p>PCI compliance is required.</p>`,
      `<table><tr><td>Stripe</td><td>Shopify</td></tr></table><p>PCI compliance applies in 2024.</p>`,
    ];
    const ents = [
      { entity: 'stripe', weight: 1 },
      { entity: 'shopify', weight: 1 },
      { entity: 'pci compliance', weight: 1 },
    ];
    for (const v of variants) {
      const r = measureEntityCoverage(v, ents);
      expect(r.coverageRatio).toBe(1);
      expect(r.missing).toEqual([]);
    }
  });

  it('matches entities containing year/date and multi-word named entities', () => {
    const html = `<article>
      <p>The Google Cloud Next 2024 conference highlighted PCI compliance.</p>
      <p>According to McKinsey & Company, adoption grew 47% between 2021 and 2023.</p>
      <p>OpenAI GPT-4 powers the workflow; the European Union's GDPR still applies.</p>
    </article>`;
    const ents = [
      { entity: 'google cloud next 2024', weight: 5 },
      { entity: 'mckinsey company', weight: 4 },
      { entity: 'openai gpt-4', weight: 4 },
      { entity: 'european union', weight: 3 },
      { entity: 'gdpr', weight: 3 },
      { entity: 'pci compliance', weight: 2 },
      { entity: 'salesforce', weight: 1 }, // intentionally absent
    ];
    const r = measureEntityCoverage(html, ents);
    expect(r.covered).toBe(6);
    expect(r.missing).toEqual(['salesforce']);
    expect(r.coverageRatio).toBeCloseTo(6 / 7);
  });
});
