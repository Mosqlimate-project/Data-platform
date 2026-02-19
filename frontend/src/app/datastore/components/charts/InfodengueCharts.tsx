"use client";

import { useEffect, useState, useRef } from "react";
import * as echarts from "echarts";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

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
        chartInstance.current.setOption(options, { notMerge: true });
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
  const { t } = useTranslation('common');
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
      <div className="border border-border rounded-md p-4 bg-bg text-text shadow-sm">
        <div className="text-sm opacity-70">{t('charts_infodengue.total_cases_label')}</div>
        <div className="text-3xl font-bold">{totalCases.toLocaleString()}</div>
      </div>
    </div>
  );
}

export function DailyCasesChart({ geocode, disease, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
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
      case_definition: "reported"
    });

    fetch(`/api/vis/dashboard/cases/?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error(t('charts_infodengue.fetch_error'));
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
            text: t('charts_infodengue.daily_cases_title'),
            left: "center",
            textStyle: {
              fontSize: 14,
              fontWeight: "normal",
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
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
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          yAxis: {
            type: "value",
            name: t('charts_infodengue.cases_axis'),
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            nameTextStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            splitLine: {
              show: true,
              lineStyle: {
                type: "dashed",
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              }
            },
          },
          series: [
            {
              name: t('charts_infodengue.cases_axis'),
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
  }, [geocode, disease, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);

  return (
    <div className="w-full border border-border rounded-md p-4 bg-bg shadow-sm mt-6">
      {!loading && !option ? (
        <div className="h-[350px] flex items-center justify-center text-secondary opacity-60 text-sm">
          {t('charts_infodengue.no_data')}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
      )}
    </div>
  );
}

interface RtData {
  data_iniSE: string;
  Rt: number;
}

export function RtChart({ geocode, disease, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !disease || !start || !end) return;

    setLoading(true);

    const query = new URLSearchParams({ geocode, disease, start, end });

    fetch(`/api/datastore/charts/infodengue/rt/?${query}`)
      .then((res) => res.json())
      .then((data: RtData[]) => {
        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const sortedData = data.sort(
          (a, b) => new Date(a.data_iniSE).getTime() - new Date(b.data_iniSE).getTime()
        );
        const dates = sortedData.map((d) => d.data_iniSE);
        const rtValues = sortedData.map((d) => d.Rt);

        setOption({
          title: {
            text: t('charts_infodengue.rt_title'),
            left: "center",
            textStyle: {
              fontSize: 14,
              fontWeight: "normal",
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
            formatter: (params: any) => {
              const p = params[0];
              const date = new Date(p.axisValue).toLocaleDateString();
              const val = Number(p.value);
              return `${date}<br/><strong>${t('charts_infodengue.rt_tooltip')}: ${val.toFixed(2)}</strong>`;
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
            top: "50px",
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              formatter: (value: string) => value.split("T")[0],
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          yAxis: {
            type: "value",
            name: "Rt",
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            nameTextStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            splitLine: {
              show: true,
              lineStyle: {
                type: "dashed",
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              }
            },
            min: 0,
          },
          visualMap: {
            show: false,
            pieces: [
              { gt: 0, lte: 1, color: "#22c55e" },
              { gt: 1, color: "#ef4444" },
            ],
            outOfRange: {
              color: "#999",
            },
          },
          series: [
            {
              name: "Rt",
              type: "line",
              data: rtValues,
              smooth: true,
              showSymbol: false,
              markLine: {
                silent: true,
                symbol: "none",
                lineStyle: {
                  color: resolvedTheme === "dark" ? "#9ca3af" : "#333",
                  type: "dashed",
                  width: 1,
                },
                label: {
                  position: "end",
                  formatter: t('charts_infodengue.threshold'),
                  color: resolvedTheme === "dark" ? "#9ca3af" : "#333",
                },
                data: [{ yAxis: 1.0 }],
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(150, 150, 150, 0.2)" },
                  { offset: 1, color: "rgba(150, 150, 150, 0.0)" },
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
  }, [geocode, disease, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);

  return (
    <div className="w-full border border-border rounded-md p-4 bg-bg shadow-sm mt-6">
      {!loading && !option ? (
        <div className="h-[350px] flex items-center justify-center text-secondary opacity-60 text-sm">
          {t('charts_infodengue.no_rt_data')}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "350px" }} />
      )}
    </div>
  );
}
