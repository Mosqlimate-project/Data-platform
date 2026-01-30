"use client";

import { useEffect, useState, useRef } from "react";
import * as echarts from "echarts";

interface ChartProps {
  geocode: string;
  disease: string;
  start: string;
  end: string;
}

interface DailyCaseData {
  date: string;
  cases: number;
}

function useChart(options: echarts.EChartsOption | null, loading: boolean) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);

      const handleResize = () => chartInstance.current?.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [options, loading]);

  useEffect(() => {
    if (!chartInstance.current) return;

    if (loading) {
      chartInstance.current.showLoading();
    } else {
      chartInstance.current.hideLoading();
      if (options) {
        chartInstance.current.setOption(options, { notMerge: true }); // notMerge ensures clean update between cities
        chartInstance.current.resize();
      }
    }
  }, [loading, options]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return chartRef;
}

const getDiseaseCode = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("dengue")) return "A90";
  if (normalized.includes("zika")) return "A92.5";
  if (normalized.includes("chik")) return "A92.0";
  return "A90";
};

export function TotalCases({ geocode, disease, start, end }: ChartProps) {
  const [totalCases, setTotalCases] = useState<number>(0);

  useEffect(() => {
    if (!geocode) return;
    const query = new URLSearchParams({ geocode, disease, start, end });

    fetch(`/api/datastore/charts/infodengue/total-cases/?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.total_cases !== undefined) {
          setTotalCases(data.total_cases);
        }
      })
      .catch(console.error);
  }, [geocode, disease, start, end]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="border rounded-md p-4 bg-card text-card-foreground shadow-sm">
        <div className="text-sm opacity-70">Total Reported Cases</div>
        <div className="text-3xl font-bold">{totalCases.toLocaleString()}</div>
      </div>
    </div>
  );
}

export function DailyCasesChart({ geocode, disease, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !disease || !start || !end) return;

    setLoading(true);

    const diseaseCode = getDiseaseCode(disease);

    const params = new URLSearchParams({
      sprint: "false",
      disease: diseaseCode,
      start: start,
      end: end,
      adm_level: "2",
      adm_2: geocode,
    });

    fetch(`/api/vis/dashboard/cases/?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data: DailyCaseData[]) => {
        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const sortedData = data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const dates = sortedData.map((d) => d.date);
        const cases = sortedData.map((d) => d.cases);

        setOption({
          title: {
            text: "Daily Cases",
            left: "center",
            textStyle: { fontSize: 14, fontWeight: "normal" },
          },
          tooltip: {
            trigger: "axis",
            formatter: (params: any) => {
              const p = params[0];
              const date = new Date(p.axisValue).toLocaleDateString();
              return `${date}<br/><strong>${p.marker} ${p.seriesName}: ${p.value}</strong>`;
            },
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
          grid: {
            left: "3%",
            right: "4%",
            bottom: "3%",
            top: "40px",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              formatter: (value: string) => value.split("T")[0],
            },
          },
          yAxis: {
            type: "value",
            name: "Cases",
            splitLine: { show: true, lineStyle: { type: "dashed" } },
          },
          series: [
            {
              name: "Cases",
              type: "line",
              data: cases,
              smooth: false,
              showSymbol: false,
              itemStyle: { color: "#3b82f6" },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(59, 130, 246, 0.5)" },
                  { offset: 1, color: "rgba(59, 130, 246, 0.0)" },
                ]),
              },
            },
          ],
        });
      })
      .catch((err) => {
        console.error(err);
        setOption(null);
      })
      .finally(() => setLoading(false));
  }, [geocode, disease, start, end]);

  const chartRef = useChart(option, loading);

  return (
    <div className="w-full border rounded-md p-4 bg-card shadow-sm mt-6">
      {!loading && !option ? (
        <div className="h-[350px] flex items-center justify-center text-muted-foreground opacity-60 text-sm">
          No data available for this period.
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
      )}
    </div>
  );
}
