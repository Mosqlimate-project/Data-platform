import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jsPDF } from "jspdf";
import { captureChart, generateSummaryPdf } from "./summaryPdf";

vi.mock("jspdf", () => {
  class MockJsPDF {
    text() {}
    addImage() {}
    addPage() {}
    save() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
  }
  return { jsPDF: MockJsPDF };
});

describe("app/(protected)/admin/summaryPdf", () => {
  let saveSpy: any;
  let textSpy: any;
  let addImageSpy: any;
  let addPageSpy: any;

  beforeEach(() => {
    saveSpy = vi.spyOn(jsPDF.prototype, "save");
    textSpy = vi.spyOn(jsPDF.prototype, "text");
    addImageSpy = vi.spyOn(jsPDF.prototype, "addImage");
    addPageSpy = vi.spyOn(jsPDF.prototype, "addPage");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes the title, metrics, charts and rows to the document and saves it", () => {
    generateSummaryPdf({
      title: "API Logs Summary",
      subtitle: "Period: 2024-01-01 to 2024-01-08",
      metrics: [{ label: "Total Volume", value: "100" }],
      charts: [{ title: "Request Traffic Timeline", image: "data:image/png;base64,abc" }],
      rows: [{ heading: "Gateway Endpoints", lines: ["/api/a/: 4"] }],
    });

    expect(textSpy).toHaveBeenCalledWith("API Logs Summary", 15, expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("Period: 2024-01-01 to 2024-01-08", 15, expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("Total Volume: 100", 15, expect.any(Number));
    expect(textSpy).toHaveBeenCalledWith("/api/a/: 4", 15, expect.any(Number));
    expect(addImageSpy).toHaveBeenCalledWith("data:image/png;base64,abc", "PNG", 15, expect.any(Number), 180, 90);
    expect(saveSpy).toHaveBeenCalledWith("api-logs-summary.pdf");
  });

  it("does not embed an image when the chart image is unavailable", () => {
    generateSummaryPdf({
      title: "API Logs Summary",
      subtitle: "Period: 2024-01-01 to 2024-01-08",
      metrics: [],
      charts: [{ title: "Traffic Volume Share", image: null }],
      rows: [],
    });

    expect(addImageSpy).not.toHaveBeenCalled();
    expect(textSpy).toHaveBeenCalledWith("(chart image unavailable)", 15, expect.any(Number));
  });

  it("adds pages when the content overflows the document", () => {
    const metrics = Array.from({ length: 45 }, (_, i) => ({ label: `Metric ${i}`, value: String(i) }));
    const charts = Array.from({ length: 3 }, (_, i) => ({
      title: `Chart ${i}`,
      image: `data:image/png;base64,chart-${i}`,
    }));
    const manyRows = Array.from({ length: 80 }, (_, i) => `row ${i}`);

    generateSummaryPdf({
      title: "API Logs Summary",
      subtitle: "Period",
      metrics,
      charts,
      rows: [{ heading: "Long list", lines: manyRows }],
    });

    expect(addPageSpy).toHaveBeenCalled();
    expect(saveSpy).toHaveBeenCalledWith("api-logs-summary.pdf");
  });

  it("returns null when no chart instance is available", () => {
    expect(captureChart(null)).toBeNull();
    expect(captureChart({})).toBeNull();
    expect(captureChart({ getEchartsInstance: () => undefined })).toBeNull();
  });

  it("returns the chart data URL when an instance provides one", () => {
    const ref = {
      getEchartsInstance: () => ({
        getDataURL: vi.fn(() => "data:image/png;base64,chart"),
      }),
    };
    expect(captureChart(ref as never)).toBe("data:image/png;base64,chart");
  });

  it("returns null and logs when chart capture throws", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const ref = {
      getEchartsInstance: () => {
        throw new Error("boom");
      },
    };
    expect(captureChart(ref as never)).toBeNull();
    expect(err).toHaveBeenCalled();
  });
});
