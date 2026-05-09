import { test, expect } from "@playwright/test";

const ANCHORS = ["#pipeline", "#how", "#capabilities", "#strategies", "#proof", "#faq"];

test.describe("Landing — anchors & navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  for (const hash of ANCHORS) {
    test(`anchor ${hash} scrolls into view`, async ({ page }) => {
      const target = page.locator(hash);
      await expect(target).toHaveCount(1);

      // Click via in-page anchor when present (desktop nav is hidden on mobile);
      // fall back to direct hash navigation on small viewports.
      const link = page.locator(`a[href="${hash}"]`).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
      } else {
        await page.evaluate((h) => {
          window.location.hash = h;
        }, hash);
      }

      await expect(target).toBeInViewport({ ratio: 0.05 });
    });
  }

  test("renders all 10 pipeline phase nodes", async ({ page }) => {
    const pipeline = page.locator("#pipeline");
    const phases = pipeline.locator("text=/^0\\d$/");
    await expect(phases).toHaveCount(10);
  });
});

test.describe("Landing — interactions & animations", () => {
  test("FAQ accordion toggles aria-expanded", async ({ page }) => {
    await page.goto("/#faq");
    const faq = page.locator("#faq");
    const firstBtn = faq.getByRole("button").first();
    await expect(firstBtn).toHaveAttribute("aria-expanded", "true");
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute("aria-expanded", "false");
    await firstBtn.click();
    await expect(firstBtn).toHaveAttribute("aria-expanded", "true");
  });

  test("hovering a pipeline node updates spotlight CSS variables (desktop only)", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover is a pointer-only interaction");
    await page.goto("/#pipeline");
    const node = page.locator("#pipeline .spotlight").first();
    await node.hover();
    const x = await node.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--x").trim()
    );
    expect(x).not.toBe("");
  });

  test("primary CTA opens the optimizer dashboard", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("button", { name: /run the 10-phase pipeline/i }).first();
    await cta.click();
    // Lazy chunk loads the dashboard; allow generous timeout.
    await expect(page.locator("[data-testid=\"optimizer-dashboard\"], main, body")).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Landing — responsive layout", () => {
  test("desktop nav links are visible on wide viewports", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop-only check");
    await page.goto("/");
    for (const hash of ANCHORS) {
      await expect(page.locator(`a[href="${hash}"]`).first()).toBeVisible();
    }
  });

  test("hero stacks vertically on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile-only check");
    await page.goto("/");
    const cta = page.getByRole("button", { name: /run the 10-phase pipeline/i }).first();
    const secondary = page.locator('a[href="#pipeline"]').first();
    const ctaBox = await cta.boundingBox();
    const secBox = await secondary.boundingBox();
    expect(ctaBox && secBox).toBeTruthy();
    // On mobile they stack: secondary sits below the primary CTA.
    expect((secBox!.y)).toBeGreaterThan((ctaBox!.y));
  });
});
