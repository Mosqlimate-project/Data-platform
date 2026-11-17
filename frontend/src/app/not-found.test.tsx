import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "./not-found";

describe("app/not-found", () => {
  it("renders the localized 404 message and a link home", () => {
    render(<NotFound />);

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("errors.not_found.title")).toBeInTheDocument();
    expect(screen.getByText("errors.not_found.description")).toBeInTheDocument();

    const link = screen.getByText("errors.not_found.back_home").closest("a");
    expect(link).toHaveAttribute("href", "/");
  });
});
