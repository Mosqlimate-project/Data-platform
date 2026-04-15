"use client";

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

interface ChartProps {
  geocode: string;
  start: string;
  end: string;
}

const IBGE_UF_MAP: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA",
  "16": "AP", "17": "TO", "21": "MA", "22": "PI", "23": "CE",
  "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE",
  "29": "BA", "31": "MG", "32": "ES", "33": "RJ", "35": "SP",
  "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT",
  "52": "GO", "53": "DF"
};

function getUFfromGeocode(geocode: string | null): string | null {
  if (!geocode) return null;

  if (/^\d+$/.test(geocode)) {
    const prefix = geocode.slice(0, 2);
    return IBGE_UF_MAP[prefix] || null;
  }

  if (geocode.length === 2) return geocode.toUpperCase();

  return null;
}

function parseCSV(text: string) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map(line => {
    const values = line.split(",");
    const obj: any = {};
    headers.forEach((h, i) => (obj[h.trim()] = values[i]));
    return obj;
  });
}

function groupBy<T>(data: T[], getKey: (d: T) => string) {
  return data.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function formatWeek(date: Date) {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${temp.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function limitTrapsPerState(data: any[]) {
  const stateTraps = new Map<string, number>();
  const result: any[] = [];

  const shuffled = [...data];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (const item of shuffled) {
    const count = stateTraps.get(item.state_code) || 0;

    if (count < 5) {
      result.push(item);
      stateTraps.set(item.state_code, count + 1);
    }
  }

  return result;
}

const brazilBounds = {
  west: -74.0,
  east: -34.8,
  south: -33.8,
  north: 5.3
};

function isValidCoordinate(lon: number, lat: number) {
  return lon >= brazilBounds.west &&
         lon <= brazilBounds.east &&
         lat >= brazilBounds.south &&
         lat <= brazilBounds.north;
}

export function EggCountChart({ geocode, start, end }: ChartProps) {

  const { resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation('common');

  const mapRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);

  const mapChart = useRef<any>(null);
  const lineChart = useRef<any>(null);
  const barChart = useRef<any>(null);

  const [data, setData] = useState<any[]>([]);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  useEffect(() => {
    if (!geocode) {
      setSelectedState(null);
    } else {
      const uf = getUFfromGeocode(geocode);
      setSelectedState(uf);
    }
  }, [geocode]);

  useEffect(() => {
    async function load() {
      const [csvText, geo] = await Promise.all([
        fetch("/contaovos_data_utf8.csv").then(r => r.text()),
        fetch("/br.geojson").then(r => r.json()),
      ]);

      const parsed = parseCSV(csvText);

      const processed = parsed
        .map((d: any) => {
          let date = null;
          if (d.date_collect) {
            const parts = d.date_collect.split("-");
            if (parts.length === 3) {
              date = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
            }
          }

          return {
            ...d,
            eggs: +d.eggs,
            latitude: +d.latitude,
            longitude: +d.longitude,
            date_collect: date,
          };
        })
        .filter(d => d.date_collect && !isNaN(d.eggs));

      setData(processed);
      setGeoJson(geo);
    }

    load();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    mapChart.current = echarts.init(mapRef.current);
    lineChart.current = echarts.init(line1Ref.current!);
    barChart.current = echarts.init(line2Ref.current!);

    window.addEventListener("resize", () => {
      mapChart.current?.resize();
      lineChart.current?.resize();
      barChart.current?.resize();
    });
  }, []);

  useEffect(() => {
    if (!data.length || !geoJson) return;

    echarts.registerMap("brazil", geoJson);

    let filtered = data;

    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      filtered = filtered.filter(d => d.date_collect >= s && d.date_collect <= e);
    }

    const filteredByState = selectedState
      ? filtered.filter(d => d.state_code === selectedState)
      : filtered;

    const groupedStates = groupBy(filtered, d => d.state_code);

    const mapData = Object.entries(groupedStates).map(([uf, items]) => {
      const eggs = sum(items.map(d => d.eggs));

      const traps = new Set(items.map(d => d.ovitrap_website_id)).size;

      const municipalities = new Set(items.map(d => d.municipality)).size;

      return {
        name: uf,
        value: eggs,
        count: traps,
        municipalities: municipalities,
        itemStyle: uf === selectedState
          ? { borderColor: "#555", borderWidth: 3 }
          : {}
      };
    });

    const uniqueValid = filtered.filter(d =>
      d.longitude &&
      d.latitude &&
      !isNaN(d.longitude) &&
      !isNaN(d.latitude) &&
      isValidCoordinate(d.longitude, d.latitude)
    );

    const limited = limitTrapsPerState(uniqueValid);

    const scatterData = limited.map(d => ({
      name: d.state_code,
      value: [d.longitude, d.latitude],
      id: d.ovitrap_website_id,
      municipality: d.municipality
    }));

    const mapConfig = {
      roam: false,
      zoom: 1.08,
      center: [-55, -15],
      aspectScale: 1.1,
      itemStyle: {
        areaColor: resolvedTheme === "dark" ? "#1f2937" : "#e0e0e0",
        borderColor: resolvedTheme === "dark" ? "#4b5563" : "#333",
        borderWidth: 1
      },
      emphasis: {
        focus: "none",
        itemStyle: {
          borderColor: "#0F646B",
          borderWidth: 1.5,
          areaColor: null
        }
      }
    };

    mapChart.current.clear();

    mapChart.current.setOption({
      title: { text: t('charts_contaovos.eggs_map_title'),
              left: "center",
              top: 3,
              textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
              fontSize: 16,
              fontWeight: "bold"
            } },

      tooltip: {
        trigger: "item",
        backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
        borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
        textStyle: {
          color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
        },
        formatter: (p: any) => {
          if (p.seriesType === "map") {
            return t('charts_contaovos.map_tooltip_state', {
              name: p.name,
              eggs: p.value || 0,
              traps: p.data?.count || 0,
              municipalities: p.data?.municipalities || 0
            });
          }

          if (p.seriesType === "scatter") {
            return t('charts_contaovos.map_tooltip_scatter', {
              id: p.data.id,
              municipality: p.data.municipality,
              state: p.name
            });
          }
        }
      },

      visualMap: {
        min: 0,
        max: Math.max(...mapData.map(d => d.value), 1),
        left: 20,
        bottom: 20,
        calculable: true,
        inRange: {
          color: ["#CEF8FE", "#0F646B"]
        }
      },

      geo: {
        map: "brazil",
        ...mapConfig
      },

      series: [
        {
          type: "map",
          map: "brazil",
          nameProperty: "sigla",
          ...mapConfig,
          data: mapData,
          selectedMode: false,
          itemStyle: {
            borderColor: "#333",
            borderWidth: 0.6
          }
        },
        {
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: 7,
          symbol: "circle",
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 0.6
          },
          data: scatterData
        }
      ]
    });

    mapChart.current.off("click");
    mapChart.current.on("click", (params: any) => {

      setSelectedState(prev =>
        prev === params.name ? null : params.name
      );
    });

    const groupedWeeks = groupBy(filteredByState, d =>
      formatWeek(d.date_collect)
    );

    const density = Object.entries(groupedWeeks)
      .map(([week, items]) => {
        const eggs = sum(items.map(d => d.eggs));
        const traps = new Set(items.map(d => d.ovitrap_website_id)).size;
        return [week, traps ? eggs / traps : 0];
      })
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    
    const hasData = density.length > 0;
    

    lineChart.current.clear();

    const location = selectedState ? `(${selectedState})` : `(${t('charts_contaovos.brazil')})`;

    lineChart.current.setOption({
      title: {
        text: t('charts_contaovos.eggs_density_title', { location }),
        left: "center",
        textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
              fontSize: 16,
              fontWeight: "bold"
            }
      },

      tooltip: hasData ? { 
        trigger: "axis",
        backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
        formatter: (params: any) => {
        const p = params[0];
        const value = p.value;

        return t('charts_contaovos.eggs_density_tooltip', {
          name: p.name,
          value: value.toFixed(2)
        });
      } } : undefined,

      xAxis: {
        type: "category",
        name: t('charts_contaovos.eggs_density_xaxis'),
        nameLocation: "middle",
        nameGap: 30,
        data: hasData ? density.map(d => d[0]) : [],
        axisLabel: { 
          rotate: 45,
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        nameTextStyle: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb"
          }
        }
      },

      yAxis: {
        type: "value",
        name: t('charts_contaovos.eggs_density_yaxis'),
        axisLabel: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        nameTextStyle: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb"
          }
        }
      },

      grid: { left: 40, right: 20, bottom: 90, top: 70 },

      series: hasData
        ? [
            {
              type: "line",
              data: density.map(d => d[1]),
              smooth: true,
              symbol: "none",
              lineStyle: { color: "#81B863", width: 3 },
              itemStyle: { color: "#81B863" }
            }
          ]
        : [],

      graphic: hasData
        ? []
        : [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: t('charts_contaovos.no_data_message'),
                fill: "#888",
                fontSize: 14
              }
            }
          ]
    });

    const groupedPos = groupBy(
      filteredByState,
      d => (selectedState ? d.municipality : d.state_code)
    );

    const positivity = Object.entries(groupedPos).map(([k, items]) => {
      const total = new Set(items.map(d => d.ovitrap_website_id)).size;
      const pos = new Set(
        items.filter(d => d.eggs > 0).map(d => d.ovitrap_website_id)
      ).size;

      return [k, total ? (pos / total) * 100 : 0];
    })
    .sort((a, b) => Number(b[1]) - Number(a[1]));

    const hasBarData = positivity.length > 0;
    const scope = selectedState ? t('charts_contaovos.positivity_scope_city', { state: selectedState }) : t('charts_contaovos.positivity_scope_state');

    barChart.current.clear();

    barChart.current.setOption({
      title: {
        text: t('charts_contaovos.positivity_title', { scope }),
        left: "center",
        textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
              fontSize: 16,
              fontWeight: "bold"
            }
      },

      tooltip: hasBarData ? { 
        trigger: "axis",
        backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: {
              color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827",
            },
        formatter: (params: any) => {
        const p = params[0];
        const value = p.value;

        return t("charts_contaovos.positivity_tooltip", {
          name: p.name,
          value: value.toFixed(2)
          });
        }} : undefined,

      xAxis: {
        type: "category",
        name: selectedState ? t('charts_contaovos.municipality') : t('charts_contaovos.state'),
        nameLocation: "middle",
        nameGap: 60,
        data: hasBarData ? positivity.map(d => d[0]) : [],
        axisLabel: { 
          rotate: 45,
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        nameTextStyle: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        axisLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb"
          }
        }
      },

      yAxis: {
        type: "value",
        name: t('charts_contaovos.positivity_yaxis'),
        axisLabel: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        nameTextStyle: {
          color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"
        },
        splitLine: {
          lineStyle: {
            color: resolvedTheme === "dark" ? "#374151" : "#e5e7eb"
          }
        }
      },
      grid: { left: 40, right: 20, bottom: 90, top: 70 },

      series: hasBarData
        ? [
            {
              type: "bar",
              data: positivity.map(d => d[1]),
              itemStyle: { color: "#A0E27B" }
            }
          ]
        : [],

      graphic: hasBarData
        ? []
        : [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: {
                text: t('charts_contaovos.no_data_message'),
                fill: "#888",
                fontSize: 14
              }
            }
          ]
    });

  }, [data, geoJson, start, end, selectedState, resolvedTheme, i18n.language]);

  return (
    <>
      <div ref={mapRef} style={{ width: "100%", height: 520 }} />
      <div style={{ display: "flex", gap: 10, padding: "0 10px" }}>
        <div ref={line1Ref} style={{ flex: 1, height: 420 }} />
        <div ref={line2Ref} style={{ flex: 1, height: 420 }} />
      </div>
    </>
  );
}
