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

// next/link renders a plain anchor
vi.mock("next/link", () => ({
  __esModule: true,
  default: (props: {
    href: string;
    children?: React.ReactNode;
    className?: string;
  }) => {
    const { href, children, ...rest } = props;
    return React.createElement("a", { href, ...rest }, children);
  },
}));

// next-themes mock
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
    themes: ["light", "dark"],
  }),
}));

// react-i18next mock (t returns the key; i18n object for hooks)
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      changeLanguage: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
  }),
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
