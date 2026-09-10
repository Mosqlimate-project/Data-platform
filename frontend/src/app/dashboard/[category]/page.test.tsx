import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

const dashboard = vi.hoisted(() => ({ props: null as { category?: string } | null }));

vi.mock("@/components/dashboard/Dashboard", () => ({
  default: (props: { category: string }) => {
    dashboard.props = props;
    return <div data-testid="dashboard">{props.category}</div>;
  },
}));

describe("app/dashboard/[category]/page", () => {
  it("passes the quantitative category to the dashboard", () => {
    render(<Page params={{ category: "quantitative" }} searchParams={{}} />);
    expect(screen.getByTestId("dashboard")).toHaveTextContent("quantitative");
    expect(dashboard.props?.category).toBe("quantitative");
  });

  it("passes the categorical category to the dashboard", () => {
    render(<Page params={{ category: "categorical" }} searchParams={{}} />);
    expect(screen.getByTestId("dashboard")).toHaveTextContent("categorical");
    expect(dashboard.props?.category).toBe("categorical");
  });
});
