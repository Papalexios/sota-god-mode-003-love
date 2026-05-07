# /api/llms-txt — Generate llms.txt from a WordPress sitemap

`llms.txt` is the emerging spec ([llmstxt.org](https://llmstxt.org/)) for telling
AI assistants (Perplexity, ChatGPT browse, Google AI Overviews, Claude with web)
which URLs on your site are canonical and citation-worthy. Sites that ship a good
`llms.txt` get cited noticeably more.

This Cloudflare Pages Function builds one on demand from any WordPress sitemap.

## Endpoint

```
GET /api/llms-txt?site=https://your-wordpress-site.com
```

### Query params

| Param  | Required | Description |
|--------|----------|-------------|
| `site` | yes      | Origin of the WordPress site (with `https://`, no trailing slash needed). |

### Response

`200 text/plain` containing markdown-flavoured llms.txt:

```
# llms.txt for https://your-site.com
# Spec: https://llmstxt.org/
# Generated: 2026-05-07T13:55:00.000Z

> Canonical, citation-worthy URLs for AI assistants and search engines.

## Pages

- [Home](https://your-site.com/)
- [Pricing](https://your-site.com/pricing/)
- [Best Crm For Small Business](https://your-site.com/best-crm-for-small-business/)
…
```

`400` if `site` is missing or not a valid `http(s)://` URL.

## How it discovers URLs

It tries these standard sitemap paths in order and uses the first one that returns XML:

1. `/sitemap_index.xml`
2. `/sitemap.xml`
3. `/wp-sitemap.xml` (WordPress 5.5+ default)
4. `/sitemap-posts.xml`

If the file is a sitemap **index**, it fetches up to the first 5 child sitemaps
and merges their `<loc>` entries. Output is deduped and capped at 500 URLs.

## Examples

### curl
```bash
curl "https://your-app.pages.dev/api/llms-txt?site=https://example.com" \
  -o llms.txt
```

### Browser
Open `https://your-app.pages.dev/api/llms-txt?site=https://example.com` and
save the response.

### Deploy as a static file on your WordPress site

1. Run the curl above and download `llms.txt`.
2. Upload it to your WordPress root so it serves at `https://example.com/llms.txt`.
3. (Optional) Add a `<link rel="llms" href="/llms.txt">` to your `<head>` via
   your theme's `header.php` or an SEO plugin.

### Schedule a refresh

Use any cron service (GitHub Actions, Cloudflare Cron Triggers, Vercel cron) to
hit the endpoint daily and re-deploy the file:

```yaml
# .github/workflows/refresh-llms-txt.yml
on:
  schedule: [{ cron: '0 6 * * *' }]
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsSL "https://your-app.pages.dev/api/llms-txt?site=https://example.com" > llms.txt
      - run: # commit / upload as needed
```

## Caching

The endpoint sets `Cache-Control: public, max-age=3600, s-maxage=3600`, so
Cloudflare's edge will cache responses for 1 hour. Force a refresh by adding any
cache-buster query param: `?site=…&v=2`.

## Limits

- Max 500 URLs per response (truncated alphabetically by sitemap order).
- Each upstream sitemap fetch has an 8-second timeout.
- Sites that block bots in `robots.txt` will still serve their public sitemap to
  this function — we send a `LLMs-Txt-Bot/1.0` user agent.

## Errors

| Status | Cause |
|--------|-------|
| 400 | Missing or invalid `site` param. |
| 200 with empty `## Pages` list | None of the standard sitemap paths returned XML. Verify your site has one of the paths listed above. |
