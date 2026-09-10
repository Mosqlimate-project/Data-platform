import "@testing-library/jest-dom";

import { afterEach, vi } from "vitest";
import React from "react";

// next/image mock (renders a plain img in jsdom)
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const { src, alt, ...rest } = props as Record<string, unknown>;
    return React.createElement("img", { src, alt, ...rest });
  },
}));

// next/navigation mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// jsdom lacks these
if (typeof window !== "undefined") {
  window.matchMedia =
    window.matchMedia ||
    (() =>
      ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;

  window.ResizeObserver =
    window.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
}

afterEach(() => {
  vi.restoreAllMocks();
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";
  }
});
