import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

const md = vi.hoisted(() => ({ props: null as any }));

vi.mock("react-markdown", () => ({
  default: (props: any) => {
    md.props = props;
    const { children, components } = props;
    return (
      <div data-testid="markdown">
        <div data-testid="md-text">{String(children)}</div>
        {components && (
          <>
            {components.h1({ node: {}, children: "H1 title" })}
            {components.h2({ node: {}, children: "H2 title" })}
            {components.h3({ node: {}, children: "H3 title" })}
            {components.p({ node: {}, children: "paragraph" })}
            {components.code({ node: {}, inline: true, className: "", children: "inline" })}
            {components.code({
              node: {},
              inline: false,
              className: "language-js",
              children: "const a = 1;\n",
            })}
            {components.table({ node: {}, children: "table" })}
            {components.thead({ node: {}, children: "thead" })}
            {components.th({ node: {}, children: "th" })}
            {components.td({ node: {}, children: "td" })}
            {components.img({ node: {}, src: "a.png", alt: "a" })}
            {components.a({ node: {}, href: "https://example.com", children: "link" })}
          </>
        )}
      </div>
    );
  },
}));

vi.mock("remark-gfm", () => ({ default: vi.fn() }));
vi.mock("rehype-raw", () => ({ default: vi.fn() }));
vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }: any) => <pre data-testid="highlight">{children}</pre>,
}));
vi.mock("react-syntax-highlighter/dist/esm/styles/prism", () => ({
  dracula: {},
}));

function renderDefault(overrides: Record<string, unknown> = {}) {
  return render(<MarkdownRenderer content="## Hello" {...overrides} />);
}

describe("components/model/MarkdownRenderer", () => {
  it("renders markdown content and heading/table/inline components", () => {
    renderDefault();
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
    expect(screen.getByTestId("md-text")).toHaveTextContent("## Hello");
    expect(screen.getByText("H1 title")).toBeInTheDocument();
    expect(screen.getByText("H2 title")).toBeInTheDocument();
    expect(screen.getByText("H3 title")).toBeInTheDocument();
    expect(screen.getByText("paragraph")).toBeInTheDocument();
    expect(screen.getByText("inline")).toBeInTheDocument();
    expect(screen.getByText("table")).toBeInTheDocument();
    expect(screen.getByText("thead")).toBeInTheDocument();
    expect(screen.getByText("th")).toBeInTheDocument();
    expect(screen.getByText("td")).toBeInTheDocument();
    expect(screen.getByText("link")).toBeInTheDocument();
  });

  it("renders a syntax highlighter for fenced code blocks", () => {
    renderDefault();
    expect(screen.getByTestId("highlight")).toHaveTextContent("const a = 1;");
  });

  it("keeps absolute image urls unchanged", () => {
    renderDefault();
    expect(md.props.urlTransform("https://cdn.example.com/img.png")).toBe(
      "https://cdn.example.com/img.png"
    );
    expect(md.props.urlTransform("http://cdn.example.com/img.png")).toBe(
      "http://cdn.example.com/img.png"
    );
  });

  it("builds a raw githubusercontent url with the default branch", () => {
    renderDefault({ owner: "alice", repo: "repo" });
    expect(md.props.urlTransform("img/a.png")).toBe(
      "https://raw.githubusercontent.com/alice/repo/main/img/a.png"
    );
    expect(md.props.urlTransform("/img/a.png")).toBe(
      "https://raw.githubusercontent.com/alice/repo/main/img/a.png"
    );
  });

  it("uses the provided branch when building github urls", () => {
    renderDefault({ owner: "alice", repo: "repo", branch: "dev" });
    expect(md.props.urlTransform("img/a.png")).toBe(
      "https://raw.githubusercontent.com/alice/repo/dev/img/a.png"
    );
  });

  it("returns the src unchanged when owner and repo are missing", () => {
    renderDefault();
    expect(md.props.urlTransform("img/a.png")).toBe("img/a.png");
  });

  it("renders a plain code element when no language matches", () => {
    renderDefault();
    const el = md.props.components.code({
      node: {},
      inline: false,
      className: "",
      children: "x",
    });
    expect(el.type).toBe("code");
  });

  it("passes remark and rehype plugins to react-markdown", () => {
    renderDefault();
    expect(md.props.remarkPlugins).toHaveLength(1);
    expect(md.props.rehypePlugins).toHaveLength(1);
  });
});
