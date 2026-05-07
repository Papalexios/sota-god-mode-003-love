## Expert Review: Where the App Stands and What Will Make It #1 in the World

I went through the master prompt, the BlogPostChecklist, the orchestrator pipeline, NeuronWriter integration, Reference/YouTube/WordPress media services, internal link engine, schema generator, and the dashboard. Below is a brutally honest scorecard plus a concrete roadmap.

---

### Current Scorecard (1-10)

```text
Writing voice / anti-AI DNA      9   Hormozi/Ferriss prompt is best-in-class
SEO foundations (titles, H1/H2)  8   Solid checklist, missing some
AEO (answer engine)              7   Short answer + FAQ good, no entity graph
GEO (AI Overviews / LLMs)        6   Citations exist; no llms.txt, no entity layer
E-E-A-T signals                  6   First-person enforced; no real author profiles
Schema / structured data         6   FAQ + Article only; missing HowTo, Product, Speakable
SERP intel & gap closing         8   Top-3 SERP scan + gap enforcement is strong
Internal linking                 7   IDF n-gram engine; no semantic embeddings
Multimedia (image / video)       7   YT + WP media; no original chart/diagram gen
Performance / publishing UX      8   Optimistic UI, skeletons, premium nav
Measurement loop                 4   Tracker exists; no real ranking telemetry
Multi-language / international   2   Not yet
Programmatic SEO at scale        3   God Mode runs single articles, not topic graphs
```

Net: you are already top 5% of "AI content" tools. The gap to #1 is **measurement, entity intelligence, and post-publish learning loops** — not prose quality.

---

### The 12 Highest-Leverage Upgrades (in priority order)

**1. Real Search Intent Classifier (before generation, not inside the prompt).**
A dedicated lightweight LLM call that classifies the keyword as informational / commercial-investigation / transactional / navigational / local, then picks a different *content blueprint* per intent (compare-table-first for commercial, step-by-step for transactional, quick-answer + deep-dive for informational). Today the master prompt treats every topic identically.

**2. Entity Graph Layer (the missing GEO weapon).**
For every article, extract the top 30 named entities from top-3 SERP + Wikipedia + your NeuronWriter terms, then enforce that ≥80% appear in the article *with at least one cooccurrence sentence linking it to the primary entity*. This is how Google/Perplexity/ChatGPT decide an article is "topically authoritative." Add a `geo.entityCoverage` checklist item.

**3. AI-Visibility Validator (new — no competitor has this well).**
After generation, run a `chunk-and-grade` pass: split the article into ~120-token chunks and ask a small model "If a user asked '{question}', would you cite this chunk? Yes/No + reason." Reject the article if <60% of chunks are citation-worthy. This directly optimizes for AI Overviews / Perplexity / ChatGPT browse.

**4. llms.txt + ai.txt + per-article `cited_quote` block.**
Generate a site-level `/llms.txt` and inject a hidden `<div data-llm-quote>` (one tight 35-50 word quotable summary per H2). LLMs preferentially cite content shaped like this. Zero competitor in the WP-AI space ships this today.

**5. Real Author Profiles + sameAs schema.**
Add a "Author Library" panel: name, headshot, bio, credentials, sameAs URLs (LinkedIn, Twitter, Scholar). Pipe into Article + Person JSON-LD with `knowsAbout` and `alumniOf`. This is the single biggest E-E-A-T lever you're missing.

**6. Schema expansion: HowTo, Product, Review, Speakable, ItemList, BreadcrumbList.**
Auto-detect content shape (presence of `<ol>` with steps → HowTo; comparison table with prices → Product/Review; lists of named items → ItemList) and emit the right schema, not just FAQ + Article. Add `speakable` for the Short Answer block.

**7. Semantic Internal Linking (vector, not n-gram).**
Replace the IDF n-gram matcher with a small embedding model (text-embedding-3-small or open) that scores anchor candidates by cosine similarity to surrounding paragraph + page title. Cache embeddings of the sitemap. Enforce: 6-12 links, max 1 per paragraph, never two links to same URL, anchor diversity score ≥ 0.7.

**8. Original Visual Generation (charts + comparison cards).**
Detect any sentence with ≥2 numeric data points and auto-render a tiny inline SVG chart (bar/line/donut) using a deterministic generator — not images. Plus generate one custom hero "Quick Facts" card per article. Lifts dwell time + screenshot-ability for AI Overviews.

**9. Topical Cluster Graph + Programmatic SEO mode.**
Today Bulk Planner generates one pillar + N clusters as flat items. Upgrade to a true graph: pillar ↔ clusters ↔ subclusters with bidirectional internal links pre-planned, anchor text rotated, and cannibalization detector (no two articles target the same intent + keyword). Show the graph in Strategy as a force-directed visualization.

**10. Post-Publish Learning Loop (this turns the app from a generator into a system).**
After publish, every 7 days: poll Google Search Console (Cloudflare proxy → user supplies OAuth), pull impressions/CTR/avg-position per published URL, store in a `post_performance` table, and surface a "Refresh Candidates" panel: pages stuck on positions 4-15, pages losing impressions WoW. Quick Refresh becomes data-driven instead of guess-driven.

**11. Multi-language + hreflang.**
Add a "Localize" action in Review & Export: pick target locales, run a translate-and-adapt pass (not literal translation — adapt examples, currencies, named experts), emit hreflang tags, push to WordPress as separate posts in WPML/Polylang structure.

**12. Brand Voice Fingerprinting (per-tenant DNA).**
Let the user upload 3-5 of their *best* existing articles. Extract style features (sentence length distribution, em-dash frequency, contraction rate, vocabulary richness, opening pattern) and inject into the system prompt as a "brand voice fingerprint." Today every customer's output sounds the same Hormozi-flavored way.

---

### Tightening What Already Exists

- **Checklist gaps to add:** keyword in URL slug, keyword in first H2, image alt-text contains keyword, table of contents present for ≥1500w articles, 1 quote ≤ 25 words for snippet eligibility, dated freshness signal ("Updated November 2026"), passive voice ratio < 12%, Flesch reading ease ≥ 60.
- **Banned-phrase list:** auto-extract from the *generated* article and add any newly observed AI tells to a per-tenant blocklist. Self-improving.
- **Self-critique:** today it's 3 passes. Add a 4th "AI-detector pass" that runs the article through a bare-bones perplexity heuristic (long sentences with low burstiness → flag) and rewrites only flagged paragraphs.
- **NeuronWriter:** surface the live NW score (target ≥ 80) and missing-terms count as a chip on every Review row, not just inside the modal. Block publish if NW score < 70.
- **WordPress media:** today images are scored and inlined; add automatic alt-text rewriting using the generated context, and force `loading="lazy"` + `width/height` to fix CLS.
- **Schema:** validate emitted JSON-LD against schema.org's parser before injecting. Currently no validation = silent failures.
- **Reference Service:** prefer .gov / .edu / known-authority domains (build a 200-domain authority list), demote everything else. Show domain authority badge in the article preview.
- **Performance tracker:** today it stores generation metrics. Add **citation-yield**: count outbound mentions of the article on Reddit/X/news using Serper after publish.

---

### What to Cut or Hide

- The "SOTA God-Mode Intelligence" / "SOTA AI Research" labels in the published HTML are noise — strip them at publish time. They make the post smell AI-generated to humans and to LLMs scoring authenticity.
- Remove the temptation to inflate word count. Shorter (1500-2200 words) high-density articles outrank 4000-word fluff in 2026. Add a `density_score = unique_facts / words` metric and target ≥ 0.018.

---

### Suggested Build Order (4 milestones)

```text
M1  AI-Visibility + Entity Graph + llms.txt + schema expansion
    (biggest GEO/AEO leap; ~1 week)

M2  Author profiles + Person schema + brand voice fingerprint
    (biggest E-E-A-T leap; ~3-4 days)

M3  Semantic internal linking + topical cluster graph + cannibalization detector
    (biggest topical authority leap; ~1 week)

M4  GSC integration + refresh-candidates panel + post-publish learning loop
    (turns it into a system competitors can't copy; ~1 week)
```

After M1-M4 there is no public competitor — Frase, Surfer, Outranking, MarketMuse, Koala — that matches this stack.

---

### Technical Notes

- All new GEO checks (entity graph, AI-visibility, density) belong as additional `ChecklistItem`s inside `BlogPostChecklist.ts` so they flow through the existing auto-retry + publish-gate pipeline.
- New phases slot into `EnterpriseContentOrchestrator.ts` between current Phase 7b (gap coverage) and Phase 8 (polish): Phase 7c (entity graph), Phase 7d (AI-visibility chunk grading).
- llms.txt + ai.txt are static files served from Cloudflare Pages — generate per build from the WP sitemap.
- GSC OAuth needs a Cloudflare Pages Function (`functions/api/gsc-callback.ts`) since Supabase edge is reserved for `wordpress-publish`.
- Author profiles + brand voice fingerprints are user data → add tables `authors`, `voice_profiles` in Supabase with RLS by `user_id`.

---

Tell me which milestone to ship first and I will plan it in detail. My recommendation is **M1 (AI-Visibility + Entity Graph + llms.txt + schema expansion)** — it gives the largest visible jump in AI Overviews and Perplexity citations within days of shipping.