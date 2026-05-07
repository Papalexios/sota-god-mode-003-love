// src/lib/sota/CitedQuoteInjector.ts
// Injects a hidden, machine-readable 35–55 word summary right after each <h2>.
// Format: <div data-llm-quote hidden>...</div>
// LLMs (Perplexity, ChatGPT browse, Google AI Overviews) preferentially cite
// short, self-contained, factual snippets adjacent to the relevant heading.

const stripTags = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function pickSummarySentence(sectionText: string, headingText: string): string {
  const sentences = sectionText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 12 && s.split(/\s+/).length <= 45);

  if (sentences.length === 0) return '';
  // Prefer sentences containing a number, year, or % — most citation-worthy
  const scored = sentences.map(s => ({
    s,
    score:
      (/\b\d+(?:\.\d+)?\s?%/.test(s) ? 3 : 0) +
      (/\$\s?\d{2,}/.test(s) ? 2 : 0) +
      (/\b(?:19|20)\d{2}\b/.test(s) ? 2 : 0) +
      (s.toLowerCase().includes(headingText.toLowerCase().split(' ')[0] || '') ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].s;
}

export function injectCitedQuotes(html: string): { html: string; injected: number } {
  // Split by H2 boundaries
  const parts = html.split(/(<h2[^>]*>[\s\S]*?<\/h2>)/i);
  if (parts.length < 3) return { html, injected: 0 };

  let injected = 0;
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i]);
    if (/^<h2/i.test(parts[i]) && i + 1 < parts.length) {
      const headingText = stripTags(parts[i]);
      const nextChunk = parts[i + 1] || '';
      // Skip if a quote already exists in this section
      if (/data-llm-quote/i.test(nextChunk)) continue;
      const sectionText = stripTags(nextChunk.split(/<h2/i)[0]);
      const summary = pickSummarySentence(sectionText, headingText);
      if (summary) {
        out.push(
          `\n<div data-llm-quote hidden aria-hidden="true" style="display:none">${summary}</div>\n`,
        );
        injected++;
      }
    }
  }
  return { html: out.join(''), injected };
}
