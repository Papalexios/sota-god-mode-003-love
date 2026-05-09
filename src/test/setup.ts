import "@testing-library/jest-dom";

// matchMedia polyfill
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// IntersectionObserver polyfill (used for reveal-on-scroll)
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = "";
  thresholds = [];
}
(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;

// rAF polyfill (jsdom has it, but stabilize)
if (!window.requestAnimationFrame) {
  // @ts-expect-error attach
  window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number;
  // @ts-expect-error attach
  window.cancelAnimationFrame = (id: number) => clearTimeout(id);
}
