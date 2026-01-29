"use client";

import { useState, useEffect } from "react";
import { useChart } from "../../hooks/useChart";

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
}

export function AccumulatedWaterfallChart({ geocode, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/municipality/accumulated-waterfall/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error("Failed to load data");

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

        const objDates = data.map((d: any) => new Date(d.date)).sort((a: any, b: any) => a.getTime() - b.getTime());
        const diffWeeks = objDates.length > 1
          ? (objDates[objDates.length - 1].getTime() - objDates[0].getTime()) / (1000 * 60 * 60 * 24 * 7)
          : 0;
        const showMonth = diffWeeks > 6;

        setOption({
          title: {
            text: `Daily Precipitation - ${locationTitle}`,
            left: "center",
          },
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
          legend: {
            data: ["Total Precipitation", "Average Precipitation"],
            top: 40
          },
          grid: {
            left: '3%',
            right: '3%',
            bottom: 40,
            top: 60,
            containLabel: true
          },
          xAxis: {
            name: showMonth ? "Month" : "Epidemiological Week",
            nameLocation: "middle",
            nameGap: 30,
            nameTextStyle: { fontSize: 12, fontWeight: "bold" },
            type: "category",
            data: dates,
            axisLabel: {
              interval: 0,
              formatter: (value: string, index: number) => {
                if (showMonth) {
                  const month = new Date(value + "T00:00:00").toLocaleString("en-US", { month: "short" });
                  const prevMonth = index > 0
                    ? new Date(dates[index - 1] + "T00:00:00").toLocaleString("en-US", { month: "short" })
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
              fontSize: 11,
              margin: 12,
            },
          },
          yAxis: {
            name: "Precipitation (mm)",
            nameLocation: "middle",
            nameGap: 40,
            nameTextStyle: { fontSize: 12, fontWeight: "bold" },
            type: "value",
            splitNumber: 4,
          },
          series: [
            {
              name: "Average Precipitation",
              type: "bar",
              data: meanPrecip,
              barWidth: "100%",
              stack: "two",
              itemStyle: { color: "#2FDDEC" },
            },
            {
              name: "Total Precipitation",
              type: "bar",
              data: totalPrecip,
              barWidth: "100%",
              stack: "two",
              itemStyle: { color: "#0F646B" },
            },
          ],
          dataZoom: [
            { type: "inside", throttle: 50 },
            { type: "slider", show: true, bottom: 5, height: 15 },
          ],
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "400px" }} />;
}

export function TemperatureChart({ geocode, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/municipality/temperature/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error("Failed to load data");

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
        });

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}

export function AirChart({ geocode, start, end }: ChartProps) {
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;
    setLoading(true);

    const query = new URLSearchParams({ geocode, start, end });

    async function load() {
      try {
        const [chartRes, cityRes] = await Promise.all([
          fetch(`/api/datastore/charts/municipality/umid-pressao-med/?${query}`),
          fetch(`/api/datastore/cities?geocode=${geocode}`)
        ]);

        if (!chartRes.ok) throw new Error("Failed to load data");

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
        });
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [geocode, start, end]);

  const chartRef = useChart(option, loading);
  return <div ref={chartRef} style={{ width: "100%", height: "500px" }} />;
}
