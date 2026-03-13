// YOUTUBE SERVICE - Video Reference Integration

import type { YouTubeVideo } from './types';

export class YouTubeService {
  private serperApiKey: string;

  constructor(serperApiKey: string) {
    this.serperApiKey = serperApiKey;
  }

  async searchVideos(query: string, maxResults: number = 5): Promise<YouTubeVideo[]> {
    if (!this.serperApiKey) {
      console.warn('No Serper API key provided for YouTube search - using fallback search');
      return this.searchVideosFallback(query, maxResults);
    }

    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: query,
          num: maxResults
        })
      });

      const rawText = await response.text();

      if (!response.ok) {
        const lowerBody = rawText.toLowerCase();
        const isCreditsError =
          lowerBody.includes('not enough credits') ||
          lowerBody.includes('quota') ||
          lowerBody.includes('insufficient');

        if (isCreditsError) {
          console.warn('Serper credits exhausted for YouTube search - using fallback search');
          return this.searchVideosFallback(query, maxResults);
        }

        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = JSON.parse(rawText || '{}');
      const videos = Array.isArray(data.videos) ? data.videos : [];

      const mapped = videos.slice(0, maxResults).map((video: Record<string, unknown>) => ({
        id: this.extractVideoId(video.link as string || ''),
        title: video.title as string || '',
        channelTitle: video.channel as string || '',
        description: video.snippet as string || '',
        thumbnailUrl: video.imageUrl as string || '',
        publishedAt: video.date as string || '',
        viewCount: undefined,
        duration: video.duration as string || undefined
      })).filter((video: YouTubeVideo) => !!video.id);

      if (mapped.length > 0) return mapped;
      return this.searchVideosFallback(query, maxResults);
    } catch (error) {
      console.error('Error searching YouTube videos:', error);
      return this.searchVideosFallback(query, maxResults);
    }
  }

  private async searchVideosFallback(query: string, maxResults: number): Promise<YouTubeVideo[]> {
    try {
      const sources = [
        `https://duckduckgo.com/html/?q=${encodeURIComponent(`${query} site:youtube.com/watch`)}`,
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        `https://www.bing.com/search?q=${encodeURIComponent(`${query} site:youtube.com/watch`)}`,
        `https://r.jina.ai/http://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      ];

      let html = '';
      for (const source of sources) {
        html = await this.fetchTextViaServerProxy(source);
        if (html && html.length > 200) break;
      }

      const anchorCandidates = this.extractYoutubeCandidatesFromHtml(html);
      const idCandidates = this.extractVideoIdsFromText(html).map((id) => ({
        url: `https://www.youtube.com/watch?v=${id}`,
        title: '',
      }));

      const seenIds = new Set<string>();
      const candidates = [...anchorCandidates, ...idCandidates]
        .filter((item) => {
          const id = this.extractVideoId(item.url);
          if (!id || seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        })
        .slice(0, maxResults);

      const mappedFromHtml = candidates.map((item, idx) => {
        const id = this.extractVideoId(item.url);
        return {
          id,
          title: item.title || `${query} video ${idx + 1}`,
          channelTitle: '',
          description: `Relevant YouTube resource for ${query}`,
          thumbnailUrl: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '',
          publishedAt: '',
          viewCount: undefined,
          duration: undefined,
        };
      }).filter((video) => !!video.id);

      if (mappedFromHtml.length > 0) return mappedFromHtml;
      return await this.searchVideosFromResilientApi(query, maxResults);
    } catch (error) {
      console.error('Fallback YouTube search failed:', error);
      return [];
    }
  }

  async getGuaranteedFallbackVideos(keyword: string, maxResults: number = 1): Promise<YouTubeVideo[]> {
    const queries = [`${keyword} tutorial`, `how to ${keyword}`, `${keyword} explained`];
    const dedup = new Map<string, YouTubeVideo>();

    for (const query of queries) {
      const videos = await this.searchVideosFromResilientApi(query, Math.max(2, maxResults * 2));
      for (const video of videos) {
        if (!video.id || dedup.has(video.id)) continue;
        dedup.set(video.id, video);
        if (dedup.size >= maxResults) return Array.from(dedup.values());
      }
    }

    return Array.from(dedup.values()).slice(0, maxResults);
  }

  private async searchVideosFromResilientApi(query: string, maxResults: number): Promise<YouTubeVideo[]> {
    const sources = [
      `https://piped.video/api/v1/search?q=${encodeURIComponent(query)}&filter=videos`,
      `https://invidious.privacyredirect.com/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
      `https://invidious.nerdvpn.de/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
    ];

    const dedup = new Map<string, YouTubeVideo>();

    for (const source of sources) {
      try {
        const payload = await this.fetchTextViaServerProxy(source);
        if (!payload || payload.length < 8) continue;

        const parsed = JSON.parse(payload);
        const rows: any[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.items)
            ? parsed.items
            : [];

        for (const row of rows) {
          const candidateUrl = String(row?.url || row?.link || row?.href || '');
          const rawId = String(row?.id || row?.videoId || '');
          const id = this.extractVideoId(candidateUrl) || (/^[a-zA-Z0-9_-]{11}$/.test(rawId) ? rawId : '');
          if (!id || dedup.has(id)) continue;

          const title = String(row?.title || '').trim() || `${query} video`;
          const channelTitle = String(row?.uploaderName || row?.author || row?.channelName || '').trim();
          const description = String(row?.description || row?.shortDescription || '').trim() || `Relevant YouTube resource for ${query}`;
          const thumbCandidate = String(row?.thumbnail || row?.thumbnailUrl || row?.thumbnail_url || '');
          const thumbnailUrl = /^https?:\/\//i.test(thumbCandidate)
            ? thumbCandidate
            : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

          dedup.set(id, {
            id,
            title,
            channelTitle,
            description,
            thumbnailUrl,
            publishedAt: '',
            viewCount: undefined,
            duration: String(row?.duration || '') || undefined,
          });

          if (dedup.size >= maxResults) {
            return Array.from(dedup.values()).slice(0, maxResults);
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(dedup.values()).slice(0, maxResults);
  }

  private async fetchTextViaServerProxy(url: string): Promise<string> {
    const response = await fetch(`/api/fetch-sitemap?url=${encodeURIComponent(url)}`);
    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null);
      return String(json?.content || '');
    }

    return await response.text();
  }

  private extractVideoIdsFromText(text: string): string[] {
    const ids = new Set<string>();
    const patterns = [
      /"videoId":"([a-zA-Z0-9_-]{11})"/g,
      /watch\?v=([a-zA-Z0-9_-]{11})/g,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/g,
      /\/shorts\/([a-zA-Z0-9_-]{11})/g,
      /%2Fwatch%3Fv%3D([a-zA-Z0-9_-]{11})/gi,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) ids.add(match[1]);
      }
    }

    return Array.from(ids);
  }

  private extractYoutubeCandidatesFromHtml(html: string): Array<{ url: string; title: string }> {
    const out: Array<{ url: string; title: string }> = [];
    const seen = new Set<string>();

    const anchorRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let anchorMatch: RegExpExecArray | null;

    while ((anchorMatch = anchorRegex.exec(html)) !== null) {
      const rawHref = anchorMatch[1] || '';
      const title = (anchorMatch[2] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      let decoded = rawHref;
      if (rawHref.includes('uddg=')) {
        const encoded = rawHref.match(/[?&]uddg=([^&]+)/i)?.[1];
        if (encoded) decoded = decodeURIComponent(encoded);
      }

      const normalized = decoded.startsWith('//') ? `https:${decoded}` : decoded;
      if (!/https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(normalized)) continue;

      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ url: normalized, title });
    }

    const directRegex = /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=[\w-]{6,}|shorts\/[\w-]{6,})|youtu\.be\/[\w-]{6,})[^\s"'<>]*/gi;
    const directMatches = html.match(directRegex) || [];
    for (const match of directMatches) {
      const key = match.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ url: match, title: '' });
    }

    return out;
  }

  private extractVideoId(url: string): string {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\s#]+)/,
      /(?:youtu\.be\/)([^?&\s#]+)/,
      /(?:youtube\.com\/embed\/)([^?&\s#]+)/,
      /(?:youtube\.com\/v\/)([^?&\s#]+)/,
      /(?:youtube\.com\/shorts\/)([^?&\s#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return '';
  }

  formatVideoEmbed(video: YouTubeVideo): string {
    return `
<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; margin: 24px 0;">
  <iframe 
    src="https://www.youtube.com/embed/${video.id}" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
    allowfullscreen
    title="${video.title}"
  ></iframe>
</div>
<p style="font-size: 14px; color: #4b5563; margin-top: 8px;"><strong>${video.title}</strong> by ${video.channelTitle}</p>
`;
  }

  formatVideoCard(video: YouTubeVideo): string {
    return `
<div class="video-card" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 16px; padding: 20px; margin: 20px 0; border: 2px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
  <div style="display: flex; gap: 16px; align-items: flex-start;">
    <img src="${video.thumbnailUrl}" alt="${video.title}" style="width: 160px; height: 90px; object-fit: cover; border-radius: 8px;">
    <div style="flex: 1;">
      <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">
        <a href="https://youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer" style="color: #1f2937; text-decoration: none;">
          ${video.title}
        </a>
      </h4>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">${video.channelTitle}</p>
      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.5;">${video.description?.slice(0, 120)}...</p>
    </div>
  </div>
</div>
`;
  }

  private scoreVideoRelevance(video: YouTubeVideo, keyword: string): number {
    const tokens = keyword
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2);

    const haystack = `${video.title} ${video.description} ${video.channelTitle}`.toLowerCase();
    let score = 0;

    for (const token of tokens) {
      if (haystack.includes(token)) score += 4;
      if (video.title.toLowerCase().includes(token)) score += 5;
    }

    if (/tutorial|how\s*to|guide|explained|case study|strategy|mistake/i.test(video.title)) score += 6;
    if (/minute|min|\d{4}/i.test(video.title)) score += 1;

    return score;
  }

  async getRelevantVideos(keyword: string, contentType: string = 'guide'): Promise<YouTubeVideo[]> {
    const baseQueries = [
      `${keyword} tutorial`,
      `${keyword} explained`,
      `${keyword} strategy`,
      `${keyword} mistakes`,
      `${keyword} case study`,
    ];

    const querySet = contentType === 'how-to'
      ? [baseQueries[0], `how to ${keyword}`, baseQueries[3]]
      : contentType === 'guide'
        ? [baseQueries[1], baseQueries[2], baseQueries[4]]
        : [baseQueries[0], baseQueries[1], baseQueries[2]];

    const allResults = await Promise.all(querySet.map((q) => this.searchVideos(q, 6)));

    const dedup = new Map<string, YouTubeVideo>();
    for (const videos of allResults) {
      for (const video of videos) {
        if (!video.id) continue;
        if (!dedup.has(video.id)) dedup.set(video.id, video);
      }
    }

    return Array.from(dedup.values())
      .map((video) => ({ video, score: this.scoreVideoRelevance(video, keyword) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((entry) => entry.video);
  }
}

export function createYouTubeService(serperApiKey: string): YouTubeService {
  return new YouTubeService(serperApiKey);
}
