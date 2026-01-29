"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";

interface InfodengueData {
  data_iniSE: string;
  SE: number;
  casos: number;
  casos_est: number;
  casos_est_min: number;
  casos_est_max: number;
  Rt: number;
  nivel: number;
  tempmed: number;
}

interface ChartProps {
  geocode: string;
  disease: string;
  start: string;
  end: string;
}

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

export function InfodengueSummary({ geocode, disease, start, end }: ChartProps) {
  const [stats, setStats] = useState({ total: 0, maxRt: 0, currentLevel: 0 });

  useEffect(() => {
    if (!geocode) return;
    const query = new URLSearchParams({ geocode, disease, start, end, per_page: "1000" });

    fetch(`/api/datastore/infodengue/?${query}`)
      .then(res => res.json())
      .then((data: InfodengueData[]) => {
        if (!data || data.length === 0) return;

        const total = data.reduce((acc, curr) => acc + (curr.casos_est || 0), 0);
        const maxRt = Math.max(...data.map(d => d.Rt));
        const lastItem = data[data.length - 1];

        setStats({
          total: Math.round(total),
          maxRt: parseFloat(maxRt.toFixed(2)),
          currentLevel: lastItem.nivel
        });
      })
      .catch(console.error);
  }, [geocode, disease, start, end]);

  const levelColors = ["#E5E7EB", "#22c55e", "#eab308", "#f97316", "#ef4444"];
  const levelNames = ["Unknown", "Green", "Yellow", "Orange", "Red"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="border rounded-md p-4 bg-card text-card-foreground shadow-sm">
        <div className="text-sm opacity-70">Total Est. Cases</div>
        <div className="text-3xl font-bold">{stats.total.toLocaleString()}</div>
      </div>
      <div className="border rounded-md p-4 bg-card text-card-foreground shadow-sm">
        <div className="text-sm opacity-70">Max Rt (Period)</div>
        <div className={`text-3xl font-bold ${stats.maxRt > 1 ? "text-red-500" : "text-green-500"}`}>
          {stats.maxRt}
        </div>
      </div>
      <div className="border rounded-md p-4 bg-card text-card-foreground shadow-sm flex flex-col justify-between"
        style={{ borderRight: `6px solid ${levelColors[stats.currentLevel]}` }}>
        <div className="text-sm opacity-70">Latest Alert Level</div>
        <div className="text-2xl font-bold" style={{ color: levelColors[stats.currentLevel] }}>
          Level {stats.currentLevel} - {levelNames[stats.currentLevel]}
        </div>
      </div>
    </div>
  );
}

export function EpidemicCurveChart({ geocode, disease, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode) return;
    setLoading(true);
    const query = new URLSearchParams({ geocode, disease, start, end, per_page: "1000" });

    fetch(`/api/datastore/infodengue/?${query}`)
      .then(res => res.json())
      .then((data: InfodengueData[]) => {
        if (!data.length) { setOption(null); return; }

        const dates = data.map(d => d.data_iniSE);
        const casos = data.map(d => d.casos);
        const casosEst = data.map(d => d.casos_est);

        setOption({
          title: { text: "Epidemic Curve (Reported vs Estimated)", left: "center" },
          tooltip: { trigger: "axis" },
          legend: { top: 30 },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: { type: "category", data: dates },
          yAxis: { type: "value", name: "Cases" },
          series: [
            {
              name: "Reported Cases",
              type: "bar",
              data: casos,
              itemStyle: { color: "#93c5fd" }
            },
            {
              name: "Estimated (Nowcast)",
              type: "line",
              data: casosEst,
              itemStyle: { color: "#2563eb" },
              lineStyle: { type: "dashed" }
            }
          ],
          dataZoom: [{ type: "inside" }, { type: "slider" }]
        });
      })
      .finally(() => setLoading(false));
  }, [geocode, disease, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

export function RtChart({ geocode, disease, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode) return;
    setLoading(true);
    const query = new URLSearchParams({ geocode, disease, start, end, per_page: "1000" });

    fetch(`/api/datastore/infodengue/?${query}`)
      .then(res => res.json())
      .then((data: InfodengueData[]) => {
        if (!data.length) { setOption(null); return; }

        const dates = data.map(d => d.data_iniSE);
        const rt = data.map(d => d.Rt);

        setOption({
          title: { text: "Effective Reproductive Number (Rt)", left: "center" },
          tooltip: { trigger: "axis" },
          grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
          xAxis: { type: "category", data: dates },
          yAxis: {
            type: "value",
            name: "Rt",
          },
          visualMap: {
            show: false,
            pieces: [{ gt: 1, color: "#ef4444" }, { lte: 1, color: "#22c55e" }],
            outOfRange: { color: "grey" }
          },
          series: [
            {
              name: "Rt",
              type: "line",
              data: rt,
              markLine: {
                symbol: "none",
                label: { formatter: "Threshold (1.0)" },
                data: [{ yAxis: 1, name: "Threshold" }],
                lineStyle: { color: "#333", type: "dashed", width: 2 }
              }
            }
          ],
          dataZoom: [{ type: "inside" }, { type: "slider" }]
        });
      })
      .finally(() => setLoading(false));
  }, [geocode, disease, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}
