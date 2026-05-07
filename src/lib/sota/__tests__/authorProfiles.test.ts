import { describe, it, expect } from 'vitest';
import { extractVoiceFingerprint, buildVoiceFingerprintDirective } from '../AuthorProfiles';

describe('AuthorProfiles.extractVoiceFingerprint', () => {
  it('computes basic stats for clean input', () => {
    const sample = `I tried this approach. It failed badly. Then I rebuilt it from scratch — what a journey. The result? 73% lift in conversions. Don't trust generic advice.`;
    const fp = extractVoiceFingerprint([sample]);
    expect(fp.sampleWords).toBeGreaterThan(15);
    expect(fp.firstPersonRate).toBeGreaterThan(0);
    expect(fp.contractionRate).toBeGreaterThan(0);
    expect(fp.emDashRate).toBeGreaterThan(0);
    expect(fp.questionRate).toBeGreaterThan(0);
    expect(fp.topOpeners.length).toBeGreaterThan(0);
  });

  it('strips HTML before measuring', () => {
    const html = '<p><strong>I</strong> shipped this. We grew 40%.</p>';
    const fp = extractVoiceFingerprint([html]);
    expect(fp.sampleWords).toBeLessThan(15); // no HTML noise
    expect(fp.firstPersonRate).toBeGreaterThan(0);
  });

  it('returns zeros gracefully for empty input', () => {
    const fp = extractVoiceFingerprint(['']);
    expect(fp.avgSentenceLength).toBe(0);
    expect(fp.topOpeners).toEqual([]);
  });

  it('directive includes all key targets', () => {
    const fp = extractVoiceFingerprint(['Short. Punchy. We win — every time. Why? Because we test.']);
    const d = buildVoiceFingerprintDirective(fp);
    expect(d).toMatch(/Average sentence length/);
    expect(d).toMatch(/Em-dash usage/);
    expect(d).toMatch(/Vocabulary richness/);
    expect(d).toMatch(/sentence openers/);
  });
});
