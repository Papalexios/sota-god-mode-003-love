// functions/api/llms-txt.ts
// Cloudflare Pages Function. Generates an llms.txt file from a WordPress
// sitemap URL. Usage: /api/llms-txt?site=https://example.com
//
// llms.txt is the emerging convention (https://llmstxt.org/) for telling
// LLMs which URLs on a site are canonical and worth citing. Serving this
// file dramatically improves citation likelihood in Perplexity, ChatGPT
// browse, and Google AI Overviews.

interface Env {}

const SITEMAP_CANDIDATES = [
  '/sitemap_index.xml',
  '/sitemap.xml',
  '/wp-sitemap.xml',
  '/sitemap-posts.xml',
];

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'LLMs-Txt-Bot/1.0' } });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
}

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const site = url.searchParams.get('site');
  if (!site || !/^https?:\/\//i.test(site)) {
    return new Response('Missing or invalid ?site=https://example.com', { status: 400 });
  }
  const base = site.replace(/\/$/, '');

  // Try standard sitemap locations
  let urls: string[] = [];
  for (const path of SITEMAP_CANDIDATES) {
    const xml = await fetchText(base + path);
    if (!xml) continue;
    const locs = extractLocs(xml);
    // If it's a sitemap index, fetch first 3 child sitemaps
    const childSitemaps = locs.filter(u => /sitemap.*\.xml$/i.test(u)).slice(0, 5);
    if (childSitemaps.length > 0) {
      const childXmls = await Promise.all(childSitemaps.map(u => fetchText(u)));
      childXmls.forEach(x => { if (x) urls.push(...extractLocs(x)); });
    } else {
      urls.push(...locs);
    }
    if (urls.length > 0) break;
  }

  // Dedupe and cap
  urls = Array.from(new Set(urls)).slice(0, 500);

  const lines: string[] = [
    `# llms.txt for ${base}`,
    `# Spec: https://llmstxt.org/`,
    `# Generated: ${new Date().toISOString()}`,
    ``,
    `> Canonical, citation-worthy URLs for AI assistants and search engines.`,
    ``,
    `## Pages`,
    ``,
  ];

  for (const u of urls) {
    const slug = (u.replace(base, '').replace(/\/$/, '').split('/').pop() || 'home')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase()) || 'Home';
    lines.push(`- [${slug}](${u})`);
  }

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
