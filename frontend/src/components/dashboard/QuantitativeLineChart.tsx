"use client";

import React, { useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";

export interface Series {
  labels: Date[];
  data: (number | null)[];
}

export interface PredictionData {
  labels: Date[];
  lower_95?: (number | null)[];
  lower_90?: (number | null)[];
  lower_80?: (number | null)[];
  lower_50?: (number | null)[];
  data: (number | null)[];
  upper_50?: (number | null)[];
  upper_80?: (number | null)[];
  upper_90?: (number | null)[];
  upper_95?: (number | null)[];
}

export interface QuantitativePrediction {
  id: string | number;
  color: string;
  data: PredictionData;
}

export interface ChartProps {
  data: Series;
  predictions: QuantitativePrediction[];
  height?: string | number;
  width?: string | number;
  activeIntervals?: Set<number | string>;
  dataSeriesName?: string;
}

const formatDate = (date: Date) => {
  return date instanceof Date ? date.toISOString().split('T')[0] : String(date);
};

export const LineChart: React.FC<ChartProps> = ({
  data,
  predictions,
  height = "400px",
  width = "100%",
  activeIntervals = new Set(),
  dataSeriesName = "Data",
}) => {
  const { resolvedTheme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const mainLabels = useMemo(() => {
    const uniqueDates = new Set<string>();
    data.labels.forEach((d) => uniqueDates.add(formatDate(d)));
    predictions.forEach((p) => {
      p.data.labels.forEach((d) => uniqueDates.add(formatDate(d)));
    });
    return Array.from(uniqueDates).sort();
  }, [data.labels, predictions]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const chartInstance = instanceRef.current;
    const seriesOptions: echarts.SeriesOption[] = [];
    const intervalDataCache: Record<string, { l90: (number | null)[], u90: (number | null)[], l50: (number | null)[], u50: (number | null)[] }> = {};

    const dataMap = new Map<string, number | null>();
    data.labels.forEach((date, i) => {
      dataMap.set(formatDate(date), data.data[i]);
    });

    const alignedData = mainLabels.map(label => {
      const val = dataMap.get(label);
      return val === undefined ? null : val;
    });

    seriesOptions.push({
      name: dataSeriesName,
      type: "line",
      data: alignedData,
      smooth: false,
      symbol: "circle",
      symbolSize: 6,
      itemStyle: { color: resolvedTheme === "dark" ? "#ffffff" : "#000000" },
      lineStyle: { width: 0 },
      connectNulls: true,
      z: 50,
    });

    const legendData: any[] = [{
      name: dataSeriesName,
      textStyle: {
        color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
        fontWeight: "bold"
      }
    }];

    const legendSelected: Record<string, boolean> = { [dataSeriesName]: true };

    predictions.forEach((pred) => {
      const predId = `${pred.id}`;
      const isActive = activeIntervals.has(pred.id) || activeIntervals.has(predId);

      legendData.push({
        name: predId,
        textStyle: {
          color: pred.color,
          fontWeight: "normal"
        },
        itemStyle: {
          color: pred.color
        }
      });

      legendSelected[predId] = true;

      const predMap = new Map<string, number | null>();
      const lower90Map = new Map<string, number | null>();
      const upper90Map = new Map<string, number | null>();
      const lower50Map = new Map<string, number | null>();
      const upper50Map = new Map<string, number | null>();

      pred.data.labels.forEach((date, i) => {
        const dateStr = formatDate(date);
        predMap.set(dateStr, pred.data.data[i]);

        if (pred.data.lower_90 && pred.data.upper_90) {
          lower90Map.set(dateStr, pred.data.lower_90[i]);
          upper90Map.set(dateStr, pred.data.upper_90[i]);
        }
        if (pred.data.lower_50 && pred.data.upper_50) {
          lower50Map.set(dateStr, pred.data.lower_50[i]);
          upper50Map.set(dateStr, pred.data.upper_50[i]);
        }
      });

      const alignedPredData = mainLabels.map(label => {
        const val = predMap.get(label);
        return val === undefined ? null : val;
      });

      const l90Data = mainLabels.map(l => { const v = lower90Map.get(l); return v === undefined ? null : v; });
      const u90Data = mainLabels.map(l => { const v = upper90Map.get(l); return v === undefined ? null : v; });
      const l50Data = mainLabels.map(l => { const v = lower50Map.get(l); return v === undefined ? null : v; });
      const u50Data = mainLabels.map(l => { const v = upper50Map.get(l); return v === undefined ? null : v; });

      intervalDataCache[predId] = { l90: l90Data, u90: u90Data, l50: l50Data, u50: u50Data };

      seriesOptions.push({
        name: predId,
        type: "line",
        data: alignedPredData,
        smooth: true,
        showSymbol: false,
        lineStyle: { color: pred.color, width: 2 },
        itemStyle: { color: pred.color },
        connectNulls: true,
        z: 40,
      });

      if (isActive && pred.data.lower_90 && pred.data.upper_90) {
        const delta90Data = mainLabels.map((_, idx) => {
          const l = l90Data[idx];
          const u = u90Data[idx];
          if (l != null && u != null) return u - l;
          return null;
        });

        seriesOptions.push({
          name: `${predId}_90_base`,
          type: "line",
          data: l90Data,
          smooth: true,
          symbol: "none",
          lineStyle: { opacity: 0 },
          stack: `confidence-90-${predId}`,
          z: 10,
          silent: true,
          tooltip: { show: false }
        });

        seriesOptions.push({
          name: `${predId}_90_area`,
          type: "line",
          data: delta90Data,
          smooth: true,
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: pred.color,
            opacity: 0.15
          },
          stack: `confidence-90-${predId}`,
          z: 10,
          silent: true,
          tooltip: { show: false }
        });
      }

      if (isActive && pred.data.lower_50 && pred.data.upper_50) {
        const delta50Data = mainLabels.map((_, idx) => {
          const l = l50Data[idx];
          const u = u50Data[idx];
          if (l != null && u != null) return u - l;
          return null;
        });

        seriesOptions.push({
          name: `${predId}_50_base`,
          type: "line",
          data: l50Data,
          smooth: true,
          symbol: "none",
          lineStyle: { opacity: 0 },
          stack: `confidence-50-${predId}`,
          z: 15,
          silent: true,
          tooltip: { show: false }
        });

        seriesOptions.push({
          name: `${predId}_50_area`,
          type: "line",
          data: delta50Data,
          smooth: true,
          symbol: "none",
          lineStyle: { opacity: 0 },
          areaStyle: {
            color: pred.color,
            opacity: 0.25
          },
          stack: `confidence-50-${predId}`,
          z: 15,
          silent: true,
          tooltip: { show: false }
        });
      }
    });

    const options: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
        borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
        textStyle: {
          color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
        },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let html = `<div style="margin-bottom:4px;font-weight:600">${params[0].axisValueLabel}</div>`;

          let hasContent = false;
          const idx = params[0].dataIndex;

          params.forEach((p) => {
            if (p.value == null) return;

            const isData = p.seriesName === dataSeriesName;
            const rawName = p.seriesName;
            const isPredLine = !isData && !rawName.includes("_base") && !rawName.includes("_area");

            if (isData || isPredLine) {
              hasContent = true;
              const val = typeof p.value === 'number' ? p.value.toFixed(2) : p.value;
              const color = typeof p.color === 'object' ? (p.color as any).colorStops?.[0]?.color || '#000' : p.color;

              let intervalStr = "";
              if (isPredLine) {
                if (activeIntervals.has(parseInt(rawName)) || activeIntervals.has(rawName)) {
                  const intervals = intervalDataCache[rawName];
                  if (intervals) {
                    const l90 = intervals.l90[idx];
                    const u90 = intervals.u90[idx];
                    if (l90 != null && u90 != null) {
                      intervalStr = ` <span style="font-size:11px; opacity:0.7; margin-left:4px;">(${l90.toFixed(2)} - ${u90.toFixed(2)})</span>`;
                    }
                  }
                }
              }

              html += `
                <div style="display:flex; justify-content:space-between; align-items:center; min-width:120px; margin-bottom:2px;">
                  <div style="display:flex; align-items:center;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};margin-right:6px;"></span>
                    <span style="opacity:0.9">${rawName}</span>
                  </div>
                  <span style="font-family:monospace; margin-left:12px; font-weight:600">${val}${intervalStr}</span>
                </div>`;
            }
          });
          return hasContent ? html : "";
        }
      },
      legend: {
        top: 10,
        data: legendData,
        selected: legendSelected,
        itemGap: 20,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        containLabel: true,
      },
      graphic: {
        type: 'image',
        top: 10,
        right: 10,
        z: 0,
        bounding: 'raw',
        style: {
          image: '/watermark.png',
          width: 100,
          height: 100,
          opacity: 0.3,
        }
      },
      xAxis: {
        type: "category",
        data: mainLabels,
        boundaryGap: false,
        axisLabel: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
          },
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
          },
        },
      },
      series: seriesOptions,
      dataZoom: [
        { type: "inside", throttle: 50 },
        {
          type: "slider",
          show: true,
          height: 20,
          bottom: 0,
          borderColor: "transparent",
          backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6",
          fillerColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
          textStyle: {
            color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
          }
        }
      ]
    };

    chartInstance.setOption(options, { notMerge: true });

    const handleResize = () => chartInstance.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, predictions, mainLabels, resolvedTheme, activeIntervals, dataSeriesName]);

  return <div ref={chartRef} style={{ width, height }} />;
};
