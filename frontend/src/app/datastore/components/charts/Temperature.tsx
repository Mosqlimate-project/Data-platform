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

      chartInstance.current.showLoading();

      const query = new URLSearchParams({ geocode, start, end });

      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/municipality/temperature/?${query.toString()}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error("Failed to load chart data");

        const data: TemperatureData[] = await chartRes.json();

        let locationTitle = geocode;
        if (cityRes.ok) {
          const cityData = await cityRes.json();
          if (cityData && cityData.length > 0) {
            locationTitle = `${cityData[0].name} - ${cityData[0].adm1}`;
          }
        }

        if (!data || data.length === 0) {
          chartInstance.current?.hideLoading();
          return;
        }

        const dates = data.map((d) => d.date.split(" ")[0]);
        const tempMin = data.map((d) => d.temp_min);
        const tempMed = data.map((d) => d.temp_med);
        const tempMax = data.map((d) => d.temp_max);

        const option: echarts.EChartsOption = {
          title: { text: `Temperature on ${locationTitle}`, left: "center" },
          tooltip: { trigger: "axis" },
          legend: { data: ["Max", "Med", "Min"], top: 35 },
          grid: { left: 50, right: 30, bottom: 50, top: 80 },
          xAxis: { type: "category", data: dates },
          yAxis: { name: "Temperature (°C)", type: "value" },
          series: [
            {
              name: "Max",
              type: "line",
              data: tempMax,
              lineStyle: { color: "#6A75B7" },
              showSymbol: false,
            },
            {
              name: "Med",
              type: "line",
              data: tempMed,
              lineStyle: { color: "#90BE10" },
              showSymbol: false,
            },
            {
              name: "Min",
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
      } catch (error) {
        console.error(error);
      } finally {
        chartInstance.current?.hideLoading();
      }
    }

    loadData();
  }, [geocode, start, end]);

  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}
