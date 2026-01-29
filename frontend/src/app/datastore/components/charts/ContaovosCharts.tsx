"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

function useChart(options: echarts.EChartsOption | null, loading: boolean) {
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
    };
  }, []);

  useEffect(() => {
    if (!chartInstance.current) return;
    if (loading) {
      chartInstance.current.showLoading();
    } else {
      chartInstance.current.hideLoading();
      if (options) chartInstance.current.setOption(options);
    }
  }, [loading, options]);

  return chartRef;
}

interface MosquitoData {
  eggs: number;
  date: string;
  week: number;
  year: number;
  municipality: string;
}

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
}

export function EggCountChart({ geocode, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode) return;
    setLoading(true);

    const query = new URLSearchParams({
      geocode,
      date_start: start,
      date_end: end
    });

    fetch(`/api/datastore/mosquito/?${query}`)
      .then(res => res.json())
      .then((data: MosquitoData[]) => {
        if (!data || data.length === 0) { setOption(null); return; }

        data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const dates = data.map(d => d.date);
        const eggs = data.map(d => d.eggs);
        const city = data[0]?.municipality || geocode;

        setOption({
          title: {
            text: `Mosquito Egg Abundance - ${city}`,
            left: "center"
          },
          tooltip: { trigger: "axis" },
          legend: { top: 30 },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: {
            type: "category",
            data: dates,
            name: "Date"
          },
          yAxis: {
            type: "value",
            name: "Egg Count"
          },
          series: [
            {
              name: "Eggs",
              type: "bar",
              data: eggs,
              itemStyle: { color: "#8b5cf6" },
              markLine: {
                data: [{ type: 'average', name: 'Avg' }]
              }
            }
          ],
          dataZoom: [{ type: "inside" }, { type: "slider" }]
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [geocode, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}
