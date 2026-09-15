import { jsPDF } from "jspdf";
import * as echarts from "echarts";

type ChartRef = { getEchartsInstance?: () => { getDataURL?: (opts?: Record<string, unknown>) => string } | undefined } | null;

export function captureChart(ref: ChartRef): string | null {
  try {
    const instance = ref?.getEchartsInstance?.();
    if (instance?.getDataURL) {
      return instance.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#ffffff" });
    }
  } catch (err) {
    console.error(err);
  }
  return null;
}

export type PdfChart = { title: string; image: string | null };
export type PdfSection = { heading: string; lines: string[] };
export type PdfMetric = { label: string; value: string };

type SummaryPdfOptions = {
  title: string;
  subtitle: string;
  metrics: PdfMetric[];
  charts: PdfChart[];
  rows: PdfSection[];
};

export function generateSummaryPdf({
  title,
  subtitle,
  metrics,
  charts,
  rows,
}: SummaryPdfOptions): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 23, 30);
  doc.text(title, 15, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, 15, y);
  y += 12;

  if (metrics.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 23, 30);
    for (const metric of metrics) {
      doc.text(`${metric.label}: ${metric.value}`, 15, y);
      y += 6;
    }
    y += 6;
  }

  for (const chart of charts) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 23, 30);
    doc.text(chart.title, 15, y);
    y += 4;
    if (chart.image) {
      doc.addImage(chart.image, "PNG", 15, y, 180, 90);
      y += 90 + 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("(chart image unavailable)", 15, y + 4);
      y += 12;
    }
  }

  for (const section of rows) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 23, 30);
    doc.text(section.heading, 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    for (const line of section.lines) {
      doc.text(line, 15, y);
      y += 5;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }
    y += 6;
  }

  doc.save("api-logs-summary.pdf");
}
