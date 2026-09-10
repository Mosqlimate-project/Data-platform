import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModelSidebar from "./ModelSidebar";

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    owner: "alice",
    repository: "repo",
    initialDescription: "initial description",
    contributors: [{ username: "bob", avatar_url: "https://x/b.png" }],
    githubUrl: "https://github.com/alice/repo",
    canManage: true,
    tags: { disease: "A90", category: "cat", adm_level: 2, time_resolution: "week", license: "MIT" },
    ...overrides,
  };
}

function renderSidebar(overrides: Record<string, unknown> = {}) {
  return render(<ModelSidebar {...makeProps(overrides)} />);
}

describe("components/model/ModelSidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the description, tags, contributor and github link", () => {
    renderSidebar();
    expect(screen.getByText("initial description")).toBeInTheDocument();
    expect(screen.getByText("A90")).toBeInTheDocument();
    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText("ADM 2")).toBeInTheDocument();
    expect(screen.getByText("week")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Repository/ })).toHaveAttribute(
      "href",
      "https://github.com/alice/repo"
    );
  });

  it("falls back to a default github url when none is provided", () => {
    renderSidebar({ githubUrl: undefined });
    expect(screen.getByRole("link", { name: /View Repository/ })).toHaveAttribute(
      "href",
      "https://github.com/alice/repo"
    );
  });

  it("maps the D-FENSE repository to its canonical name", () => {
    renderSidebar({ githubUrl: undefined, repository: "d-fense-3" });
    expect(screen.getByRole("link", { name: /View Repository/ })).toHaveAttribute(
      "href",
      "https://github.com/alice/D-FENSE"
    );
  });

  it("maps the dengue-oracle repository to its canonical name", () => {
    renderSidebar({ githubUrl: undefined, repository: "dengue-oracle-2" });
    expect(screen.getByRole("link", { name: /View Repository/ })).toHaveAttribute(
      "href",
      "https://github.com/alice/dengue-oracle"
    );
  });

  it("renders contributor initials when the avatar is missing", () => {
    renderSidebar({ contributors: [{ username: "bo", avatar_url: null }] });
    expect(screen.getByText("BO")).toBeInTheDocument();
  });

  it("omits the contributors block when empty", () => {
    renderSidebar({ contributors: [] });
    expect(screen.queryByText("model_sidebar.contributors")).not.toBeInTheDocument();
  });

  it("shows the no_description placeholder when there is no description", () => {
    renderSidebar({ initialDescription: undefined });
    expect(screen.getByText("model_sidebar.no_description")).toBeInTheDocument();
  });

  it("filters out tags without values", () => {
    renderSidebar({ tags: { disease: "A90", category: undefined, adm_level: undefined, license: undefined } });
    expect(screen.getByText("A90")).toBeInTheDocument();
    expect(screen.queryByText("ADM")).not.toBeInTheDocument();
    expect(screen.queryByText("License")).not.toBeInTheDocument();
    expect(screen.getByText("Repository Owner")).toBeInTheDocument();
  });

  it("always shows the metadata block with the repository owner", () => {
    renderSidebar({ tags: undefined });
    expect(screen.getByText("model_sidebar.metadata")).toBeInTheDocument();
    expect(screen.getByText("Repository Owner")).toBeInTheDocument();
  });

  it("edits and saves the description", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    renderSidebar();

    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    const textarea = screen.getByPlaceholderText("model_sidebar.description_placeholder");
    expect(textarea).toHaveValue("initial description");

    fireEvent.change(textarea, { target: { value: "updated description" } });
    fireEvent.click(document.querySelector(".lucide-check")!.closest("button")!);

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("/api/registry/model/alice/repo/");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body).description).toBe("updated description");
    expect(screen.queryByPlaceholderText("model_sidebar.description_placeholder")).not.toBeInTheDocument();
  });

  it("logs an error when the update fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "nope" }) });
    renderSidebar();

    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    fireEvent.click(document.querySelector(".lucide-check")!.closest("button")!);

    await waitFor(() => expect(err).toHaveBeenCalledWith("Failed to update description:", "nope"));
  });

  it("logs an error when the update throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom"));
    renderSidebar();

    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    fireEvent.click(document.querySelector(".lucide-check")!.closest("button")!);

    await waitFor(() => expect(err).toHaveBeenCalledWith("Error patching description:", expect.any(Error)));
  });

  it("cancels the edit and restores the original description", () => {
    renderSidebar();
    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    const textarea = screen.getByPlaceholderText("model_sidebar.description_placeholder");
    fireEvent.change(textarea, { target: { value: "changed" } });
    fireEvent.click(document.querySelector(".lucide-x")!.closest("button")!);
    expect(screen.getByText("initial description")).toBeInTheDocument();
  });

  it("refuses to save a description longer than the max length", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    renderSidebar();

    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    const textarea = screen.getByPlaceholderText("model_sidebar.description_placeholder");
    fireEvent.change(textarea, { target: { value: "x".repeat(501) } });
    expect(screen.getByText(/501 \/ 500/)).toBeInTheDocument();

    const save = document.querySelector(".lucide-check")!.closest("button")! as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(save);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("guards against saving when the description exceeds the max length", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    renderSidebar();

    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    const textarea = screen.getByPlaceholderText("model_sidebar.description_placeholder");
    fireEvent.change(textarea, { target: { value: "x".repeat(501) } });

    const save = document.querySelector(".lucide-check")!.closest("button")! as HTMLButtonElement;
    save.disabled = false;
    fireEvent.click(save);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("cancelling an edit without an initial description clears the field", () => {
    renderSidebar({ initialDescription: undefined });
    fireEvent.click(document.querySelector(".lucide-pencil")!.closest("button")!);
    const textarea = screen.getByPlaceholderText("model_sidebar.description_placeholder");
    fireEvent.change(textarea, { target: { value: "changed" } });
    fireEvent.click(document.querySelector(".lucide-x")!.closest("button")!);
    expect(screen.getByText("model_sidebar.no_description")).toBeInTheDocument();
  });

  it("does not show the edit button for non-managers", () => {
    renderSidebar({ canManage: false });
    expect(document.querySelector(".lucide-pencil")).toBeNull();
  });
});
