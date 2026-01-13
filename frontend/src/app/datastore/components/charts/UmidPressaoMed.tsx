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

      chartInstance.current.showLoading();
      const query = new URLSearchParams({ geocode, start, end });

      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/municipality/umid-pressao-med/?${query.toString()}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error("Failed to load chart data");

        const data: UmidPressaoData[] = await chartRes.json();

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
        const humidity = data.map((d) => d.umid_med);
        const pressure = data.map((d) => d.pressao_med);

        const option: echarts.EChartsOption = {
          title: {
            text: `Average Relative Humidity and Pressure on ${locationTitle}`,
            left: "center"
          },
          tooltip: { trigger: "axis" },
          legend: {
            data: ["Average Relative Humidity", "Average Air Pressure"],
            top: 35
          },
          grid: { left: 50, right: 50, bottom: 50, top: 80 },
          xAxis: { type: "category", data: dates },
          yAxis: [
            {
              type: "value",
              name: "Pressure (atm)",
              position: "left",
              min: "dataMin",
              max: (value) => value.max + 0.02,
            },
            {
              type: "value",
              name: "Humidity (%)",
              position: "right",
            },
          ],
          series: [
            {
              name: "Average Air Pressure",
              type: "bar",
              data: pressure,
              yAxisIndex: 0,
              itemStyle: { color: "#8D9ECE" },
            },
            {
              name: "Average Relative Humidity",
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
