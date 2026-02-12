"use client";

import { useState, useEffect } from "react";
import { useChart } from "../../hooks/useChart";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
}

export function AccumulatedWaterfallChart({ geocode, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/climate/accumulated-waterfall/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error(t('charts_climate.loading_error'));

        const data = await chartRes.json();

        let locationTitle = geocode;
        if (cityRes.ok) {
          const cityData = await cityRes.json();
          if (cityData && cityData.length > 0) {
            locationTitle = `${cityData[0].name} - ${cityData[0].adm1}`;
          }
        }

        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const dates = data.map((d: any) => d.date.split(" ")[0]);
        const totalPrecip = data.map((d: any) => d.precip_tot);
        const meanPrecip = data.map((d: any) => d.precip_med);

        setOption({
          title: {
            text: t('charts_climate.precip_title', { location: locationTitle }),
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
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
          legend: {
            data: [t('charts_climate.precip_total'), t('charts_climate.precip_avg')],
            top: 40,
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          grid: {
            left: '3%',
            right: '3%',
            bottom: 40,
            top: 60,
            containLabel: true
          },
          xAxis: {
            name: t('charts_climate.date'),
            nameLocation: "middle",
            nameGap: 30,
            nameTextStyle: {
              fontSize: 12,
              fontWeight: "bold",
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            type: "category",
            data: dates,
            axisLabel: {
              fontSize: 11,
              formatter: (value: string) => value,
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          yAxis: {
            name: t('charts_climate.precip_axis'),
            nameLocation: "middle",
            nameGap: 40,
            nameTextStyle: {
              fontSize: 12,
              fontWeight: "bold",
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            type: "value",
            splitNumber: 4,
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            splitLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          series: [
            {
              name: t('charts_climate.precip_avg'),
              type: "bar",
              data: meanPrecip,
              barWidth: "100%",
              stack: "two",
              itemStyle: { color: "#2FDDEC" },
            },
            {
              name: t('charts_climate.precip_total'),
              type: "bar",
              data: totalPrecip,
              barWidth: "100%",
              stack: "two",
              itemStyle: { color: "#0F646B" },
            },
          ],
          dataZoom: [
            { type: "inside", throttle: 50 },
            {
              type: "slider",
              show: true,
              bottom: 5,
              height: 15,
              borderColor: "transparent",
              backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6",
              fillerColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
              textStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
              }
            },
          ],
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

export function TemperatureChart({ geocode, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/climate/temperature/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error(t('charts_climate.loading_error'));

        const data = await chartRes.json();

        let locationTitle = geocode;
        if (cityRes.ok) {
          const cityData = await cityRes.json();
          if (cityData && cityData.length > 0) {
            locationTitle = `${cityData[0].name} - ${cityData[0].adm1}`;
          }
        }

        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const dates = data.map((d: any) => d.date.split(" ")[0]);
        const tempMin = data.map((d: any) => d.temp_min);
        const tempMed = data.map((d: any) => d.temp_med);
        const tempMax = data.map((d: any) => d.temp_max);

        setOption({
          title: {
            text: t('charts_climate.temp_title', { location: locationTitle }),
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            }
          },
          legend: {
            data: [t('charts_climate.temp_max'), t('charts_climate.temp_med'), t('charts_climate.temp_min')],
            top: 35,
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          grid: { left: 50, right: 30, bottom: 50, top: 80 },
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          yAxis: {
            name: t('charts_climate.temp_axis'),
            type: "value",
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            nameTextStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            splitLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          series: [
            {
              name: t('charts_climate.temp_max'),
              type: "line",
              data: tempMax,
              lineStyle: { color: "#6A75B7" },
              showSymbol: false,
            },
            {
              name: t('charts_climate.temp_med'),
              type: "line",
              data: tempMed,
              lineStyle: { color: "#90BE10" },
              showSymbol: false,
            },
            {
              name: t('charts_climate.temp_min'),
              type: "line",
              data: tempMin,
              lineStyle: { color: "#41BAC5" },
              showSymbol: false,
            },
          ],
          dataZoom: [
            { type: "inside", throttle: 50 },
            {
              type: "slider",
              show: true,
              bottom: 7,
              height: 10,
              borderColor: "transparent",
              backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6",
              fillerColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
              textStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
              }
            },
          ],
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}

export function AirChart({ geocode, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/climate/umid-pressao-med/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error(t('charts_climate.loading_error'));

        const data = await chartRes.json();

        let locationTitle = geocode;
        if (cityRes.ok) {
          const cityData = await cityRes.json();
          if (cityData && cityData.length > 0) {
            locationTitle = `${cityData[0].name} - ${cityData[0].adm1}`;
          }
        }

        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const dates = data.map((d: any) => d.date.split(" ")[0]);
        const humidity = data.map((d: any) => d.umid_med);
        const pressure = data.map((d: any) => d.pressao_med);

        setOption({
          title: {
            text: t('charts_climate.air_title', { location: locationTitle }),
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            }
          },
          legend: {
            data: [t('charts_climate.air_humidity'), t('charts_climate.air_pressure')],
            top: 35,
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
            }
          },
          grid: { left: 50, right: 50, bottom: 50, top: 80 },
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              },
            },
          },
          yAxis: [
            {
              type: "value",
              name: t('charts_climate.pressure_axis'),
              position: "left",
              min: "dataMin",
              max: (value) => value.max + 0.02,
              axisLabel: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
              },
              nameTextStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
              },
              splitLine: {
                lineStyle: {
                  color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
                },
              },
            },
            {
              type: "value",
              name: t('charts_climate.humidity_axis'),
              position: "right",
              axisLabel: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
              },
              nameTextStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
              },
              splitLine: { show: false }
            },
          ],
          series: [
            {
              name: t('charts_climate.air_pressure'),
              type: "bar",
              data: pressure,
              yAxisIndex: 0,
              itemStyle: { color: "#8D9ECE" },
            },
            {
              name: t('charts_climate.air_humidity'),
              type: "line",
              data: humidity,
              yAxisIndex: 1,
              lineStyle: { color: "#81B863" },
              showSymbol: false,
            },
          ],
          dataZoom: [
            { type: "inside", throttle: 50 },
            {
              type: "slider",
              show: true,
              bottom: 7,
              height: 10,
              borderColor: "transparent",
              backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#f3f4f6",
              fillerColor: resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
              textStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
              }
            },
          ],
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}
