"use client";

import { useState, useEffect } from "react";
import { useChart } from "../../hooks/useChart";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import * as echarts from "echarts"
import { FRONTEND_SECRET } from "@/lib/env";

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
  attribute?: string;
}

interface IndexSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const VEGETATION_INDICES = [
  { value: 'EVI', label: 'EVI' },
  { value: 'NDVI', label: 'NDVI' },
  { value: 'SAVI', label: 'SAVI' },
  { value: 'NDWI', label: 'NDWI' },
];

export function IndexSelector({ value, onChange }: IndexSelectorProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col gap-1 w-full max-w-[200px]">
      <label className="text-xs font-medium opacity-70">Index</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-1.5 rounded-md border text-sm
          bg-background text-foreground
          focus:outline-none focus:ring-1 focus:ring-primary
          ${resolvedTheme === 'dark' 
            ? 'border-gray-600' 
            : 'border-gray-300'
          }
        `}
      >
        {VEGETATION_INDICES.map((index) => (
          <option key={index.value} value={index.value}>
            {index.label}
          </option>
        ))}
      </select>
    </div>
  );
}

let mapRegistered = false;

async function registerBrazilMap() {
    if (mapRegistered) return;

    try {
        const secret = FRONTEND_SECRET || "";
        const response = await fetch("/api/maps/states", {
            headers: { "x-internal-secret": secret }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load map: ${response.status}`);
        }
        
        const geoJson = await response.json();
        
        echarts.registerMap("brazil", geoJson);
        mapRegistered = true;
        console.log("Map registered successfully");
    } catch (error) {
        console.error("Failed to load Brazil map:", error);
        try {
            const geoJson = await fetch("/br.json").then(r => r.json());
            echarts.registerMap("brazil", geoJson);
            mapRegistered = true;
        } catch (fallbackError) {
            console.error("Fallback map load also failed:", fallbackError);
        }
    }
}

async function getCityName(geocode: string) {
  const res = await fetch(`/api/datastore/cities?geocode=${geocode}`);

  if (!res.ok) return geocode;

  const city = await res.json();

  if (!city.length) return geocode;

  return `${city[0].name} - ${city[0].adm1}`;
}

const MAP_HEIGHT = 450;

function getIndexFullName(attribute: string): string {
  const map: Record<string, string> = {
    'EVI': 'EVI (Enhanced Vegetation Index)',
    'NDVI': 'NDVI (Normalized Difference Vegetation Index)',
    'SAVI': 'SAVI (Soil Adjusted Vegetation Index)',
    'NDWI': 'NDWI (Normalized Difference Water Index)'
  };
  return map[attribute] || attribute;
}

export function VegetationMap({
  geocode,
  start,
  end,
  attribute = "EVI",
}: ChartProps) {

  const { t } = useTranslation("common");
  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (!start || !end) return;

    async function load() {

      await registerBrazilMap();

      setLoading(true);

      try {

        const query = new URLSearchParams({
          start,
          end,
          attribute: attribute,
        });

        console.log(`Fetching map data for attribute: ${attribute}`);

        const res = await fetch(
          `/api/datastore/charts/vegetation/map?${query}`
        );

        const data = await res.json();
        console.log(`Map data for ${attribute}:`, data);

        if (!data || data.length === 0) {
          console.warn(`No data received from API for ${attribute}`);
          setOption(null);
          return;
        }

        const values = data.map((d: any) => d.median);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        console.log(`Min: ${minValue}, Max: ${maxValue}`);

        const mapConfig = {
            roam: false,
            zoom: 1.08,
            center: [-55, -15] as [number, number],
            aspectScale: 1.1,
            itemStyle: {
                areaColor: resolvedTheme === "dark" ? "#1f2937" : "#e0e0e0",
                borderColor: resolvedTheme === "dark" ? "#4b5563" : "#333",
                borderWidth: 1,
            },
        };

        setOption({
          title: {
            text: `Mediana do ${attribute} por estado`,
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#fff" : "#000",
              fontSize: 16,
              fontWeight: "bold"
            },
          },

          tooltip: {
            trigger: "item",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
            formatter: (params: any) => {
              if (!params.data || params.data.value === undefined) {
                return `${params.name}: Sem dados`;
              }
              return `${params.name}: ${params.data.value.toFixed(4)}`;
            }
          },

          visualMap: {
            min: minValue,
            max: maxValue,
            calculable: true,
            left: 20,
            inRange: {
              color: ["#A0E27B", "#486936"]
            },
            textStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
            },
          },

          series: [
            {
              type: "map",
              map: "brazil",
              roam: false,
              zoom: 1.08,
              center: [-55, -15],
              aspectScale: 1.1,
              nameProperty: "sigla",
              data: data.map((d: any) => ({
                name: d.name,
                value: d.median,
              })),
              itemStyle: {
                areaColor: resolvedTheme === "dark" ? "#1f2937" : "#e0e0e0",
                borderColor: resolvedTheme === "dark" ? "#4b5563" : "#333",
                borderWidth: 1,
              },
              emphasis: {
                label: {
                  show: true,
                  color: resolvedTheme === "dark" ? "#fff" : "#000",
                },
                itemStyle: {
                  areaColor: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
                }
              },
            },
          ],
        });

      } catch (error) {
        console.error(`Error loading vegetation map for ${attribute}:`, error);
        setOption(null);
      } finally {

        setLoading(false);

      }

    }

    load();

  }, [start, end, resolvedTheme, attribute]); 

  const chartRef = useChart(option, loading);

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: MAP_HEIGHT,
      }}
    />
  );
}

export function VegetationIQRMap({
  geocode,
  start,
  end,
  attribute = "EVI",
}: ChartProps) {

  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {

    if (!start || !end) return;

    async function load() {

      await registerBrazilMap();

      setLoading(true);

      try {

        const query = new URLSearchParams({
          start,
          end,
          attribute: attribute,
        });

        console.log(`Fetching IQR data for attribute: ${attribute}`);

        const res = await fetch(
          `/api/datastore/charts/vegetation/map?${query}`
        );

        const data = await res.json();

        if (!data || data.length === 0) {
          console.warn(`No data received from API for ${attribute}`);
          setOption(null);
          return;
        }

        const values = data.map((d: any) => d.iqr);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);

        setOption({
          title: {
            text: `Amplitude interquartil (Q75 − Q25) - ${attribute}`,
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#fff" : "#000",
              fontSize: 16,
              fontWeight: "bold"
            },
          },

          tooltip: {
            trigger: "item",
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
            formatter: (params: any) => {
              if (!params.data || params.data.value === undefined) {
                return `${params.name}: Sem dados`;
              }
              return `${params.name}: ${params.data.value.toFixed(4)}`;
            }
          },

          visualMap: {
            min: minValue,
            max: maxValue,
            calculable: true,
            left: 20,
            inRange: {
              color: ["#D9FACB", "#81B863"]
            },
            textStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
            },
          },

          series: [
            {
              type: "map",
              map: "brazil",
              roam: false,
              zoom: 1.08,
              center: [-55, -15],
              aspectScale: 1.1,
              nameProperty: "sigla",
              data: data.map((d: any) => ({
                name: d.name,
                value: d.iqr,
              })),
              itemStyle: {
                areaColor: resolvedTheme === "dark" ? "#1f2937" : "#e0e0e0",
                borderColor: resolvedTheme === "dark" ? "#4b5563" : "#333",
                borderWidth: 1,
              },
              emphasis: {
                label: {
                  show: true,
                  color: resolvedTheme === "dark" ? "#fff" : "#000",
                },
                itemStyle: {
                  areaColor: resolvedTheme === "dark" ? "#374151" : "#d1d5db",
                }
              },
            },
          ],
        });

      } catch (error) {
        console.error(`Error loading IQR map for ${attribute}:`, error);
        setOption(null);
      } finally {

        setLoading(false);

      }

    }

    load();

  }, [start, end, resolvedTheme, attribute]);

  const chartRef = useChart(option, loading);

  return (

    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: MAP_HEIGHT,
      }}
    />

  );

}

export function VegetationTimeSeries({
  geocode,
  start,
  end,
  attribute = "EVI",
}: ChartProps) {
  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!geocode || !start || !end) return;

    async function load() {
      setLoading(true);

      try {
        const city = await getCityName(geocode);

        const query = new URLSearchParams({
          geocode,
          start,
          end,
          attribute: attribute,
        });

        console.log(`Fetching time series data for attribute: ${attribute}`);

        const res = await fetch(
          `/api/datastore/charts/vegetation/time-series/?${query}`
        );

        const data = await res.json();
        console.log(`TIMESERIES for ${attribute}:`, data);

        if (!data || data.length === 0) {
          console.warn(`No time series data received for ${attribute}`);
          setOption(null);
          return;
        }

        const dates = data.map((d: any) => d.date);
        const median = data.map((d: any) => d.median);
        const q25 = data.map((d: any) => d.q25);
        const q75 = data.map((d: any) => d.q75);

        setOption({
          title: {
            text: `Série temporal do ${getIndexFullName(attribute)} - ${city}`,
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#fff" : "#000",
              fontSize: 16,
              fontWeight: "bold"
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
              const q25Point = params.find((p: any) => p.seriesName === "Q25");
              const medianPoint = params.find((p: any) => p.seriesName === "Mediana");
              const q75Point = params.find((p: any) => p.seriesName === "Q75");
              
              if (medianPoint) {
                return `
                  <strong>${medianPoint.axisValue}</strong><br/>
                  Q25: ${q25Point?.value?.toFixed(4) || 'N/A'}<br/>
                  Mediana: ${medianPoint.value?.toFixed(4) || 'N/A'}<br/>
                  Q75: ${q75Point?.value?.toFixed(4) || 'N/A'}
                `;
              }
              return '';
            }
          },

          legend: {
            top: 35,
            data: [
              { 
                name: "Q25", 
                icon: "line",
                textStyle: { 
                  color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
                  fontSize: 12
                }
              },
              { 
                name: "Mediana", 
                icon: "line",
                textStyle: { 
                  color: resolvedTheme === "dark" ? "#fff" : "#000",
                  fontWeight: "bold",
                  fontSize: 12
                }
              },
              { 
                name: "Q75", 
                icon: "line",
                textStyle: { 
                  color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
                  fontSize: 12
                }
              }
            ],
          },

          grid: {
            left: "4%",
            right: "4%",
            top: 90,
            bottom: 70,
            containLabel: true,
          },

          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
              rotate: 30,
            },
            axisLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              }
            }
          },

          yAxis: {
            type: "value",
            name: attribute,
            axisLabel: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
            },
            nameTextStyle: {
              color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
            },
            splitLine: {
              lineStyle: {
                color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              }
            }
          },

          series: [
            {
              name: "Q25",
              type: "line",
              data: q25,
              showSymbol: false,
              smooth: true,
              lineStyle: {
                color: "#41BAC5",
                width: 1.5,
                type: "dashed",
                opacity: 0.5,
              },
              itemStyle: { 
                color: "#41BAC5",
                opacity: 0.5,
              },
              z: 1,
            },

            {
              name: "Mediana",
              type: "line",
              data: median,
              showSymbol: false,
              smooth: true,
              lineStyle: {
                color: "#6179B2",
                width: 3,
              },
              itemStyle: { 
                color: "#6179B2",
              },
              z: 2,
            },

            {
              name: "Q75",
              type: "line",
              data: q75,
              showSymbol: false,
              smooth: true,
              lineStyle: {
                color: "#41BAC5",
                width: 1.5,
                type: "dashed",
                opacity: 0.5,
              },
              itemStyle: { 
                color: "#41BAC5",
                opacity: 0.5,
              },
              z: 1,
            },
          ],

          dataZoom: [
            {
              type: "inside",
            },
            {
              type: "slider",
              bottom: 10,
              borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
              textStyle: {
                color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280",
              },
            },
          ],
        });
      } catch (error) {
        console.error(`Error loading time series for ${attribute}:`, error);
        setOption(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [geocode, start, end, resolvedTheme, attribute]);

  const chartRef = useChart(option, loading);

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: 500,
      }}
    />
  );
}