"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface PrecipitationData {
  date: string;
  epiweek: string;
  precip_tot: number;
  precip_med: number;
}

interface PrecipitationChartProps {
  geocode: string;
  start: string;
  end: string;
}

export default function PrecipitationChart({ geocode, start, end }: PrecipitationChartProps) {
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
      const res = await fetch(`/api/datastore/charts/municipality/accumulated-waterfall/?${query.toString()}`);

      if (!res.ok) return;
      const data: PrecipitationData[] = await res.json();
      if (!data || data.length === 0) return;

      const dates = data.map((d) => d.date.split(" ")[0]);
      const totalPrecip = data.map((d) => d.precip_tot);
      const meanPrecip = data.map((d) => d.precip_med);

      const objDates = data.map((d) => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime());
      const diffWeeks =
        objDates.length > 1
          ? (objDates[objDates.length - 1].getTime() - objDates[0].getTime()) /
          (1000 * 60 * 60 * 24 * 7)
          : 0;
      const showMonth = diffWeeks > 6;

      const option: echarts.EChartsOption = {
        title: { text: `Precipitação diária - ${geocode}`, left: "center" },
        tooltip: {
          trigger: "axis",
          formatter: (params: any) => {
            let result = params[0].axisValueLabel + "<br/>";
            params.forEach((item: any) => {
              const value = parseFloat(item.data);
              const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
              result += `${item.marker}${item.seriesName}: ${formatted}<br/>`;
            });
            return result;
          },
        },
        legend: { data: ["Precipitação Total", "Precipitação Média"], top: 35 },
        grid: { left: 50, right: 30, bottom: 50, top: 80 },
        xAxis: {
          name: showMonth ? "Mês" : "Semana Epidemiológica",
          nameLocation: "middle",
          nameGap: 40,
          nameTextStyle: { fontSize: 16, fontWeight: "bold" },
          type: "category",
          data: dates,
          axisLabel: {
            interval: 0,
            formatter: (value: string, index: number) => {
              if (showMonth) {
                const month = new Date(value + "T00:00:00").toLocaleString("pt-BR", { month: "short" });
                const prevMonth =
                  index > 0
                    ? new Date(dates[index - 1] + "T00:00:00").toLocaleString("pt-BR", { month: "short" })
                    : null;
                const year = value.split("-")[0];
                const prevYear = index > 0 ? dates[index - 1].split("-")[0] : null;
                return month !== prevMonth ? (year !== prevYear ? `${month}\n${year}` : month) : "";
              } else {
                return index === 0 || data[index].epiweek !== data[index - 1].epiweek
                  ? data[index].epiweek
                  : "";
              }
            },
            fontSize: 13,
            margin: 12,
          },
        },
        yAxis: {
          name: "Precipitação (mm)",
          nameLocation: "middle",
          nameGap: 40,
          nameTextStyle: { fontSize: 16, fontWeight: "bold" },
          type: "value",
          splitNumber: 4,
        },
        series: [
          {
            name: "Precipitação Média",
            type: "bar",
            data: meanPrecip,
            barWidth: "100%",
            stack: "two",
            itemStyle: { color: "#2FDDEC" },
          },
          {
            name: "Precipitação Total",
            type: "bar",
            data: totalPrecip,
            barWidth: "100%",
            stack: "two",
            itemStyle: { color: "#0F646B" },
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
