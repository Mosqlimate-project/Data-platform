import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PrivacyTermsPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("app/privacy/page", () => {
  it("renders the privacy policy sections", () => {
    render(<PrivacyTermsPage />);
    expect(screen.getByText("privacy.title")).toBeInTheDocument();
    expect(screen.getByText("privacy.effectiveDate")).toBeInTheDocument();
    expect(screen.getByText("privacy.summary")).toBeInTheDocument();
    expect(screen.getByText("privacy.sections.scope.title")).toBeInTheDocument();
    expect(screen.getByText("privacy.sections.dataCollected.title")).toBeInTheDocument();
    expect(screen.getByText("privacy.sections.changes.title")).toBeInTheDocument();
    expect(screen.getByText("privacy.footer")).toBeInTheDocument();
  });
});
