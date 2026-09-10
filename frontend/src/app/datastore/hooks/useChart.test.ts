import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { useChart } from "./useChart";

const mocks = vi.hoisted(() => {
  const state: { dom: HTMLDivElement | null } = { dom: null };
  const instance = {
    getDom: vi.fn(() => state.dom),
    dispose: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    setOption: vi.fn(),
    clear: vi.fn(),
  };
  const init = vi.fn((dom: HTMLDivElement) => {
    state.dom = dom;
    return instance;
  });
  return { state, instance, init };
});

vi.mock("echarts", () => ({ init: mocks.init }));

function setup() {
  const div = document.createElement("div");
  const rendered = renderHook(
    ({ options, loading }: { options: EChartsOption | null; loading: boolean }) =>
      useChart(options, loading),
    { initialProps: { options: null as EChartsOption | null, loading: false } }
  );
  (rendered.result.current as { current: HTMLDivElement | null }).current = div;
  return { ...rendered, div };
}

describe("datastore/hooks/useChart", () => {
  beforeEach(() => {
    mocks.state.dom = null;
    mocks.instance.getDom.mockImplementation(() => mocks.state.dom);
    mocks.instance.dispose.mockClear();
    mocks.instance.resize.mockClear();
    mocks.instance.showLoading.mockClear();
    mocks.instance.hideLoading.mockClear();
    mocks.instance.setOption.mockClear();
    mocks.instance.clear.mockClear();
    mocks.init.mockClear();
    mocks.init.mockImplementation((dom: HTMLDivElement) => {
      mocks.state.dom = dom;
      return mocks.instance;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a ref and does nothing before a DOM node is attached", () => {
    const { result } = renderHook(() =>
      useChart({ series: [] } as EChartsOption, false)
    );
    expect(result.current).toHaveProperty("current", null);
    expect(mocks.init).not.toHaveBeenCalled();
  });

  it("initializes the chart, appends the watermark and sets options", () => {
    const { result, rerender, div } = setup();
    rerender({ options: { series: [{ type: "line" }] }, loading: false });

    expect(mocks.init).toHaveBeenCalledTimes(1);
    expect(mocks.init).toHaveBeenCalledWith(div);

    const finalOptions = mocks.instance.setOption.mock.calls[0][0];
    expect(finalOptions.graphic).toHaveLength(1);
    expect(finalOptions.graphic[0].style.image).toBe("/watermark.png");
    expect(mocks.instance.resize).toHaveBeenCalled();
    expect(result.current.current).toBe(div);
  });

  it("merges an array graphic and a single graphic with the watermark", () => {
    const { rerender } = setup();

    rerender({
      options: { series: [], graphic: [{ type: "text" }, { type: "group" }] },
      loading: false,
    });
    let finalOptions = mocks.instance.setOption.mock.calls.at(-1)![0];
    expect(finalOptions.graphic).toHaveLength(3);

    rerender({ options: { series: [], graphic: { type: "text" } }, loading: false });
    finalOptions = mocks.instance.setOption.mock.calls.at(-1)![0];
    expect(finalOptions.graphic).toHaveLength(2);
    expect(finalOptions.graphic[1].style.image).toBe("/watermark.png");
  });

  it("shows loading and hides it when loading turns false", () => {
    const { rerender } = setup();
    rerender({ options: { series: [] }, loading: true });
    expect(mocks.instance.showLoading).toHaveBeenCalled();

    rerender({ options: { series: [] }, loading: false });
    expect(mocks.instance.hideLoading).toHaveBeenCalled();
    expect(mocks.instance.setOption).toHaveBeenCalled();
  });

  it("clears the chart when options become null", () => {
    const { rerender } = setup();
    rerender({ options: { series: [] }, loading: false });
    expect(mocks.instance.setOption).toHaveBeenCalled();

    rerender({ options: null, loading: false });
    expect(mocks.instance.clear).toHaveBeenCalled();
  });

  it("reinitializes when the DOM node changes", () => {
    const { rerender, result } = setup();
    rerender({ options: { series: [] }, loading: false });
    expect(mocks.init).toHaveBeenCalledTimes(1);

    const nextDiv = document.createElement("div");
    (result.current as { current: HTMLDivElement | null }).current = nextDiv;
    rerender({ options: { series: [{ type: "line" }] }, loading: false });

    expect(mocks.instance.dispose).toHaveBeenCalled();
    expect(mocks.init).toHaveBeenCalledTimes(2);
  });

  it("resizes on window resize and disposes on unmount", () => {
    const { rerender, unmount } = setup();
    rerender({ options: { series: [] }, loading: false });
    mocks.instance.resize.mockClear();

    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(mocks.instance.resize).toHaveBeenCalled();

    unmount();
    expect(mocks.instance.dispose).toHaveBeenCalled();
  });

  it("does not crash when a resize happens before init", () => {
    const { result, rerender, unmount } = setup();
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    rerender({ options: { series: [] }, loading: false });
    expect(result.current.current).not.toBeNull();
    unmount();
  });
});
