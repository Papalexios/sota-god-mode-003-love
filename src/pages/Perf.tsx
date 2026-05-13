import { useEffect, useState } from "react";
import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";
import { Link } from "react-router-dom";
import { Activity, ArrowLeft, Gauge, Zap } from "lucide-react";

type V = { value: number; rating: Metric["rating"] };
type Vitals = Record<"LCP" | "INP" | "CLS" | "FCP" | "TTFB", V | null>;

const TARGETS: Record<keyof Vitals, { good: number; poor: number; unit: string; help: string }> = {
  LCP: { good: 2500, poor: 4000, unit: "ms", help: "Largest Contentful Paint — main hero render time" },
  INP: { good: 200, poor: 500, unit: "ms", help: "Interaction to Next Paint — input responsiveness" },
  CLS: { good: 0.1, poor: 0.25, unit: "", help: "Cumulative Layout Shift — visual stability" },
  FCP: { good: 1800, poor: 3000, unit: "ms", help: "First Contentful Paint" },
  TTFB: { good: 800, poor: 1800, unit: "ms", help: "Time To First Byte" },
};

const fmt = (k: keyof Vitals, v: number) =>
  k === "CLS" ? v.toFixed(3) : `${Math.round(v)}${TARGETS[k].unit}`;

const colorFor = (rating: Metric["rating"]) =>
  rating === "good"
    ? "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
    : rating === "needs-improvement"
    ? "text-amber-300 border-amber-500/40 bg-amber-500/10"
    : "text-rose-300 border-rose-500/40 bg-rose-500/10";

export default function Perf() {
  const [vitals, setVitals] = useState<Vitals>({
    LCP: null, INP: null, CLS: null, FCP: null, TTFB: null,
  });

  useEffect(() => {
    const set = (key: keyof Vitals) => (m: Metric) =>
      setVitals((s) => ({ ...s, [key]: { value: m.value, rating: m.rating } }));
    onLCP(set("LCP"));
    onINP(set("INP"));
    onCLS(set("CLS"));
    onFCP(set("FCP"));
    onTTFB(set("TTFB"));
  }, []);

  const score = (() => {
    const ratings = (Object.values(vitals).filter(Boolean) as V[]).map((v) => v.rating);
    if (!ratings.length) return null;
    const goods = ratings.filter((r) => r === "good").length;
    return Math.round((goods / ratings.length) * 100);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-background/55 border-b border-border/30">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="ml-auto inline-flex items-center gap-2 text-sm font-bold">
            <Activity className="w-4 h-4 text-primary" /> Performance
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
        <section>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Core Web Vitals — <span className="gradient-text">live</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Measured in this browser using <code className="font-mono">web-vitals</code>. Interact with the page (scroll, click) so INP can be sampled.
          </p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center">
            <Gauge className="w-9 h-9 text-primary" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Composite score</h2>
            <div className="text-4xl font-black tabular-nums">{score == null ? "—" : `${score}/100`}</div>
            <div className="text-xs text-muted-foreground mt-1">% of metrics in the &quot;good&quot; band</div>
          </div>
        </section>

        <section aria-labelledby="cwv-heading" className="space-y-3">
        <h2 id="cwv-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Core Web Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(TARGETS) as (keyof Vitals)[]).map((k) => {
            const v = vitals[k];
            const t = TARGETS[k];
            return (
              <div key={k} className={`rounded-2xl border p-5 ${v ? colorFor(v.rating) : "border-border/50 bg-card/60 text-muted-foreground"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold tracking-widest">{k}</span>
                  <span className="text-[10px] font-mono uppercase">
                    {v ? v.rating.replace("-", " ") : "awaiting…"}
                  </span>
                </div>
                <div className="mt-2 text-3xl font-black tabular-nums">
                  {v ? fmt(k, v.value) : "—"}
                </div>
                <div className="mt-2 text-xs opacity-80">{t.help}</div>
                <div className="mt-2 text-[11px] font-mono opacity-70">
                  good ≤ {fmt(k, t.good)} · poor &gt; {fmt(k, t.poor)}
                </div>
              </div>
            );
          })}
        </div>
        </section>

        <section className="rounded-2xl border border-border/50 bg-card/60 p-5 text-sm text-muted-foreground">
          <h2 className="flex items-center gap-2 font-bold text-foreground mb-2 text-base">
            <Zap className="w-4 h-4 text-primary" /> Optimizations applied
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>OptimizerDashboard is lazy-loaded — landing JS stays small.</li>
            <li>Aurora ambient layers are GPU-only (transform/opacity), no layout thrash.</li>
            <li>Reveal-on-scroll uses IntersectionObserver, not scroll listeners.</li>
            <li>Hero terminal cycles via a single setInterval; no per-frame work.</li>
            <li>No external image assets in the hero (text + SVG only) for fast LCP.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
