"use client";

import { useState, useEffect } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { FRONTEND_SECRET } from "@/lib/env";
import { useChart } from "../../hooks/useChart";

interface ChartProps {
  geocode?: string;
  uf?: string;
  start: string;
  end: string;
}

interface PositivityProps {
  uf?: string;
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

function getUFfromGeocode(geocode: string | null | undefined): string | null {
  if (!geocode) return null;

  if (/^\d+$/.test(geocode)) {
    const prefix = geocode.slice(0, 2);
    return IBGE_UF_MAP[prefix] || null;
  }

  if (geocode.length === 2) return geocode.toUpperCase();

  return null;
}

const headers = {
  "Content-Type": "application/json",
  "x-internal-secret": FRONTEND_SECRET || "",
};

export function EggsDensityChart({ geocode, uf, start, end }: ChartProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!start || !end) return;
    setLoading(true);

    const params = new URLSearchParams({ start, end });
    if (uf) {
      params.set("uf", uf);
    } else if (geocode) {
      params.set("geocode", geocode);
    }

    fetch(`/api/datastore/charts/contaovos/eggs-density/?${params}`, { headers })
      .then((res) => res.json())
      .then((data: { epiweek: string; total_eggs: number }[]) => {
        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const location = uf ? `(${uf})` : geocode ? `(${getUFfromGeocode(geocode) || geocode})` : `(${t('charts_contaovos.brazil')})`;
        setOption({
          title: {
            text: t('charts_contaovos.eggs_density_title', { location }),
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
              fontSize: 16,
              fontWeight: "bold"
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
              const p = params[0];
              return t('charts_contaovos.eggs_density_tooltip', {
                name: p.name,
                value: p.value
              });
            }
          },
          xAxis: {
            type: "category",
            name: t('charts_contaovos.eggs_density_xaxis'),
            nameLocation: "middle",
            nameGap: 30,
            data: data.map(d => d.epiweek),
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
          series: [
            {
              type: "line",
              data: data.map(d => d.total_eggs),
              smooth: true,
              symbol: "none",
              lineStyle: { color: "#81B863", width: 3 },
              itemStyle: { color: "#81B863" },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(129, 184, 99, 0.3)" },
                  { offset: 1, color: "rgba(129, 184, 99, 0.0)" },
                ]),
              },
            }
          ],
        });
      })
      .catch((err) => {
        console.error(err);
        setOption(null);
      })
      .finally(() => setLoading(false));
  }, [geocode, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);

  return (
    <div className="w-full overflow-hidden">
      {!loading && !option ? (
        <div className="h-[350px] flex items-center justify-center text-secondary opacity-60 text-sm">
          {t('charts_contaovos.no_data_message')}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "420px", minWidth: "0" }} />
      )}
    </div>
  );
}

export function PositivityChart({ uf, start, end }: PositivityProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!start || !end) return;
    setLoading(true);

    const params = new URLSearchParams({ start, end });
    if (uf) params.set("uf", uf);

    fetch(`/api/datastore/charts/contaovos/positivity/?${params}`, { headers })
      .then((res) => res.json())
      .then((data: { name: string; positivity: number }[]) => {
        if (!data || data.length === 0) {
          setOption(null);
          return;
        }

        const scope = uf ? t('charts_contaovos.positivity_scope_city', { state: uf }) : t('charts_contaovos.positivity_scope_state');

        setOption({
          title: {
            text: t('charts_contaovos.positivity_title', { scope }),
            left: "center",
            textStyle: {
              color: resolvedTheme === "dark" ? "#ffffff" : "#000000",
              fontSize: 16,
              fontWeight: "bold"
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
              const p = params[0];
              return t("charts_contaovos.positivity_tooltip", {
                name: p.name,
                value: p.value.toFixed(2)
              });
            }
          },
          xAxis: {
            type: "category",
            name: uf ? t('charts_contaovos.municipality') : t('charts_contaovos.state'),
            nameLocation: "middle",
            nameGap: 60,
            data: data.map(d => d.name),
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
          series: [
            {
              type: "bar",
              data: data.map(d => d.positivity),
              itemStyle: { color: "#A0E27B" }
            }
          ],
        });
      })
      .catch((err) => {
        console.error(err);
        setOption(null);
      })
      .finally(() => setLoading(false));
  }, [uf, start, end, t, resolvedTheme]);

  const chartRef = useChart(option, loading);

  return (
    <div className="w-full overflow-hidden">
      {!loading && !option ? (
        <div className="h-[350px] flex items-center justify-center text-secondary opacity-60 text-sm">
          {t('charts_contaovos.no_data_message')}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "420px", minWidth: "0" }} />
      )}
    </div>
  );
}

interface MapProps {
  start: string;
  end: string;
  geoJson?: any;
  selectedState?: string | null;
  onStateSelect?: (state: string | null) => void;
}

function limitTrapsPerState(data: any[], maxPerState = 5) {
  const stateCount = new Map<string, number>();
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  return shuffled.filter((item) => {
    const count = stateCount.get(item.name) || 0;
    if (count < maxPerState) {
      stateCount.set(item.name, count + 1);
      return true;
    }
    return false;
  });
}

export function MapChart({ start, end, geoJson, selectedState, onStateSelect }: MapProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();
  const [option, setOption] = useState<echarts.EChartsOption | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useChart(option, loading);

  useEffect(() => {
    if (!geoJson) return;
    echarts.registerMap("brazil", geoJson);
  }, [geoJson]);

  useEffect(() => {
    if (!chartRef.current) return;
    const instance = echarts.getInstanceByDom(chartRef.current);
    if (!instance || !onStateSelect) return;
    instance.off("click");
    instance.on("click", (params: any) => {
      if (params.componentType === "series" && params.name) {
        onStateSelect(params.name === selectedState ? null : params.name);
      }
    });
  }, [option, loading, selectedState, onStateSelect]);

  useEffect(() => {
    if (!start || !end || !geoJson) return;
    setLoading(true);

    const params = new URLSearchParams({ start, end });

    fetch(`/api/datastore/charts/contaovos/map/?${params}`, { headers })
      .then((res) => res.json())
      .then((data: { states: any[]; scatter: any[] }) => {
        if (!data || !data.states || data.states.length === 0) {
          setOption(null);
          return;
        }

        const mapConfig = {
          roam: false, zoom: 1.08, center: [-55, -15] as [number, number], aspectScale: 1.1,
          itemStyle: {
            areaColor: resolvedTheme === "dark" ? "#1f2937" : "#e0e0e0",
            borderColor: resolvedTheme === "dark" ? "#4b5563" : "#333",
            borderWidth: 1,
          },
        };

        const mapSeriesData = data.states.map((s: any) => ({
          name: s.name,
          value: s.total_eggs,
          trap_count: s.trap_count,
          municipalities: s.municipality_count,
          itemStyle: s.name === selectedState ? { borderColor: "#555", borderWidth: 3 } : {},
        }));

        const scatterData = limitTrapsPerState(data.scatter, 5).map((s: any) => ({
          name: s.name,
          value: [s.longitude, s.latitude] as [number, number],
          id: s.trap_id,
          municipality: s.municipality,
        }));

        setOption({
          title: {
            text: t('charts_contaovos.eggs_map_title'),
            left: "center",
            textStyle: { color: resolvedTheme === "dark" ? "#fff" : "#000", fontSize: 16, fontWeight: "bold" },
          },
          visualMap: {
            min: 0,
            max: Math.max(...data.states.map((s: any) => s.total_eggs), 1),
            left: 20,
            calculable: true,
            inRange: { color: ["#CEF8FE", "#0F646B"] },
            textStyle: { color: resolvedTheme === "dark" ? "#9ca3af" : "#6b7280" },
          },
          tooltip: {
            formatter: (params: any) => {
              if (params.seriesType === "map") {
                const d = data.states.find((s: any) => s.name === params.name);
                return d
                  ? t('charts_contaovos.map_tooltip_state', {
                      name: d.name,
                      eggs: d.total_eggs,
                      traps: d.trap_count,
                      municipalities: d.municipality_count,
                    })
                  : "";
              }
              if (params.seriesType === "scatter") {
                const d = data.scatter.find((s: any) => s.trap_id === params.data.id);
                return d
                  ? t('charts_contaovos.map_tooltip_scatter', {
                      id: d.trap_id,
                      municipality: d.municipality,
                      state: d.name,
                    })
                  : "";
              }
              return "";
            },
            backgroundColor: resolvedTheme === "dark" ? "#1f2937" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#374151" : "#e5e7eb",
            textStyle: { color: resolvedTheme === "dark" ? "#f3f4f6" : "#111827" },
          },
          geo: { map: "brazil", ...mapConfig },
          series: [
            {
              type: "map", map: "brazil", nameProperty: "sigla",
              ...mapConfig,
              data: mapSeriesData,
            },
            {
              type: "scatter", coordinateSystem: "geo",
              symbolSize: 7,
              data: scatterData,
              zlevel: 1,
            },
          ],
        });
      })
      .catch((err) => {
        console.error(err);
        setOption(null);
      })
      .finally(() => setLoading(false));
  }, [start, end, geoJson, selectedState, t, resolvedTheme]);

  return (
    <div className="w-full overflow-hidden">
      {!loading && !option ? (
        <div className="h-[400px] flex items-center justify-center text-secondary opacity-60 text-sm">
          {t('charts_contaovos.no_data_message')}
        </div>
      ) : (
        <div ref={chartRef} style={{ width: "100%", height: "520px", minWidth: "0" }} />
      )}
    </div>
  );
}

export function EggCountChart({ geocode, start, end, geoJson, onGeocodeClear }: {
  geocode?: string;
  start: string;
  end: string;
  geoJson?: any;
  onGeocodeClear?: () => void;
}) {
  const uf = getUFfromGeocode(geocode);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const handleStateSelect = (state: string | null) => {
    if (state === null && selectedState !== null) {
      onGeocodeClear?.();
    }
    setSelectedState(state);
  };

  const activeUf = selectedState || uf || undefined;
  const activeGeocode = selectedState ? undefined : geocode;

  return (
    <div className="flex flex-col gap-6 w-full">
      <MapChart
        start={start}
        end={end}
        geoJson={geoJson}
        selectedState={selectedState}
        onStateSelect={handleStateSelect}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <EggsDensityChart geocode={activeGeocode} uf={activeUf} start={start} end={end} />
        <PositivityChart uf={activeUf} start={start} end={end} />
      </div>
    </div>
  );
}
