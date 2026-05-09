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

  test("FAQ accordion · expanded state", async ({ page }) => {
    const faq = page.locator("section#faq");
    await faq.scrollIntoViewIfNeeded();
    const firstQ = faq.locator('button[aria-expanded]').first();
    await firstQ.click();
    await expect(firstQ).toHaveAttribute("aria-expanded", "true");
    // Wait for the 300ms grid-rows transition (paused via addStyleTag, so instant)
    await page.waitForTimeout(150);
    await expect(faq).toHaveScreenshot("faq-expanded.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("FAQ accordion · all expanded", async ({ page }) => {
    const faq = page.locator("section#faq");
    await faq.scrollIntoViewIfNeeded();
    const buttons = faq.locator('button[aria-expanded="false"]');
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      // Re-query each iteration since aria-expanded flips
      await faq.locator('button[aria-expanded="false"]').first().click();
    }
    await page.waitForTimeout(200);
    await expect(faq).toHaveScreenshot("faq-all-expanded.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Pipeline card · hover spotlight (desktop)", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover spotlight is a desktop-only pointer interaction");
    const pipeline = page.locator("section#pipeline");
    await pipeline.scrollIntoViewIfNeeded();
    const card = pipeline.locator(".spotlight").first();
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (box) {
      // Move pointer to the card's center to trigger spotlight + lift
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
      // Nudge to update the --x/--y CSS vars from the onMouseMove handler
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4, { steps: 4 });
    }
    await page.waitForTimeout(150);
    await expect(card).toHaveScreenshot("pipeline-card-hover.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.025,
    });
  });

  test("Pipeline card · default state (mobile)", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile baseline — no hover available");
    const pipeline = page.locator("section#pipeline");
    await pipeline.scrollIntoViewIfNeeded();
    const card = pipeline.locator(".spotlight").first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await expect(card).toHaveScreenshot("pipeline-card-default.png", {
      animations: "disabled",
      maxDiffPixelRatio: 0.025,
    });
  });

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
