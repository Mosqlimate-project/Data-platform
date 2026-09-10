import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter-font" }),
}));

const script = vi.hoisted(() => ({ props: [] as any[] }));
vi.mock("next/script", () => ({
  __esModule: true,
  default: (props: any) => {
    script.props.push(props);
    return null;
  },
}));

vi.mock("@/components/ClientProviders", () => ({
  default: ({ children }: any) => <div data-testid="providers">{children}</div>,
}));
vi.mock("@/components/I18nProvider", () => ({
  default: ({ children }: any) => <div data-testid="i18n">{children}</div>,
}));
vi.mock("@/components/GlobalLoading", () => ({
  default: () => <div data-testid="global-loading" />,
}));
vi.mock("@/components/Navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));
vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));
vi.mock("@/components/Chatbot", () => ({
  default: () => <div data-testid="chatbot" />,
}));

describe("app/layout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children inside the providers", () => {
    const ui = RootLayout({ children: <span>home content</span> });
    const { container } = render(ui);
    expect(screen.getByText("home content")).toBeInTheDocument();
    expect(screen.getByTestId("providers")).toBeInTheDocument();
    expect(screen.getByTestId("i18n")).toBeInTheDocument();
    expect(screen.getByTestId("global-loading")).toBeInTheDocument();
    expect(screen.getByTestId("navbar")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByTestId("chatbot")).toBeInTheDocument();
    expect(container.querySelector("body")?.className).toContain("inter-font");
  });

  it("does not render analytics scripts outside production", () => {
    const ui = RootLayout({ children: <span>x</span> });
    render(ui);
    expect(script.props).toHaveLength(0);
  });

  it("renders the analytics scripts in production", async () => {
    script.props.length = 0;
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { default: ProdLayout } = await import("./layout");
    render(ProdLayout({ children: <span>prod</span> }));
    expect(script.props.some((p) => p.id === "google-analytics")).toBe(true);
    expect(script.props.some((p) => String(p.src).includes("googletagmanager"))).toBe(true);
    vi.unstubAllEnvs();
  });
});
