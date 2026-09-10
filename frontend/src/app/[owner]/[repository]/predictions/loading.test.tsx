import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Loading from "./loading";

describe("app/[owner]/[repository]/predictions/loading", () => {
  it("renders the prediction loading skeleton", () => {
    const { container } = render(<Loading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });
});
