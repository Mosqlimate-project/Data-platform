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
  data: (number | null)[];
  lower_50?: (number | null)[] | null;
  upper_50?: (number | null)[] | null;
  lower_80?: (number | null)[] | null;
  upper_80?: (number | null)[] | null;
  lower_90?: (number | null)[] | null;
  upper_90?: (number | null)[] | null;
  lower_95?: (number | null)[] | null;
  upper_95?: (number | null)[] | null;
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
  globalIntervals?: Set<string>;
  visibleBounds?: Set<number | string>;
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
  globalIntervals = new Set(),
  visibleBounds = new Set(),
  dataSeriesName = "Data",
}) => {
  const { resolvedTheme } = useTheme();
  const chartRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  const hasObservedData = useMemo(() => {
    return data.data && data.data.length > 0 && data.data.some((v) => v !== null);
  }, [data.data]);

  const mainLabels = useMemo(() => {
    const uniqueDates = new Set<string>();
    if (hasObservedData) {
      data.labels.forEach((d) => uniqueDates.add(formatDate(d)));
    }
    predictions.forEach((p) => {
      p.data.labels.forEach((d) => uniqueDates.add(formatDate(d)));
    });
    return Array.from(uniqueDates).sort();
  }, [data.labels, predictions, hasObservedData]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(chartRef.current);
    }

    const chartInstance = instanceRef.current;
    const seriesOptions: echarts.SeriesOption[] = [];
    const legendData: any[] = [];
    const legendSelected: Record<string, boolean> = {};

    if (hasObservedData) {
      const dataMap = new Map<string, number | null>();
      data.labels.forEach((date, i) => {
        dataMap.set(formatDate(date), data.data[i]);
      });

      seriesOptions.push({
        name: dataSeriesName,
        type: "line",
        data: mainLabels.map(label => dataMap.get(label) ?? null),
        smooth: false,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: resolvedTheme === "dark" ? "#ffffff" : "#000000" },
        lineStyle: { width: 0 },
        connectNulls: true,
        z: 50,
      });

      legendData.push({
        name: dataSeriesName,
        textStyle: { color: resolvedTheme === "dark" ? "#ffffff" : "#000000", fontWeight: "bold" }
      });
      legendSelected[dataSeriesName] = true;
    }

    predictions.forEach((pred) => {
      const predId = String(pred.id);
      const isVisibleInChart = visibleBounds.has(Number(pred.id)) || visibleBounds.has(predId);

      legendData.push({
        name: predId,
        textStyle: { color: pred.color },
        itemStyle: { color: pred.color }
      });
      legendSelected[predId] = true;

      const predMap = new Map<string, number | null>();
      pred.data.labels.forEach((date, i) => {
        predMap.set(formatDate(date), pred.data.data[i]);
      });

      seriesOptions.push({
        name: predId,
        type: "line",
        data: mainLabels.map(label => predMap.get(label) ?? null),
        smooth: true,
        showSymbol: false,
        lineStyle: { color: pred.color, width: 2 },
        itemStyle: { color: pred.color },
        connectNulls: true,
        z: 40,
      });

      if (isVisibleInChart) {
        const possibleIntervals = ["50", "80", "90", "95"];

        possibleIntervals.forEach((intKey) => {
          if (!globalIntervals.has(intKey)) return;

          const lowerKey = `lower_${intKey}` as keyof PredictionData;
          const upperKey = `upper_${intKey}` as keyof PredictionData;

          const lowerRaw = pred.data[lowerKey] as (number | null)[] | null;
          const upperRaw = pred.data[upperKey] as (number | null)[] | null;

          if (Array.isArray(lowerRaw) && Array.isArray(upperRaw)) {
            const lowerMap = new Map<string, number | null>();
            const upperMap = new Map<string, number | null>();

            pred.data.labels.forEach((date, i) => {
              lowerMap.set(formatDate(date), lowerRaw[i]);
              upperMap.set(formatDate(date), upperRaw[i]);
            });

            const lData = mainLabels.map(l => lowerMap.get(l) ?? null);
            const uData = mainLabels.map(l => upperMap.get(l) ?? null);
            const deltaData = lData.map((l, i) => {
              const u = uData[i];
              return (typeof l === 'number' && typeof u === 'number') ? u - l : null;
            });

            seriesOptions.push({
              name: `${predId}_${intKey}_base`,
              type: "line",
              data: lData,
              smooth: true,
              symbol: "none",
              lineStyle: { opacity: 0 },
              stack: `conf-${intKey}-${predId}`,
              silent: true,
              tooltip: { show: false }
            });

            seriesOptions.push({
              name: `${predId}_${intKey}_area`,
              type: "line",
              data: deltaData,
              smooth: true,
              symbol: "none",
              lineStyle: { opacity: 0 },
              areaStyle: {
                color: pred.color,
                opacity: intKey === "50" ? 0.3 : 0.15
              },
              stack: `conf-${intKey}-${predId}`,
              silent: true,
              tooltip: { show: false }
            });
          }
        });
      }
    });

    const options: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
        borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
        textStyle: { color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827" },
      },
      legend: { top: 10, data: legendData, selected: legendSelected, itemGap: 20 },
      grid: { left: "3%", right: "4%", bottom: "10%", containLabel: true },
      xAxis: {
        type: "category",
        data: mainLabels,
        boundaryGap: false,
        axisLabel: { color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280" },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280" },
        splitLine: { lineStyle: { color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb" } },
      },
      series: seriesOptions,
      graphic: {
        type: 'image',
        top: 30,
        right: 50,
        z: 0,
        bounding: 'raw',
        style: {
          image: '/watermark.png',
          width: 100,
          height: 100,
          opacity: 0.3,
        }
      },
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
        }
      ]
    };

    chartInstance.setOption(options, { notMerge: true });
    const handleResize = () => chartInstance.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [data, predictions, mainLabels, resolvedTheme, globalIntervals, visibleBounds, dataSeriesName, hasObservedData]);

  return <div ref={chartRef} style={{ width, height }} />;
};
