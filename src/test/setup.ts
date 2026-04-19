import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  root = null;
  rootMargin = "";
  thresholds = [];

  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  value: ResizeObserverMock,
  writable: true,
});

Object.defineProperty(globalThis, "IntersectionObserver", {
  value: IntersectionObserverMock,
  writable: true,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(Element.prototype, "scrollIntoView", {
  writable: true,
  value: () => {},
});
