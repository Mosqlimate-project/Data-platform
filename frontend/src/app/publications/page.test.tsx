import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicationsPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("framer-motion", () => {
  const MotionDiv = ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
  return {
    motion: new Proxy({}, { get: () => MotionDiv }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

describe("app/publications/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the publications title and year groups", () => {
    render(<PublicationsPage />);
    expect(screen.getByText("publications.title")).toBeInTheDocument();
    expect(screen.getByText("publications.subtitle")).toBeInTheDocument();
    expect(screen.getAllByText("2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2025").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2024").length).toBeGreaterThan(0);
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("renders all publication type labels", () => {
    render(<PublicationsPage />);
    expect(screen.getAllByText("publications.type.article").length).toBeGreaterThan(0);
    expect(screen.getAllByText("publications.type.preprint").length).toBeGreaterThan(0);
    expect(screen.getAllByText("publications.type.report").length).toBeGreaterThan(0);
    expect(screen.getAllByText("publications.type.thesis").length).toBeGreaterThan(0);
    expect(screen.getAllByText("publications.type.presentation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("publications.type.abstract").length).toBeGreaterThan(0);
  });

  it("renders datasets, software and seminars", () => {
    render(<PublicationsPage />);
    expect(screen.getByText("publications.datasets.title")).toBeInTheDocument();
    expect(screen.getByText("publications.software.title")).toBeInTheDocument();
    expect(screen.getByText("publications.seminars.title")).toBeInTheDocument();
    expect(screen.getByText("publications.seminars.series_title")).toBeInTheDocument();
    expect(screen.getByText("publications.youtube_channel")).toBeInTheDocument();
    expect(screen.getAllByRole("link").length).toBeGreaterThan(10);
  });
});
