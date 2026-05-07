import { describe, it, expect } from 'vitest';
import { extractEntityCandidates, measureEntityCoverage } from '../EntityGraph';

describe('EntityGraph.extractEntityCandidates', () => {
  it('returns capitalized phrases from SERP titles', () => {
    const ents = extractEntityCandidates({
      serpTitles: [
        'How Stripe and Shopify Power Modern Commerce',
        'Best Practices from Google Cloud',
      ],
      neuronTerms: [],
      primaryKeyword: 'modern commerce',
    });
    const names = ents.map(e => e.entity);
    expect(names).toEqual(expect.arrayContaining(['stripe', 'shopify', 'google cloud']));
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
});
