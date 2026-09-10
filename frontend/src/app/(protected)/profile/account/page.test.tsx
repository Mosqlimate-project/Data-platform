import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AccountPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("app/(protected)/profile/account/page", () => {
  it("renders the account settings sections", () => {
    render(<AccountPage />);
    expect(screen.getByText("profile_account.title")).toBeInTheDocument();
    expect(screen.getByText("profile_account.password_title")).toBeInTheDocument();
    expect(screen.getByText("profile_account.delete_title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "profile_account.password_btn" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "profile_account.delete_btn" })).toBeDisabled();
  });
});
