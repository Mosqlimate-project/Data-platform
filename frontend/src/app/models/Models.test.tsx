import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Models from "./Models";

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/models",
  useSearchParams: () => new URLSearchParams(nav.search),
}));

const auth = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: auth.user }),
}));

vi.mock("./components/Model", () => ({
  default: ({ repo }: any) => <div data-testid="thumb">{repo}</div>,
}));

vi.mock("./components/SearchBar", () => ({
  default: ({ onSearch }: any) => (
    <div>
      <button data-testid="search-alpha" onClick={() => onSearch("alpha")}>
        alpha
      </button>
      <button data-testid="search-none" onClick={() => onSearch("zzz")}>
        none
      </button>
    </div>
  ),
}));

function makeModel(i: number) {
  return {
    model_id: i,
    owner: `owner${i}`,
    repository: `repo${i}`,
    avatar_url: null,
    diseases: ["dengue"],
    predictions: i,
    last_update: 0,
    adm_levels: ["ADM 1"],
  };
}

const tags = [
  { id: "t1", name: "Tag One", category: "model_type", models: [{ id: 1 }] },
  { id: "t2", name: "Tag Two", category: "disease", models: [{ id: 2 }] },
];

describe("app/models/Models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = "";
    auth.user = null;
    window.scrollTo = vi.fn();
  });

  it("renders the model list and count", () => {
    render(<Models models={[makeModel(1), makeModel(2)]} tags={tags} />);
    expect(screen.getByText("Models")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByTestId("thumb")).toHaveLength(2);
  });

  it("shows the empty state when nothing matches", () => {
    render(<Models models={[]} tags={tags} />);
    expect(screen.getByText("No models match your filters.")).toBeInTheDocument();
  });

  it("filters models using the search bar", () => {
    render(<Models models={[makeModel(1), makeModel(2)]} tags={[]} />);
    fireEvent.click(screen.getByTestId("search-alpha"));
    expect(screen.queryAllByTestId("thumb")).toHaveLength(0);
    expect(screen.getByText("No models match your filters.")).toBeInTheDocument();
  });

  it("shows the add model link for logged in users", () => {
    auth.user = { username: "a" };
    render(<Models models={[makeModel(1)]} tags={[]} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/model/add");
  });

  it("filters by tags and clears them", () => {
    render(<Models models={[makeModel(1), makeModel(2)]} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: /Tag One/ }));
    expect(screen.getAllByTestId("thumb")).toHaveLength(1);

    fireEvent.click(screen.getByText("Clear all"));
    expect(screen.getAllByTestId("thumb")).toHaveLength(2);
  });

  it("removes a selected tag from the chip", () => {
    render(<Models models={[makeModel(1), makeModel(2)]} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: /Tag One/ }));
    fireEvent.click(screen.getByRole("button", { name: "Tag One" }));
    expect(screen.getAllByTestId("thumb")).toHaveLength(2);
  });

  it("navigates to the next page", () => {
    const models = Array.from({ length: 35 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(nav.push).toHaveBeenCalledWith("/models?page=2", { scroll: false });
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("navigates to the previous page", () => {
    nav.search = "page=2";
    const models = Array.from({ length: 35 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Prev" }));
    expect(nav.push).toHaveBeenCalledWith("/models?page=1", { scroll: false });
  });

  it("renders pagination on a middle page", () => {
    nav.search = "page=5";
    const models = Array.from({ length: 240 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    expect(screen.getAllByText("...").length).toBeGreaterThan(0);
  });

  it("renders pagination on a high page", () => {
    nav.search = "page=8";
    const models = Array.from({ length: 240 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
  });

  it("renders pagination near the start and navigates to a numbered page", () => {
    nav.search = "page=2";
    const models = Array.from({ length: 240 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(nav.push).toHaveBeenCalledWith("/models?page=3", { scroll: false });
  });

  it("renders the middle pagination window", () => {
    nav.search = "page=5";
    const models = Array.from({ length: 300 }, (_, i) => makeModel(i + 1));
    render(<Models models={models} tags={[]} />);
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  it("ignores selected tags that no longer exist", () => {
    const { rerender } = render(<Models models={[makeModel(1), makeModel(2)]} tags={tags} />);
    fireEvent.click(screen.getByRole("button", { name: /Tag One/ }));
    expect(screen.getAllByTestId("thumb")).toHaveLength(1);

    rerender(<Models models={[makeModel(1), makeModel(2)]} tags={[]} />);
    expect(screen.queryAllByTestId("thumb")).toHaveLength(0);
  });
});
