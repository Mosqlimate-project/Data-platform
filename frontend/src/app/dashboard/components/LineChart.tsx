"use client";

import React from "react";
import ReactECharts from "echarts-for-react";

interface PredictionPoint {
  date: string;
  pred: number;
  lower_50?: number;
  upper_50?: number;
  lower_95: number;
  upper_95: number;
}

interface PredictionData {
  id: number;
  color: string;
  data: PredictionPoint[];
}

interface LineChartProps {
  predictions: PredictionData[];
}

export const LineChart: React.FC<LineChartProps> = ({ predictions }) => {
  const xAxisData = predictions[0]?.data.map(d => d.date) || [];

  const series = predictions.flatMap(p => {
    const seriesArray: any[] = [];
    const has50 = p.data.some(d => d.lower_50 !== undefined && d.upper_50 !== undefined);

    seriesArray.push(
      {
        name: `95% (${p.id})`,
        type: "line",
        color: p.color,
        data: p.data.map(d => d.upper_95),
        lineStyle: { opacity: 1, color: p.color },
        // areaStyle: { color: p.color, opacity: 0.15 },
        itemStyle: { color: p.color },
      },
    );


    if (has50) {
      seriesArray.push(
        {
          name: `50% (${p.id})`,
          type: "line",
          data: p.data.map(d => d.upper_50),
          lineStyle: { opacity: 1, color: p.color },
          // areaStyle: { color: p.color, opacity: 0.3 },
          itemStyle: { color: p.color },
        },
      );
    }

    seriesArray.push({
      name: `Prediction (${p.id})`,
      type: "line",
      data: p.data.map(d => d.pred),
      smooth: true,
      lineStyle: { color: p.color, width: 2 },
      itemStyle: { color: p.color },
    });

    if (has50) {
      seriesArray.push(
        {
          name: `50% (${p.id})`,
          type: "line",
          data: p.data.map(d => d.lower_50),
          lineStyle: { opacity: 1, color: p.color },
          // areaStyle: { color: p.color, opacity: 0.3 },
          itemStyle: { color: p.color },
          stack: `50_${p.id}`,
        }
      );
    }

    seriesArray.push(
      {
        name: `95% (${p.id})`,
        type: "line",
        data: p.data.map(d => d.lower_95),
        lineStyle: { opacity: 1, color: p.color },
        // areaStyle: { color: p.color, opacity: 0.15 },
        itemStyle: { color: p.color },
        stack: `95_${p.id}`,
      }
    );

    return seriesArray;
  });

  const option = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: xAxisData, boundaryGap: false },
    yAxis: { type: "value" },
    grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
    series,
  };

  return <ReactECharts option={option} style={{ height: 400, width: "100%" }} />;
};
