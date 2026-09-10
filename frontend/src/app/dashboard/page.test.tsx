import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardOverview from "./page";

describe("app/dashboard/page", () => {
  it("renders the overview headings and both cards", () => {
    render(<DashboardOverview />);
    expect(screen.getByText("dashboard.overview.title")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.subtitle")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.general.title")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.imdc.title")).toBeInTheDocument();
  });

  it("renders the general and imdc question lists", () => {
    render(<DashboardOverview />);
    expect(screen.getByText("dashboard.overview.general.questions.0")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.general.questions.1")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.imdc.questions.2")).toBeInTheDocument();
  });

  it("links to the quantitative dashboard with query params", () => {
    render(<DashboardOverview />);
    const generalLink = screen.getByText("dashboard.overview.general.button").closest("a")!;
    expect(generalLink).toHaveAttribute(
      "href",
      "/dashboard/quantitative?disease=A90&adm_level=2&adm_0=BRA&adm_1=21&adm_2=2111300&sprint=false&case_definition=reported"
    );

    const imdcLink = screen.getByText("dashboard.overview.imdc.button").closest("a")!;
    expect(imdcLink).toHaveAttribute(
      "href",
      "/dashboard/quantitative?disease=A90&adm_level=1&adm_0=BRA&adm_1=21&adm_2=2111300&sprint=true&case_definition=reported"
    );
  });

  it("renders the IMDC external link", () => {
    render(<DashboardOverview />);
    const external = screen.getByText("dashboard.overview.imdc.link_name").closest("a")!;
    expect(external).toHaveAttribute("href", "/IMDC");
  });
});
