import { test, expect } from "@playwright/test";

/**
 * Visual regression tests for key landing-page sections.
 *
 * Baselines live next to this spec under `landing-visual.spec.ts-snapshots/`.
 * Update with: `bunx playwright test --project=desktop-chromium --update-snapshots`
 *
 * Dynamic / animated regions are masked or paused so diffs only fire on
 * meaningful structural / styling changes.
 */

test.describe("Visual regression — landing page", () => {
  test.beforeEach(async ({ page }) => {
    // Ask the app to honor reduced-motion and skip our most lively animations
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/", { waitUntil: "networkidle" });

    // Pause every CSS animation/transition so screenshots are deterministic
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-play-state: paused !important;
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
        /* Hide the live terminal ticker — content rotates every 1.7s */
        [class*="font-mono"][class*="text-["][class*="leading-relaxed"] { visibility: hidden !important; }
      `,
    });

    // Wait for fonts so glyph metrics don't shift baselines
    await page.evaluate(() => (document as any).fonts?.ready);
    // Settle reveal-on-scroll observers
    await page.waitForTimeout(200);
  });

  const SECTIONS: Array<{ name: string; selector: string }> = [
    { name: "hero",     selector: "section#top" },
    { name: "pipeline", selector: "section#pipeline" },
    { name: "how",      selector: "section#how" },
    { name: "faq",      selector: "section#faq" },
  ];

  for (const { name, selector } of SECTIONS) {
    test(`section · ${name}`, async ({ page }) => {
      const el = page.locator(selector);
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);
      await expect(el).toHaveScreenshot(`${name}.png`, {
        animations: "disabled",
        maxDiffPixelRatio: 0.02,
        // Mask the marquee logo strip since it scrolls horizontally
        mask: [page.locator(".marquee-track")],
      });
    });
  }

  test("mobile sticky CTA bar", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Sticky CTA only renders on mobile (md:hidden)");
    const cta = page.locator("button", { hasText: /run the 10-phase pipeline/i }).last();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveScreenshot("sticky-cta.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
