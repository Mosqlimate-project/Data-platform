import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Loading from "./loading";

describe("app/[owner]/[repository]/loading", () => {
  it("renders the loading skeleton", () => {
    const { container } = render(<Loading />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
