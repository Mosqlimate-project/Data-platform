import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccordionCard, EndpointLayout } from "./EndpointLayout";

const baseProps = {
  title: "Climate",
  endpoint: "/climate/",
  description: "Some description",
  moreInfoLink: "https://docs.example",
  source: "https://source.example",
};

describe("datastore/components/EndpointLayout", () => {
  it("AccordionCard hides children when closed", () => {
    render(
      <AccordionCard title="Card" isOpen={false} onClick={vi.fn()}>
        <span>hidden</span>
      </AccordionCard>
    );
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("AccordionCard shows children when open and handles clicks", () => {
    const onClick = vi.fn();
    render(
      <AccordionCard title="Card" isOpen onClick={onClick}>
        <span>shown</span>
      </AccordionCard>
    );
    expect(screen.getByText("shown")).toBeInTheDocument();
    expect(screen.getByText("▲")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Card/ }));
    expect(onClick).toHaveBeenCalled();
  });

  it("renders the no content placeholder without children", () => {
    render(<EndpointLayout {...baseProps} />);
    expect(screen.getByText("endpoint_layout.accordion.no_content")).toBeInTheDocument();
    expect(screen.getByText("GET /api/datastore/climate/")).toBeInTheDocument();
  });

  it("renders children and the controls accordion open by default", () => {
    render(
      <EndpointLayout {...baseProps} controls={<div>controls-body</div>}>
        <div>chart-content</div>
      </EndpointLayout>
    );
    expect(screen.getByText("chart-content")).toBeInTheDocument();
    expect(screen.getByText("controls-body")).toBeInTheDocument();
    expect(screen.getByText("endpoint_layout.accordion.charts_title")).toBeInTheDocument();
  });

  it("toggles the controls accordion", () => {
    render(
      <EndpointLayout {...baseProps} controls={<div>controls-body</div>}>
        <div>chart-content</div>
      </EndpointLayout>
    );
    fireEvent.click(screen.getByText("endpoint_layout.accordion.charts_title"));
    expect(screen.queryByText("controls-body")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("endpoint_layout.accordion.charts_title"));
    expect(screen.getByText("controls-body")).toBeInTheDocument();
  });

  it("renders and toggles the api builder accordion", () => {
    render(
      <EndpointLayout {...baseProps} apiBuilder={<div>builder-body</div>}>
        <div>chart-content</div>
      </EndpointLayout>
    );
    expect(screen.getByText("endpoint_layout.accordion.api_builder_title")).toBeInTheDocument();
    fireEvent.click(screen.getByText("endpoint_layout.accordion.api_builder_title"));
    expect(screen.getByText("builder-body")).toBeInTheDocument();
  });

  it("renders the data dictionary and the description accordion", () => {
    render(
      <EndpointLayout
        {...baseProps}
        dataVariables={[{ variable: "date", type: "str", description: "the date" }]}
      >
        <div>chart-content</div>
      </EndpointLayout>
    );
    fireEvent.click(screen.getByText("endpoint_layout.accordion.description_title"));
    expect(screen.getByText("Some description")).toBeInTheDocument();
    expect(screen.getByText("https://source.example")).toBeInTheDocument();
    expect(screen.getByText("https://docs.example")).toBeInTheDocument();

    fireEvent.click(screen.getByText("endpoint_layout.accordion.dictionary_title"));
    expect(screen.getByText("date")).toBeInTheDocument();
    expect(screen.getByText("the date")).toBeInTheDocument();
  });

  it("omits source and dictionary when absent", () => {
    render(
      <EndpointLayout {...baseProps} source="" moreInfoLink="">
        <div>chart-content</div>
      </EndpointLayout>
    );
    fireEvent.click(screen.getByText("endpoint_layout.accordion.description_title"));
    expect(screen.queryByText("endpoint_layout.accordion.dictionary_title")).not.toBeInTheDocument();
    expect(screen.queryByText("https://source.example")).not.toBeInTheDocument();
  });
});
