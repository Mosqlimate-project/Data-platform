"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface TemperatureData {
  date: string;
  epiweek: string;
  temp_min: number;
  temp_med: number;
  temp_max: number;
}

interface TemperatureChartProps {
  geocode: string;
  start: string;
  end: string;
  disease?: string;
}

export default function TemperatureChart({ geocode, start, end }: TemperatureChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!geocode || !start || !end || !chartInstance.current) return;

      const query = new URLSearchParams({ geocode, start, end });
      const res = await fetch(`/api/datastore/charts/municipality/temperature/?${query.toString()}`);

      if (!res.ok) return;
      const data: TemperatureData[] = await res.json();
      if (!data || data.length === 0) return;

      const dates = data.map((d) => d.date.split(" ")[0]);
      const tempMin = data.map((d) => d.temp_min);
      const tempMed = data.map((d) => d.temp_med);
      const tempMax = data.map((d) => d.temp_max);

      const option: echarts.EChartsOption = {
        title: { text: `Temperaturas - ${geocode}`, left: "center" },
        tooltip: { trigger: "axis" },
        legend: { data: ["Máxima", "Média", "Mínima"], top: 35 },
        grid: { left: 50, right: 30, bottom: 50, top: 80 },
        xAxis: { type: "category", data: dates },
        yAxis: { name: "Temperatura (°C)", type: "value" },
        series: [
          {
            name: "Máxima",
            type: "line",
            data: tempMax,
            lineStyle: { color: "#6A75B7" },
            showSymbol: false,
          },
          {
            name: "Média",
            type: "line",
            data: tempMed,
            lineStyle: { color: "#90BE10" },
            showSymbol: false,
          },
          {
            name: "Mínima",
            type: "line",
            data: tempMin,
            lineStyle: { color: "#41BAC5" },
            showSymbol: false,
          },
        ],
        dataZoom: [
          { type: "inside", throttle: 50 },
          { type: "slider", show: true, bottom: 7, height: 10 },
        ],
      };

      chartInstance.current.setOption(option);
    }

    loadData();
  }, [geocode, start, end]);

  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}
