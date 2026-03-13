export interface WordPressMediaItem {
  id: number;
  sourceUrl: string;
  title: string;
  alt: string;
  caption: string;
  description: string;
  width?: number;
  height?: number;
  relevanceScore: number;
}

interface MediaServiceConfig {
  wpUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
}

function stripHtml(input: string): string {
  return (input || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function toRenderableText(input: unknown): string {
  if (typeof input === 'string') return stripHtml(input);
  if (input && typeof input === 'object') {
    const rendered = (input as Record<string, unknown>).rendered;
    if (typeof rendered === 'string') return stripHtml(rendered);
    const raw = (input as Record<string, unknown>).raw;
    if (typeof raw === 'string') return stripHtml(raw);
  }
  return '';
}

function escapeAttr(input: string): string {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtml(input: string): string {
  return (input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function keywordTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

function scoreRelevance(item: WordPressMediaItem, keyword: string): number {
  const tokens = keywordTokens(keyword);
  if (tokens.length === 0) return 0;

  const haystack = `${item.title} ${item.alt} ${item.caption} ${item.description} ${item.sourceUrl}`.toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 4;
    if (item.title.toLowerCase().includes(token)) score += 3;
    if (item.alt.toLowerCase().includes(token)) score += 2;
  }

  if (item.alt.length > 12) score += 2;
  if (item.caption.length > 20) score += 1;
  return score;
}

function optimizeAltText(item: WordPressMediaItem, keyword: string): string {
  const raw = stripHtml(item.alt || item.title || item.caption || '');
  const fallback = `${keyword} practical example`;
  let alt = raw.length >= 8 ? raw : fallback;

  if (!alt.toLowerCase().includes(keyword.toLowerCase())) {
    alt = `${alt} for ${keyword}`;
  }

  return alt.slice(0, 140).trim();
}

function optimizeCaption(item: WordPressMediaItem, keyword: string): string {
  const fromCaption = stripHtml(item.caption);
  const fromDescription = stripHtml(item.description);

  const base = fromCaption || fromDescription || `${item.title}: useful visual context for ${keyword}.`;
  if (!base) return `Helpful visual reference for ${keyword}.`;
  return base.slice(0, 220).trim();
}

export class WordPressMediaService {
  private config: MediaServiceConfig;

  constructor(config: MediaServiceConfig) {
    this.config = config;
  }

  private isConfigured(): boolean {
    return !!this.config.wpUrl;
  }

  private buildKeywordTerms(keyword: string): string[] {
    const tokens = keywordTokens(keyword);
    if (tokens.length === 0) return [keyword.trim()].filter(Boolean);
    return tokens.slice(0, 4);
  }

  private async fetchPublicMediaViaProxy(keyword: string): Promise<any[]> {
    if (!this.config.wpUrl) return [];

    const withProtocol = this.config.wpUrl.startsWith('http://') || this.config.wpUrl.startsWith('https://')
      ? this.config.wpUrl
      : `https://${this.config.wpUrl}`;

    let origin = '';
    try {
      origin = new URL(withProtocol).origin;
    } catch {
      return [];
    }

    const fields = 'id,source_url,alt_text,title,caption,description,media_type,mime_type,media_details,date';
    const terms = this.buildKeywordTerms(keyword);

    const urls = [
      ...terms.map((term) => `${origin}/wp-json/wp/v2/media?per_page=40&page=1&search=${encodeURIComponent(term)}&_fields=${fields}`),
      `${origin}/wp-json/wp/v2/media?per_page=40&page=1&_fields=${fields}`,
    ];

    const merged: any[] = [];

    for (const targetUrl of urls) {
      try {
        const response = await fetch(`/api/fetch-sitemap?url=${encodeURIComponent(targetUrl)}`);
        if (!response.ok) continue;

        const contentType = response.headers.get('content-type') || '';
        let content = '';

        if (contentType.includes('application/json')) {
          const json = await response.json().catch(() => null);
          content = typeof json?.content === 'string' ? json.content : '';
        } else {
          content = await response.text();
        }

        if (!content) continue;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          merged.push(...parsed);
        }
      } catch {
        continue;
      }
    }

    return merged;
  }

  private normalizeRawItem(raw: any): WordPressMediaItem | null {
    const sourceUrl = String(raw?.source_url || raw?.sourceUrl || '').trim();
    if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return null;

    const title = toRenderableText(raw?.title) || stripHtml(String(raw?.title?.rendered || raw?.title || ''));
    const caption = toRenderableText(raw?.caption) || stripHtml(String(raw?.caption?.rendered || raw?.caption || ''));
    const description = toRenderableText(raw?.description) || stripHtml(String(raw?.description?.rendered || raw?.description || ''));

    return {
      id: Number(raw?.id || 0),
      sourceUrl,
      title,
      alt: stripHtml(String(raw?.alt_text || raw?.alt || '')),
      caption,
      description,
      width: Number(raw?.media_details?.width || raw?.width || 0) || undefined,
      height: Number(raw?.media_details?.height || raw?.height || 0) || undefined,
      relevanceScore: 0,
    };
  }

  async getRelevantImages(keyword: string, count: number = 2): Promise<WordPressMediaItem[]> {
    if (!this.isConfigured()) return [];

    const payload = {
      wpUrl: this.config.wpUrl,
      username: this.config.wpUsername,
      appPassword: this.config.wpAppPassword,
      keyword,
      limit: 24,
    };

    const endpoints = ['/api/wp-media', '/functions/api/wp-media'];

    try {
      let rawItems: any[] = [];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            if (response.status === 404) continue;
            continue;
          }

          const json = await response.json().catch(() => null);
          const items = Array.isArray(json?.images) ? json.images : [];
          if (items.length > 0) {
            rawItems = items;
            break;
          }
        } catch {
          continue;
        }
      }

      if (rawItems.length === 0) {
        rawItems = await this.fetchPublicMediaViaProxy(keyword);
      }

      if (rawItems.length === 0) return [];

      const normalized = rawItems
        .map((item: any) => this.normalizeRawItem(item))
        .filter((item: WordPressMediaItem | null): item is WordPressMediaItem => !!item)
        .map((item) => ({ ...item, relevanceScore: scoreRelevance(item, keyword) }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const dedup = new Set<string>();
      const selected: WordPressMediaItem[] = [];

      for (const item of normalized) {
        if (dedup.has(item.sourceUrl)) continue;
        dedup.add(item.sourceUrl);
        selected.push(item);
        if (selected.length >= count) break;
      }

      return selected;
    } catch {
      return [];
    }
  }

  buildImageSectionHtml(images: WordPressMediaItem[], keyword: string): string {
    if (!images || images.length === 0) return '';

    const cards = images.map((img) => {
      const alt = optimizeAltText(img, keyword);
      const caption = optimizeCaption(img, keyword);
      const title = escapeHtml(img.title || keyword);

      return `<figure style="margin:0;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(15,23,42,0.06);">
  <img src="${escapeAttr(img.sourceUrl)}" alt="${escapeAttr(alt)}" loading="lazy" decoding="async" style="display:block;width:100%;height:auto;max-height:420px;object-fit:cover;">
  <figcaption style="padding:14px 16px 16px;">
    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0f172a;line-height:1.4;">${title}</p>
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(caption)}</p>
  </figcaption>
</figure>`;
    }).join('\n');

    return `
<section data-wp-gallery-images="true" style="margin:48px 0;">
  <h2 style="font-size:1.9em;font-weight:900;color:#0f172a;margin:0 0 18px 0;line-height:1.15;letter-spacing:-0.02em;font-family:'Inter',system-ui,sans-serif;">🖼️ Visual Examples From the WordPress Media Library</h2>
  <p style="margin:0 0 18px 0;color:#475569;font-size:16px;line-height:1.75;">These visuals reinforce key ideas in ${escapeHtml(keyword)} and make the guide easier to scan on desktop and mobile.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;">
    ${cards}
  </div>
</section>`;
  }
}
