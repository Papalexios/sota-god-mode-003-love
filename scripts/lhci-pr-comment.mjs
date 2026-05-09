#!/usr/bin/env node
/**
 * Aggregates LHCI artifact directories into a single Markdown PR comment.
 *
 * Usage: node scripts/lhci-pr-comment.mjs <reports-root>
 *   <reports-root> contains subfolders like:
 *     lighthouse-reports-desktop/
 *     lighthouse-reports-mobile/
 *     lighthouse-reports-iphone-se/
 *     lighthouse-reports-ipad/
 *
 * Writes Markdown to stdout. Designed to be piped into a GitHub PR comment.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] || ".";

const SCORE_KEYS = ["performance", "accessibility", "best-practices", "seo"];
const METRIC_KEYS = [
  ["largest-contentful-paint", "LCP", "ms"],
  ["cumulative-layout-shift", "CLS", ""],
  ["first-contentful-paint", "FCP", "ms"],
  ["total-blocking-time", "TBT", "ms"],
  ["interaction-to-next-paint", "INP", "ms"],
];

const fmtScore = (n) =>
  n == null ? "—" : `${Math.round(n * 100)}`;
const emoji = (n) =>
  n == null ? "•" : n >= 0.9 ? "🟢" : n >= 0.5 ? "🟡" : "🔴";
const fmtMetric = (key, v) =>
  v == null ? "—" : key === "cumulative-layout-shift" ? v.toFixed(3) : `${Math.round(v)}ms`;

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function listPresetDirs(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("lighthouse-reports-"))
    .map((d) => ({
      preset: d.name.replace(/^lighthouse-reports-/, ""),
      dir: path.join(rootDir, d.name),
    }));
}

function collectPreset(dir) {
  const manifest = readJson(path.join(dir, "manifest.json")) || [];
  const assertions = readJson(path.join(dir, "assertion-results.json")) || [];

  // Pick the representative run per URL (isRepresentativeRun=true)
  const reps = manifest.filter((m) => m.isRepresentativeRun);
  const rows = reps.map((m) => {
    const lhr = readJson(m.jsonPath);
    if (!lhr) return null;
    const cats = lhr.categories || {};
    const audits = lhr.audits || {};
    return {
      url: lhr.finalDisplayedUrl || lhr.requestedUrl || m.url,
      reportUrl: m.htmlPath ? path.basename(m.htmlPath) : null,
      scores: Object.fromEntries(
        SCORE_KEYS.map((k) => [k, cats[k]?.score ?? null])
      ),
      metrics: Object.fromEntries(
        METRIC_KEYS.map(([id]) => [id, audits[id]?.numericValue ?? null])
      ),
    };
  }).filter(Boolean);

  const failures = assertions.filter((a) => a.level === "error" && !a.passed);
  const warnings = assertions.filter((a) => a.level === "warn" && !a.passed);

  return { rows, failures, warnings };
}

function renderPreset(preset, data) {
  const { rows, failures, warnings } = data;
  if (!rows.length) return `### ${preset}\n_No reports found._\n`;

  const header =
    "| URL | " +
    SCORE_KEYS.map((k) => k[0].toUpperCase() + k.slice(1)).join(" | ") +
    " | " + METRIC_KEYS.map(([, label]) => label).join(" | ") + " |";
  const sep = "|" + " --- |".repeat(1 + SCORE_KEYS.length + METRIC_KEYS.length);

  const lines = rows.map((r) => {
    const url = new URL(r.url).pathname || "/";
    const scoreCells = SCORE_KEYS.map(
      (k) => `${emoji(r.scores[k])} ${fmtScore(r.scores[k])}`
    );
    const metricCells = METRIC_KEYS.map(
      ([id]) => fmtMetric(id, r.metrics[id])
    );
    return `| \`${url}\` | ${scoreCells.join(" | ")} | ${metricCells.join(" | ")} |`;
  });

  const failBlock = failures.length
    ? `\n**❌ Budget regressions (${failures.length})**\n` +
      failures.slice(0, 12).map((f) =>
        `- \`${f.auditId}\` on ${new URL(f.url).pathname} — actual ${
          typeof f.actual === "number" ? f.actual.toFixed(2) : f.actual
        }, expected ${f.operator} ${f.expected}`
      ).join("\n") +
      (failures.length > 12 ? `\n…and ${failures.length - 12} more` : "")
    : "\n✅ All budget assertions passed.";

  const warnBlock = warnings.length
    ? `\n\n**⚠️ Soft warnings (${warnings.length})**\n` +
      warnings.slice(0, 8).map((w) =>
        `- \`${w.auditId}\` on ${new URL(w.url).pathname}`
      ).join("\n")
    : "";

  return `### 📊 ${preset}\n${header}\n${sep}\n${lines.join("\n")}\n${failBlock}${warnBlock}\n`;
}

const presets = listPresetDirs(root);
const sections = presets.map(({ preset, dir }) => renderPreset(preset, collectPreset(dir)));

const totalFails = presets
  .map(({ dir }) => collectPreset(dir).failures.length)
  .reduce((a, b) => a + b, 0);

const headline = totalFails === 0
  ? "## 🚀 Lighthouse CI — all budgets within limits"
  : `## ⚠️ Lighthouse CI — ${totalFails} budget regression${totalFails === 1 ? "" : "s"}`;

const reportsLink = process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
  ? `\n\n📁 [Download full HTML reports](https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}#artifacts)`
  : "";

process.stdout.write(
  `${headline}\n\n` +
  `_Commit: \`${(process.env.GITHUB_SHA || "").slice(0, 7) || "local"}\` · ${presets.length} preset${presets.length === 1 ? "" : "s"} measured_\n\n` +
  sections.join("\n") +
  reportsLink +
  "\n\n<sub>Generated by `scripts/lhci-pr-comment.mjs`</sub>\n"
);
