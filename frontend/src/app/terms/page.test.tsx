import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TOSPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("app/terms/page", () => {
  it("renders the terms of service sections", () => {
    render(<TOSPage />);
    expect(screen.getByText("tos.title")).toBeInTheDocument();
    expect(screen.getByText("tos.effectiveDate")).toBeInTheDocument();
    expect(screen.getByText("tos.summary")).toBeInTheDocument();
    expect(screen.getByText("tos.sections.acceptance.title")).toBeInTheDocument();
    expect(screen.getByText("tos.sections.accounts.title")).toBeInTheDocument();
    expect(screen.getByText("tos.sections.changes.title")).toBeInTheDocument();
    expect(screen.getByText("tos.footer")).toBeInTheDocument();
  });
});
