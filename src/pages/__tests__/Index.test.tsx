import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Index from "../Index";

// Avoid loading the heavy optimizer dashboard in landing tests
vi.mock("@/components/optimizer/OptimizerDashboard", () => ({
  OptimizerDashboard: () => <div data-testid="optimizer-dashboard" />,
}));

// Mock zustand store
vi.mock("@/lib/store", () => {
  const state = {
    showOptimizer: false,
    contentItems: [] as unknown[],
    setShowOptimizer: vi.fn(),
  };
  return {
    useOptimizerStore: () => state,
  };
});

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Index />
    </MemoryRouter>
  );

describe("Landing page — navigation, anchors, interactions", () => {
  beforeEach(() => {
    // Reset viewport to desktop default; jsdom ignores but kept for clarity
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });

  it("renders the hero headline and primary CTA", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /run the 10-phase pipeline|start optimizing|launch/i }).length).toBeGreaterThan(0);
  });

  it("has every pipeline anchor target reachable from nav links", () => {
    renderLanding();
    const anchors = ["#pipeline", "#how", "#capabilities", "#strategies", "#proof", "#faq"];
    for (const a of anchors) {
      const link = document.querySelector(`a[href="${a}"]`);
      expect(link, `nav link ${a}`).not.toBeNull();
      const target = document.querySelector(a);
      expect(target, `section ${a}`).not.toBeNull();
    }
  });

  it("renders all 10 pipeline phase nodes", () => {
    renderLanding();
    const pipeline = document.querySelector("#pipeline")!;
    // Each PipelineNode contains a phase number 00..09
    const phaseNumbers = within(pipeline as HTMLElement).getAllByText(/^0\d$/);
    expect(phaseNumbers.length).toBeGreaterThanOrEqual(10);
  });

  it("FAQ accordion toggles open/close on click", () => {
    renderLanding();
    const faq = document.querySelector("#faq")!;
    const buttons = within(faq as HTMLElement).getAllByRole("button");
    const first = buttons[0];
    expect(first).toHaveAttribute("aria-expanded", "true"); // first opens by default
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
  });

  it("strategy cards are clickable buttons", () => {
    renderLanding();
    const strategies = document.querySelector("#strategies")!;
    const cards = within(strategies as HTMLElement).getAllByRole("button");
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });

  it("hover surfaces have spotlight/transition classes (mobile + desktop safe)", () => {
    renderLanding();
    const spotlights = document.querySelectorAll(".spotlight");
    expect(spotlights.length).toBeGreaterThan(0);
    spotlights.forEach((el) => {
      expect(el.className).toMatch(/transition|hover:/);
    });
  });
});
