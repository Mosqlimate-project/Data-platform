"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface UmidPressaoData {
  date: string;
  epiweek: number;
  umid_med: number;
  pressao_med: number;
}

interface UmidPressaoChartProps {
  geocode: string;
  start: string;
  end: string;
  disease?: string;
}

export default function UmidPressaoMedChart({ geocode, start, end }: UmidPressaoChartProps) {
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
      const res = await fetch(`/api/datastore/charts/municipality/umid-pressao-med/?${query.toString()}`);
      if (!res.ok) return;

      const data: UmidPressaoData[] = await res.json();
      if (!data || data.length === 0) return;

      const dates = data.map((d) => d.date.split(" ")[0]);
      const humidity = data.map((d) => d.umid_med);
      const pressure = data.map((d) => d.pressao_med);

      const option: echarts.EChartsOption = {
        title: { text: `Umidade Relativa e Pressão Média - ${geocode}`, left: "center" },
        tooltip: { trigger: "axis" },
        legend: { data: ["Umidade relativa do ar média", "Pressão do ar média"], top: 35 },
        grid: { left: 50, right: 30, bottom: 50, top: 80 },
        xAxis: { type: "category", data: dates },
        yAxis: [
          {
            type: "value",
            name: "Pressão (atm)",
            position: "left",
            min: "dataMin",
            max: Math.max(...pressure) + 0.02,
          },
          {
            type: "value",
            name: "Umidade (%)",
            position: "right",
          },
        ],
        series: [
          {
            name: "Pressão do ar média",
            type: "bar",
            data: pressure,
            yAxisIndex: 0,
            itemStyle: { color: "#8D9ECE" },
          },
          {
            name: "Umidade relativa do ar média",
            type: "line",
            data: humidity,
            yAxisIndex: 1,
            lineStyle: { color: "#81B863" },
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
