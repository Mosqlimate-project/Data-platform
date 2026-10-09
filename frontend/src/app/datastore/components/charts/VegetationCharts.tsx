"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useChart } from "../../hooks/useChart";
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
  {
    value: "EVI",
    label: "charts_vegetation_index.vegetation_index.evi.label",
    description: "charts_vegetation_index.vegetation_index.evi.description",
  },
  {
    value: "NDVI",
    label: "charts_vegetation_index.vegetation_index.ndvi.label",
    description: "charts_vegetation_index.vegetation_index.ndvi.description",
  },
  {
    value: "SAVI",
    label: "charts_vegetation_index.vegetation_index.savi.label",
    description: "charts_vegetation_index.vegetation_index.savi.description",
  },
  {
    value: "NDWI",
    label: "charts_vegetation_index.vegetation_index.ndwi.label",
    description: "charts_vegetation_index.vegetation_index.ndwi.description",
  },
];

const MAP_HEIGHT = 450;

const STATE_CAPITALS: Record<
  string,
  {
    geocode: string;
    name: string;
  }
> = {
  AC: { geocode: "1200401", name: "Rio Branco" },
  AL: { geocode: "2704302", name: "Maceió" },
  AP: { geocode: "1600303", name: "Macapá" },
  AM: { geocode: "1302603", name: "Manaus" },
  BA: { geocode: "2927408", name: "Salvador" },
  CE: { geocode: "2304400", name: "Fortaleza" },
  DF: { geocode: "5300108", name: "Brasília" },
  ES: { geocode: "3205309", name: "Vitória" },
  GO: { geocode: "5208707", name: "Goiânia" },
  MA: { geocode: "2111300", name: "São Luís" },
  MT: { geocode: "5103403", name: "Cuiabá" },
  MS: { geocode: "5002704", name: "Campo Grande" },
  MG: { geocode: "3106200", name: "Belo Horizonte" },
  PA: { geocode: "1501402", name: "Belém" },
  PB: { geocode: "2507507", name: "João Pessoa" },
  PR: { geocode: "4106902", name: "Curitiba" },
  PE: { geocode: "2611606", name: "Recife" },
  PI: { geocode: "2211001", name: "Teresina" },
  RJ: { geocode: "3304557", name: "Rio de Janeiro" },
  RN: { geocode: "2408102", name: "Natal" },
  RS: { geocode: "4314902", name: "Porto Alegre" },
  RO: { geocode: "1100205", name: "Porto Velho" },
  RR: { geocode: "1400100", name: "Boa Vista" },
  SC: { geocode: "4205407", name: "Florianópolis" },
  SP: { geocode: "3550308", name: "São Paulo" },
  SE: { geocode: "2800308", name: "Aracaju" },
  TO: { geocode: "1721000", name: "Palmas" },
};

let brazilMapRegistered = false;

const stateMaps: Record<string, any> = {};

const stateBounds: Record<
  string,
  {
    minLon: number;
    maxLon: number;
    minLat: number;
    maxLat: number;
    center: [number, number];
    width: number;
    height: number;
  }
> = {};

export function IndexSelector({
  value,
  onChange,
}: IndexSelectorProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedLabel =
    VEGETATION_INDICES.find(
      (index) => index.value === value
    )?.label || value;

  return (
    <div className="flex flex-col gap-1 w-full max-w-[300px]">
      <label className="text-xs font-medium opacity-70">
        {t('charts_vegetation_index.vegetation_index.title')}
      </label>

      <div ref={selectorRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2 rounded-md border text-sm text-left
            ${
              resolvedTheme === "dark"
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-gray-300"
            }
            text-foreground
            focus:outline-none focus:ring-1 focus:ring-primary
            flex items-center justify-between
            transition-colors
          `}
        >
          <span className="font-medium">
            {selectedLabel ? t(selectedLabel) : value}
          </span>

          <svg
            className={`w-4 h-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div
            className={`
              absolute z-[9999] w-full mt-1 rounded-md shadow-lg
              border max-h-80 overflow-y-auto
              ${
                resolvedTheme === "dark"
                  ? "border-gray-600 bg-gray-800"
                  : "border-gray-200 bg-white"
              }
            `}
          >
            {VEGETATION_INDICES.map((index) => (
              <div
                key={index.value}
                className={`
                  px-3 py-2 cursor-pointer
                  transition-colors duration-150
                  ${
                    resolvedTheme === "dark"
                      ? "hover:bg-gray-700"
                      : "hover:bg-gray-100"
                  }
                  ${
                    value === index.value
                      ? resolvedTheme === "dark"
                        ? "bg-gray-700 border-l-4 border-primary"
                        : "bg-gray-200 border-l-4 border-primary"
                      : "border-l-4 border-transparent"
                  }
                `}
                onClick={() => {
                  onChange(index.value);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium text-sm">
                  {t(index.label)}
                </div>

                <div className="text-xs opacity-70 mt-0.5 leading-relaxed">
                  {t(index.description)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function calculateBounds(geoJson: any) {
  try {
    const allCoords: [number, number][] = [];

    function extractCoords(coords: any) {
      if (!coords) return;

      if (
        typeof coords[0] === "number" &&
        typeof coords[1] === "number"
      ) {
        allCoords.push([
          coords[0],
          coords[1],
        ]);
      } else if (Array.isArray(coords)) {
        for (const item of coords) {
          extractCoords(item);
        }
      }
    }

    if (geoJson.features) {
      for (const feature of geoJson.features) {
        if (
          feature.geometry &&
          feature.geometry.coordinates
        ) {
          extractCoords(
            feature.geometry.coordinates
          );
        }
      }
    }

    if (allCoords.length === 0) {
      throw new Error(
        "No coordinates found"
      );
    }

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of allCoords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    return {
      minLon,
      maxLon,
      minLat,
      maxLat,
      center: [
        (minLon + maxLon) / 2,
        (minLat + maxLat) / 2,
      ] as [number, number],
      width: maxLon - minLon,
      height: maxLat - minLat,
    };

  } catch (error) {
    console.error(
      "Error calculating bounds:",
      error
    );

    return {
      minLon: -74,
      maxLon: -34,
      minLat: -34,
      maxLat: 5,
      center: [-54, -14.5] as [number, number],
      width: 40,
      height: 39,
    };
  }
}


async function registerBrazilMap() {
  if (brazilMapRegistered) return;

  try {
    const response = await fetch(
      "/api/maps/states",
      {
        headers: {
          "x-internal-secret":
            FRONTEND_SECRET || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load map: ${response.status}`
      );
    }

    const geoJson =
      await response.json();

    echarts.registerMap(
      "brazil",
      geoJson
    );

    brazilMapRegistered = true;

  } catch (error) {
    console.error(
      "Failed to load Brazil map:",
      error
    );
  }
}


async function loadStateMap(stateCode: string) {
  try {
    const mapName = `state_${stateCode}`;

    if (stateMaps[stateCode]) {
      if (!echarts.getMap(mapName)) {
        echarts.registerMap(
          mapName,
          stateMaps[stateCode]
        );
      }

      return stateMaps[stateCode];
    }

    const response = await fetch(
      `/api/maps/cities?uf=${stateCode.toLowerCase()}`,
      {
        headers: {
          "x-internal-secret": FRONTEND_SECRET || "",
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load state map: ${response.status}`
      );
    }

    const geoJson = await response.json();

    stateMaps[stateCode] = geoJson;

    stateBounds[stateCode] = calculateBounds(geoJson);

    echarts.registerMap(mapName, geoJson);

    console.log(`State map registered: ${mapName}`);

    return geoJson;

  } catch (error) {
    console.error(
      `Error loading state map for ${stateCode}:`,
      error
    );

    return null;
  }
}


async function getCityName(
  geocode: string
) {
  try {
    const response = await fetch(
      `/api/datastore/cities?geocode=${geocode}`
    );

    if (!response.ok) {
      return geocode;
    }

    const city =
      await response.json();

    if (!city?.length) {
      return geocode;
    }

    return `${city[0].name} - ${city[0].adm1}`;

  } catch {
    return geocode;
  }
}


async function fetchMunicipalData(
  stateCode: string,
  start: string,
  end: string,
  attribute: string
) {
  try {
    const query =
      new URLSearchParams({
        start,
        end,
        attribute,
        uf: stateCode,
      });

    const response = await fetch(
      `/api/datastore/charts/vegetation/municipal-map?${query}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch municipal data: ${response.status}`
      );
    }

    const data =
      await response.json();

    if (Array.isArray(data)) {
      const filtered = data.filter(
        (item: any) =>
          item.uf === stateCode ||
          item.state === stateCode ||
          item.adm1 === stateCode
      );

      return filtered.length > 0
        ? filtered
        : data;
    }

    return data;

  } catch (error) {
    console.error(
      `Error fetching municipal data for ${stateCode}:`,
      error
    );

    return null;
  }
}


function getIndexFullName(
  attribute: string
): string {
  const indices: Record<
    string,
    string
  > = {
    EVI: "EVI (Enhanced Vegetation Index)",
    NDVI: "NDVI (Normalized Difference Vegetation Index)",
    SAVI: "SAVI (Soil Adjusted Vegetation Index)",
    NDWI: "NDWI (Normalized Difference Water Index)",
  };

  return (
    indices[attribute] || attribute
  );
}

interface VegetationMapProps
  extends ChartProps {
  selectedState?: string;
  onStateSelect?: (
    stateCode: string
  ) => void;
}


export function VegetationMap({start, end, attribute = "EVI", selectedState, onStateSelect,}: VegetationMapProps) {

  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();

  const [
    mapData,
    setMapData,
  ] = useState<any[] | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const option =
    useMemo<echarts.EChartsOption | null>(
      () => {

        if (
          !Array.isArray(mapData) ||
          mapData.length === 0
        ) {
          return null;
        }

        const values =
          mapData.map(
            (item: any) =>
              item.median
          );

        const minValue =
          Math.min(...values);

        const maxValue =
          Math.max(...values);

        const seriesData =
          mapData.map(
            (item: any) => {
              
          const isSelected =
            item.name === selectedState;

          return {
            name: item.name,
            value: item.median,

            itemStyle: {
              areaColor:
                resolvedTheme === "dark"
                  ? "#1f2937"
                  : "#e0e0e0",

              borderColor:
                isSelected
                  ? "#16240E"
                  : resolvedTheme === "dark"
                    ? "#4b5563"
                    : "#333",

              borderWidth:
                isSelected
                  ? 3
                  : 0.6,
            },

            label: isSelected
              ? {
                  show: true,

                  color:
                    resolvedTheme === "dark"
                      ? "#fff"
                      : "#000",

                  fontWeight: "bold" as const,

                  fontSize: 12,
                }
              : undefined,
          };
        });

        return {
          title: {
            text: t('charts_vegetation_index.map_title', { attribute }),
            left: "center",
            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#ffffff"
                  : "#000000",
              fontSize: 16,
              fontWeight: "bold",
            },
          },


          tooltip: {
            trigger: "item",

            backgroundColor:
              resolvedTheme === "dark"
                ? "#1f2937"
                : "#ffffff",

            borderColor:
              resolvedTheme === "dark"
                ? "#374151"
                : "#e5e7eb",

            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#f3f4f6"
                  : "#111827",
            },

            formatter: (
              params: any
            ) => {
              if (
                !params.data ||
                params.data.value === undefined
              ) {
                return t('charts_vegetation_index.no_data_message');
              }

              return `
                ${params.name}:
                ${params.data.value.toFixed(4)}
              `;
            },
          },


          visualMap: {
            min: minValue,
            max: maxValue,
            calculable: true,
            left: 20,

            formatter: (value) => typeof value === "number" ? value.toFixed(2) : String(value ?? ""),
            inRange: {
              color: [
                "#D9FACB",
                "#648F4C",
              ],
            },

            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#9ca3af"
                  : "#6b7280",
            },
          },


          geo: {
            map: "brazil",

            roam: false,

            zoom: 1.08,

            center: [
              -55,
              -15,
            ] as [number, number],

            aspectScale: 1.1,

            itemStyle: {
              areaColor:
                resolvedTheme === "dark"
                  ? "#1f2937"
                  : "#e0e0e0",

              borderColor:
                resolvedTheme === "dark"
                  ? "#4b5563"
                  : "#333333",

              borderWidth: 0.6,
            },
          },


          series: [
            {
              type: "map",

              map: "brazil",

              nameProperty: "sigla",

              roam: false,

              zoom: 1.08,

              center: [
                -55,
                -15,
              ],

              aspectScale: 1.1,

              data: seriesData,

              itemStyle: {
                areaColor:
                  resolvedTheme === "dark"
                    ? "#1f2937"
                    : "#e0e0e0",

                borderColor:
                  resolvedTheme === "dark"
                    ? "#4b5563"
                    : "#333333",

                borderWidth: 0.6,
              },

              emphasis: {
                label: {
                  show: true,

                  color:
                    resolvedTheme === "dark"
                      ? "#ffffff"
                      : "#000000",
                },

                itemStyle: {
                  areaColor:
                    resolvedTheme === "dark"
                      ? "#374151"
                      : "#d1d5db",
                },
              },

              cursor: "pointer",
            },
          ],
        };

      },
      [
        mapData,
        selectedState,
        attribute,
        resolvedTheme,
        t
      ]
    );

  const chartRef =
    useChart(option, loading);

  useEffect(() => {
    registerBrazilMap();
  }, []);

  useEffect(() => {

    if (!chartRef.current) return;

    const instance =
      echarts.getInstanceByDom(
        chartRef.current
      );

    if (
      !instance ||
      !onStateSelect
    ) {
      return;
    }

    instance.off("click");

    instance.on(
      "click",
      (params: any) => {

        if (
          params.componentType ===
            "series" &&
          params.name
        ) {
          onStateSelect(
            params.name
          );
        }
      }
    );

  }, [
    option,
    loading,
    selectedState,
    onStateSelect,
    chartRef,
  ]);

  useEffect(() => {

    if (!start || !end) return;

    let cancelled = false;

    setLoading(true);
    setMapData(null);

    const query =
      new URLSearchParams({
        start,
        end,
        attribute,
      });

    fetch(
      `/api/datastore/charts/vegetation/map?${query}`
    )
      .then((response) => {

        if (!response.ok) {
          throw new Error(
            t('charts_vegetation_index.load_map_error', {status: response.status})
          );
        }

        return response.json();
      })

      .then((data) => {

        if (cancelled) return;

        if (
          !data ||
          data.length === 0
        ) {
          setMapData(null);
          return;
        }

        setMapData(data);
      })

      .catch((error) => {

        if (cancelled) return;

        console.error(error);

        setMapData(null);
      })

      .finally(() => {

        if (!cancelled) {
          setLoading(false);
        }
      });


    return () => {
      cancelled = true;
    };

  }, [
    start,
    end,
    resolvedTheme,
    attribute,
    selectedState,
    onStateSelect
  ]);


  return (
    <div className="w-full overflow-hidden relative">
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: `${MAP_HEIGHT}px`,
          minWidth: "0",
        }}
      />

      {!loading && !option && (
        <div
          className="absolute inset-0 flex items-center justify-center text-secondary opacity-60 text-sm bg-background/80">
          {t('charts_vegetation_index.no_data_message')}
        </div>
      )}
    </div>
  );
}

interface VegetationMunicipalMapProps
  extends ChartProps {
  selectedState?: string;
  selectedCityGeocode?: string;

  onCitySelect?: (
    geocode: string,
    cityName: string
  ) => void;
}


export function VegetationMunicipalMap({
  geocode,
  start,
  end,
  attribute = "EVI",
  selectedState = "RJ",
  selectedCityGeocode,
  onCitySelect
}: ChartProps & {
  selectedState?: string;
  selectedCityGeocode?: string;
  onCitySelect?: (
    geocode: string,
    cityName: string
  ) => void;
}) {

  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [municipalData, setMunicipalData] =
    useState<any[]>([]);

  const [stateGeoJson, setStateGeoJson] =
    useState<any>(null);

  const [loadedState, setLoadedState] =
    useState<string | null>(null);

  useEffect(() => {

    if (
      !start ||
      !end ||
      !selectedState
    ) {
      return;
    }

    let cancelled = false;

    setLoadedState(null);
    setStateGeoJson(null);
    setMunicipalData([]);
    setOption(null);

    setLoading(true);


    async function loadData() {

      try {
        const geoJson =
          await loadStateMap(selectedState);


        if (!geoJson) {

          console.error(t('charts_vegetation_index.load_state_error', {state: selectedState}));
          return;
        }

        if (cancelled) return;

        const mapName = `state_${selectedState}`;

        if (!echarts.getMap(mapName)) {

          console.error(t('charts_vegetation_index.warn_registered_map', {name: mapName}));

          return;
        }

        const data =
          await fetchMunicipalData(
            selectedState,
            start,
            end,
            attribute
          );


        if (cancelled) return;


        if (
          !data ||
          data.length === 0
        ) {
          console.warn(t('charts_vegetation_index.warn_state_message', {state: selectedState}));

          setStateGeoJson(geoJson);
          setMunicipalData([]);

          return;
        }

        setStateGeoJson(geoJson);
        setMunicipalData(data);

        setLoadedState(selectedState);


      } catch (error) {

        if (cancelled) return;

        console.error(
          t('charts_vegetation_index.load_error'),
          error
        );

        setStateGeoJson(null);
        setMunicipalData([]);
        setLoadedState(null);

      } finally {

        if (!cancelled) {
          setLoading(false);
        }

      }

    }


    loadData();


    return () => {
      cancelled = true;
    };


  }, [
    start,
    end,
    attribute,
    selectedState,
    t
  ]);

  useEffect(() => {
    if (
      !stateGeoJson ||
      municipalData.length === 0 ||
      !selectedState ||
      loadedState !== selectedState
    ) {

      setOption(null);

      return;
    }


    const mapName =`state_${selectedState}`;

    if (!echarts.getMap(mapName)) {

      console.warn(t('charts_vegetation_index.warn_map_message', {name: mapName}));

      setOption(null);

      return;
    }


    const bounds =
      stateBounds[selectedState];


    let mapConfig: any = {
      roam: false,
      zoom: 0.9,
      center: [-55, -15] as [number, number],
      aspectScale: 1.2,
    };


    if (bounds) {

      const centerLat =
        (bounds.minLat + bounds.maxLat) / 2;

      const centerLon =
        (bounds.minLon + bounds.maxLon) / 2;


      mapConfig = {
        roam: false,
        zoom: 0.9,
        center: [
          centerLon,
          centerLat
        ] as [number, number],
        aspectScale: 1.2,
      };

    }

    const values =
      municipalData.map(
        (d: any) => d.median ?? 0
      );


    const minValue =
      Math.min(...values);

    const maxValue =
      Math.max(...values);


    const hasQ25Q75 =
      municipalData.some(
        (d: any) =>
          d.q25 !== undefined &&
          d.q75 !== undefined
      );

    const capitalInfo =
      STATE_CAPITALS[selectedState];

    const capitalGeocode =
      capitalInfo?.geocode;

    const mapData =
      municipalData.map(
        (d: any) => {

          const isSelected =
            selectedCityGeocode &&
            String(d.geocode) ===
              String(selectedCityGeocode);


          const isCapital =
            capitalGeocode &&
            String(d.geocode) ===
              String(capitalGeocode);


          return {
            name: d.name,

            value:
              d.median ?? 0,

            geocode:
              d.geocode,


            itemStyle: {

              borderColor:
                isSelected
                  ? "#16240E"
                  : isCapital
                    ? "#333333"
                    : "#666666",


              borderWidth:
                isSelected
                  ? 2.5
                  : isCapital
                    ? 1.8
                    : 0.6,

            },


            label:
              isSelected
                ? {
                    show: true,

                    color:
                      resolvedTheme === "dark"
                        ? "#fff"
                        : "#000",

                    fontSize: 12,

                    fontWeight: "bold",
                  }
                : undefined,
          };

        }
      );

    setOption({

      title: {
        text: t('charts_vegetation_index.municipal_map_title', { attribute, state: selectedState }),

        left: "center",

        textStyle: {

          color:
            resolvedTheme === "dark"
              ? "#fff"
              : "#000",

          fontSize: 16,

          fontWeight: "bold",

        },

      },

      tooltip: {

        trigger: "item",

        backgroundColor:
          resolvedTheme === "dark"
            ? "#1f2937"
            : "#ffffff",

        borderColor:
          resolvedTheme === "dark"
            ? "#374151"
            : "#e5e7eb",

        textStyle: {

          color:
            resolvedTheme === "dark"
              ? "#f3f4f6"
              : "#111827",

        },


        formatter: (params: any) => {

          if (!params.data) {
            return t('charts_vegetation_index.no_data_message');
          }

          const cityData =
            municipalData.find(
              (d: any) =>
                d.name === params.name
            );

          if (!cityData) {return t('charts_vegetation_index.no_data_message');}

          let tooltipText = `<strong>${params.name}</strong><br/>`;

          tooltipText += t('charts_vegetation_index.map_tooltip_median', {
            value: cityData.median?.toFixed(4) ?? "N/A"
          }) + "<br/>";

          if (hasQ25Q75) {
            tooltipText += t('charts_vegetation_index.map_tooltip_q25', {
              value: cityData.q25?.toFixed(4) ?? "N/A"
            }) + "<br/>";

            tooltipText += t('charts_vegetation_index.map_tooltip_q75', {
              value: cityData.q75?.toFixed(4) ?? "N/A"
            }) + "<br/>";
          }

          tooltipText += `<em style="font-size: 10px; opacity: 0.7;">
            ${t('charts_vegetation_index.map_tooltip_click')}
          </em>`;

          return tooltipText;

        },
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        left: 20,
        formatter: (value) => typeof value === "number" ? value.toFixed(2) : String(value ?? ""),
        inRange: {
          color: [
            "#D9FACB",
            "#81B863"
          ],
        },

        textStyle: {
          color:
            resolvedTheme === "dark"
              ? "#9ca3af"
              : "#6b7280",
        },
      },

      series: [
        {
          type: "map",

          map: mapName,

          nameProperty: "name",

          ...mapConfig,

          data: mapData,


          emphasis: {

            label: {

              show: true,

              color:
                resolvedTheme === "dark"
                  ? "#fff"
                  : "#000",

              fontSize: 12,

            },


            itemStyle: {

              areaColor:
                resolvedTheme === "dark"
                  ? "#374151"
                  : "#d1d5db",

              borderColor:
                "#000000",

              borderWidth:
                1.7,

            },

          },


          showLegendSymbol:
            false,

          z:
            1,

          cursor:
            "pointer",

        },

      ],

    });


  }, [
    stateGeoJson,
    municipalData,
    selectedCityGeocode,
    selectedState,
    loadedState,
    attribute,
    resolvedTheme
  ]);

  useEffect(() => {

    if (!onCitySelect) return;

    if (
      loadedState !== selectedState
    ) {
      return;
    }

    const chartDom =
      document.querySelector(
        `[data-chart-id="vegetation-municipal-map-${selectedState}"]`
      ) as HTMLElement;


    if (!chartDom) return;

    const chartInstance =
      echarts.getInstanceByDom(
        chartDom
      );


    if (!chartInstance) return;


    const handleClick =
      (params: any) => {

        if (
          params.componentType !== "series" ||
          !params.name
        ) {
          return;
        }

        const cityData = municipalData.find((d: any) => d.name === params.name);

        if (cityData && cityData.geocode) {

          console.log(t('charts_vegetation_index.selected_municipality_message',{name: params.name, geocode: cityData.geocode}));

          onCitySelect(String(cityData.geocode), params.name);
        }

      };

    chartInstance.off("click", handleClick);
    chartInstance.on("click", handleClick);

    return () => {

      chartInstance.off(
        "click",
        handleClick
      );

    };

  }, [
    municipalData,
    selectedState,
    loadedState,
    onCitySelect,
    t
  ]);

  const chartRef =
    useChart(
      option,
      loading
    );

  return (

    <div
      className=" w-full overflow-hidden relative">

      <div
        ref={chartRef}
        data-chart-id={`vegetation-municipal-map-${selectedState}`}
        style={{
          width: "100%",
          height: MAP_HEIGHT,
          minWidth: "0",
        }}
      />


      {!loading && !option && (

        <div className="absolute inset-0 flex items-center justify-center text-secondary opacity-60 text-sm bg-background/80">
          {t('charts_vegetation_index.no_data_message')}
        </div>
      )}
    </div>
  );
}

interface VegetationTimeSeriesProps
  extends ChartProps {
  selectedState?: string;
  selectedCityGeocode?: string;
  selectedCityName?: string;
}

export function VegetationTimeSeries({geocode, start, end, attribute = "EVI", selectedState, selectedCityGeocode, selectedCityName}: VegetationTimeSeriesProps) {

  const { t } = useTranslation('common');
  const { resolvedTheme } = useTheme();

  const [timeSeriesData, setTimeSeriesData] = useState<any[] | null>(null);

  const [cityDisplayName, setCityDisplayName] = useState("");

  const [loading, setLoading] = useState(false);

  const cityGeocode =
    useMemo(() => {

      if (selectedCityGeocode) {
        return selectedCityGeocode;
      }

      if (
        selectedState &&
        STATE_CAPITALS[selectedState]
      ) {
        return STATE_CAPITALS[
          selectedState
        ].geocode;
      }

      return geocode;

    }, [
      geocode,
      selectedState,
      selectedCityGeocode,
    ]);

  const option =
    useMemo<echarts.EChartsOption | null>(
      () => {

        if ( !Array.isArray(timeSeriesData) || timeSeriesData.length === 0) {return null;}

        const dates = timeSeriesData.map((item: any) => item.date );

        const median = timeSeriesData.map((item: any) => item.median );

        const q25 =timeSeriesData.map((item: any) => item.q25);

        const q75 = timeSeriesData.map((item: any) => item.q75 );


        return {

          title: {
            text:
              t('charts_vegetation_index.time_series_title', {attribute_name: getIndexFullName(attribute), municipality: cityDisplayName}),
            
            left: "center",
            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#ffffff"
                  : "#000000",

              fontSize: 16,
              fontWeight: "bold",
            },
          },


          tooltip: {
            trigger: "axis",

            backgroundColor:
              resolvedTheme === "dark"
                ? "#1f2937"
                : "#ffffff",

            borderColor:
              resolvedTheme === "dark"
                ? "#374151"
                : "#e5e7eb",

            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#f3f4f6"
                  : "#111827",
            },


            formatter: (
              params: any
            ) => {

              const q25Point = params.find((point: any) => point.seriesName === t('charts_vegetation_index.q25') );

              const medianPoint = params.find((point: any) => point.seriesName === t('charts_vegetation_index.median'));

              const q75Point = params.find((point: any) => point.seriesName === t('charts_vegetation_index.q75') );

              if (!medianPoint) {return "";}

              return t('charts_vegetation_index.time_series_tooltip',{
                  data: medianPoint.axisValue,
                  value_q25: q25Point?.value?.toFixed(4) || "N/A",
                  value_median: medianPoint.value?.toFixed(4) || "N/A",
                  value_q75: q75Point?.value?.toFixed(4) || "N/A"
                })
            },
          },

          legend: {
            top: 35,

            data: [t('charts_vegetation_index.q25'),
                  t('charts_vegetation_index.median'),
                  t('charts_vegetation_index.q75')],

            textStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#ffffff"
                  : "#000000",
            },
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
              color:
                resolvedTheme === "dark"
                  ? "#9ca3af"
                  : "#6b7280",

              rotate: 30,
            },

            axisLine: {
              lineStyle: {
                color:
                  resolvedTheme === "dark"
                    ? "#374151"
                    : "#e5e7eb",
              },
            },
          },

          yAxis: {
            type: "value",

            name: attribute,

            axisLabel: {
              color:
                resolvedTheme === "dark"
                  ? "#9ca3af"
                  : "#6b7280",
            },

            nameTextStyle: {
              color:
                resolvedTheme === "dark"
                  ? "#9ca3af"
                  : "#6b7280",
            },

            splitLine: {
              lineStyle: {
                color:
                  resolvedTheme === "dark"
                    ? "#374151"
                    : "#e5e7eb",
              },
            },
          },

          series: [
            {
              name: t('charts_vegetation_index.q25'),
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
              name: t('charts_vegetation_index.median'),
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
              name: t('charts_vegetation_index.q75'),

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

              borderColor:
                resolvedTheme === "dark"
                  ? "#374151"
                  : "#e5e7eb",

              textStyle: {
                color:
                  resolvedTheme === "dark"
                    ? "#9ca3af"
                    : "#6b7280",
              },
            },
          ],
        };

      },

      [
        timeSeriesData,
        cityDisplayName,
        attribute,
        resolvedTheme,
        t
      ]
    );

  const chartRef =
    useChart(option, loading);

  useEffect(() => {

    if (
      !cityGeocode ||
      !start ||
      !end
    ) {
      return;
    }

    let cancelled = false;

    setLoading(true);

    setTimeSeriesData(null);

    setCityDisplayName(
      selectedCityName || ""
    );

    async function loadData() {

      try {

        let displayName =
          selectedCityName || "";


        if (!displayName) {
          displayName =
            await getCityName(
              cityGeocode
            );
        }


        if (cancelled) return;


        setCityDisplayName(
          displayName
        );


        const query =
          new URLSearchParams({
            geocode: cityGeocode,
            start,
            end,
            attribute,
          });


        const response =
          await fetch(
            `/api/datastore/charts/vegetation/time-series/?${query}`
          );


        if (!response.ok) {
          throw new Error(
            t('charts_vegetation_index.load_time_series_error', {status: response.status})
          );
        }

        const data = await response.json();

        if (cancelled) return;


        if (!Array.isArray(data) || data.length === 0) {
          setTimeSeriesData(null);
          return;
        }

        setTimeSeriesData(data);

      } catch (error) {

        if (cancelled) return;

        console.error(
          t('charts_vegetation_index.load_time_series', {status: attribute}),error);

        setTimeSeriesData(null);

      } finally {

        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };

  }, [
    cityGeocode,
    start,
    end,
    attribute,
    selectedCityName,
  ]);

  return (
    <div className="w-full overflow-hidden relative">
      <div
        ref={chartRef}
        style={{
          width: "100%",
          height: "500px",
          minWidth: "0",
        }}
      />

      {!loading && !option && (
        <div className="absolute inset-0 flex items-center justify-center text-secondary opacity-60 text-sm bg-background/80">
          {t('charts_vegetation_index.no_data_message')}
        </div>
      )}
    </div>
  );
}
