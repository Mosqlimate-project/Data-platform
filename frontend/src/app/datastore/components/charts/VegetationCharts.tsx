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
  { value: 'NDVI', label: 'NDVI', description: 'Índice de Vegetação por Diferença Normalizada, mede o verde e vigor geral das plantas. É o padrão para lavouras, mas falha em florestas muito densas ou solo exposto.' },
  { value: 'EVI', label: 'EVI', description: 'Índice de Vegetação Aprimorado, substitui o NDVI em florestas fechadas ou biomas densos, pois não satura o sinal e ignora a névoa atmosférica.'},
  { value: 'SAVI', label: 'SAVI', description: 'índice de Vegetação Ajustada ao Solo, substitui o NDVI em plantios jovens, pastagens ralas ou áreas secas, eliminando a interferência do brilho do solo.' },
  { value: 'NDWI', label: 'NDWI', description: 'Índice de Água por Diferença Normalizada, identifica corpos de água e umidade na vegetação, diferenciando o que é recurso hídrigo de solo seco.' },
];

export function IndexSelector({ value, onChange }: IndexSelectorProps) {
  const { resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

  const selectedLabel = VEGETATION_INDICES.find(i => i.value === value)?.label || value;

  return (
    <div className="flex flex-col gap-1 w-full max-w-[300px]">
      <label className="text-xs font-medium opacity-70">Índice de Vegetação</label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-3 py-2 rounded-md border text-sm text-left
            ${resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white'} text-foreground
            focus:outline-none focus:ring-1 focus:ring-primary
            flex items-center justify-between
            ${resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-300'}
            hover:${resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} transition-colors
          `}
        >
          <span className="font-medium">{selectedLabel}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className={`
            absolute z-[9999] w-full mt-1 rounded-md shadow-lg
            bg-background border
            ${resolvedTheme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'}
            max-h-80 overflow-y-auto
          `}>
            {VEGETATION_INDICES.map((index) => (
              <div
                key={index.value}
                className={`
                  px-3 py-2 cursor-pointer transition-colors
                  hover:bg-primary/10
                  ${value === index.value ? 'bg-primary/20 border-l-4 border-primary' : ''}
                  ${resolvedTheme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                `}
                onClick={() => {
                  onChange(index.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHoveredIndex(index.value)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="font-medium text-sm">{index.label}</div>
                <div className="text-xs opacity-70 mt-0.5 leading-relaxed">
                  {index.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

let mapRegistered = false;
let stateMaps: Record<string, any> = {};
let stateBounds: Record<string, any> = {};

const STATE_CAPITALS: Record<string, { geocode: string, name: string }> = {
  'AC': { geocode: '1200401', name: 'Rio Branco' },
  'AL': { geocode: '2704302', name: 'Maceió' },
  'AP': { geocode: '1600303', name: 'Macapá' },
  'AM': { geocode: '1302603', name: 'Manaus' },
  'BA': { geocode: '2927408', name: 'Salvador' },
  'CE': { geocode: '2304400', name: 'Fortaleza' },
  'DF': { geocode: '5300108', name: 'Brasília' },
  'ES': { geocode: '3205309', name: 'Vitória' },
  'GO': { geocode: '5208707', name: 'Goiânia' },
  'MA': { geocode: '2111300', name: 'São Luís' },
  'MT': { geocode: '5103403', name: 'Cuiabá' },
  'MS': { geocode: '5002704', name: 'Campo Grande' },
  'MG': { geocode: '3106200', name: 'Belo Horizonte' },
  'PA': { geocode: '1501402', name: 'Belém' },
  'PB': { geocode: '2507507', name: 'João Pessoa' },
  'PR': { geocode: '4106902', name: 'Curitiba' },
  'PE': { geocode: '2611606', name: 'Recife' },
  'PI': { geocode: '2211001', name: 'Teresina' },
  'RJ': { geocode: '3304557', name: 'Rio de Janeiro' },
  'RN': { geocode: '2408102', name: 'Natal' },
  'RS': { geocode: '4314902', name: 'Porto Alegre' },
  'RO': { geocode: '1100205', name: 'Porto Velho' },
  'RR': { geocode: '1400100', name: 'Boa Vista' },
  'SC': { geocode: '4205407', name: 'Florianópolis' },
  'SP': { geocode: '3550308', name: 'São Paulo' },
  'SE': { geocode: '2800308', name: 'Aracaju' },
  'TO': { geocode: '1721000', name: 'Palmas' },
};

function calculateBounds(geoJson: any) {
  try {
    let allCoords: [number, number][] = [];
    
    function extractCoords(coords: any) {
      if (!coords) return;
      
      if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        allCoords.push([coords[0], coords[1]]);
      } else if (Array.isArray(coords)) {
        for (const item of coords) {
          extractCoords(item);
        }
      }
    }
    
    if (geoJson.features) {
      for (const feature of geoJson.features) {
        if (feature.geometry && feature.geometry.coordinates) {
          extractCoords(feature.geometry.coordinates);
        }
      }
    }
    
    if (allCoords.length === 0) {
      throw new Error('No coordinates found');
    }
    
    let minLon = Infinity, maxLon = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
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
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
      width: maxLon - minLon,
      height: maxLat - minLat,
    };
  } catch (error) {
    console.error('Error calculating bounds:', error);
    return {
      minLon: -74,
      maxLon: -34,
      minLat: -34,
      maxLat: 5,
      center: [-54, -14.5],
      width: 40,
      height: 39,
    };
  }
}

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

async function loadStateMap(stateCode: string) {
    try {
        if (stateMaps[stateCode]) {
            return stateMaps[stateCode];
        }

        const response = await fetch(`/geoJSON_ufs/geojs-${stateCode}-mun.json`);
        if (!response.ok) {
            throw new Error(`Failed to load state map: ${response.status}`);
        }
        
        const geoJson = await response.json();
        stateMaps[stateCode] = geoJson;
        
        try {
            stateBounds[stateCode] = calculateBounds(geoJson);
            console.log(`Bounds calculated for ${stateCode}:`, stateBounds[stateCode]);
        } catch (boundsError) {
            console.error(`Error calculating bounds for ${stateCode}:`, boundsError);

            stateBounds[stateCode] = {
                minLon: -74,
                maxLon: -34,
                minLat: -34,
                maxLat: 5,
                center: [-54, -14.5],
                width: 40,
                height: 39,
            };
        }
        
        echarts.registerMap(`state_${stateCode}`, geoJson);
        
        console.log(`State map registered: state_${stateCode}`);
        return geoJson;
    } catch (error) {
        console.error(`Error loading state map for ${stateCode}:`, error);
        return null;
    }
}

async function getCityName(geocode: string) {
  const res = await fetch(`/api/datastore/cities?geocode=${geocode}`);

  if (!res.ok) return geocode;

  const city = await res.json();

  if (!city.length) return geocode;

  return `${city[0].name} - ${city[0].adm1}`;
}

async function fetchMunicipalData(stateCode: string, start: string, end: string, attribute: string) {
  try {
    const query = new URLSearchParams({
      start,
      end,
      attribute: attribute,
      uf: stateCode,
    });

    let res = await fetch(
      `/api/datastore/charts/vegetation/municipal-map?${query}`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch municipal data: ${res.status}`);
    }

    const data = await res.json();
    
    if (Array.isArray(data)) {
      const filtered = data.filter((d: any) => {
        return d.uf === stateCode || d.state === stateCode || d.adm1 === stateCode;
      });
      return filtered.length > 0 ? filtered : data;
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching municipal data for ${stateCode}:`, error);
    return null;
  }
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
  selectedState,
  onStateSelect
}: ChartProps & { 
  selectedState?: string;
  onStateSelect?: (stateCode: string) => void
 }) {

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
              color: ["#D9FACB", "#648F4C"]
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
                borderWidth: 0.6,
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

        setTimeout(() => {
          const chartInstance = echarts.getInstanceByDom(
            document.querySelector(`[data-chart-id="vegetation-map"]`) as HTMLElement
          );
          
          if (chartInstance) {
            chartInstance.off('click');
            chartInstance.on('click', (params: any) => {
              if (params.name && onStateSelect) {
                console.log(`Estado selecionado: ${params.name}`);
                onStateSelect(params.name);
              }
            });
          }
        }, 100);

      } catch (error) {
        console.error(`Error loading vegetation map for ${attribute}:`, error);
        setOption(null);
      } finally {

        setLoading(false);

      }

    }

    load();

  }, [start, end, resolvedTheme, attribute, onStateSelect]); 

  const chartRef = useChart(option, loading);

  return (
    <div
      ref={chartRef}
      data-chart-id="vegetation-map"
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
  selectedState = "RJ",
  selectedCityGeocode,
  onCitySelect
}: ChartProps & {
  selectedState?: string,
  selectedCityGeocode?: string,
  onCitySelect?: (geocode: string, cityName: string) => void
}) {
  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] = useState(false);

  const [municipalData, setMunicipalData] = useState<any[]>([]);
  const [stateGeoJson, setStateGeoJson] = useState<any>(null);

  useEffect(() => {
    if (!start || !end || !selectedState) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);

      try {
        const geoJson = await loadStateMap(selectedState);

        if (!geoJson) {
          console.error(
            `Failed to load map for state ${selectedState}`
          );

          if (!cancelled) {
            setStateGeoJson(null);
            setMunicipalData([]);
          }

          return;
        }

        const data = await fetchMunicipalData(
          selectedState,
          start,
          end,
          attribute
        );

        if (!data || data.length === 0) {
          console.warn(
            `No municipal data received for ${selectedState}`
          );

          if (!cancelled) {
            setStateGeoJson(geoJson);
            setMunicipalData([]);
          }

          return;
        }

        if (cancelled) return;

        console.log("GEOJSON:", geoJson.features[0]);
        console.log("API:", data[0]);

        console.log(
          "GEOJSON PROPERTIES:",
          geoJson.features[0]?.properties
        );

        console.log(
          "Nomes GeoJSON:",
          geoJson.features
            .slice(0, 10)
            .map((f: any) => f.properties)
        );

        console.log(
          "Nomes API:",
          data.slice(0, 10).map((d: any) => ({
            name: d.name,
            geocode: d.geocode
          }))
        );

        setStateGeoJson(geoJson);
        setMunicipalData(data);

      } catch (error) {
        if (cancelled) return;

        console.error(
          `Error loading IQR map for ${attribute}:`,
          error
        );

        setStateGeoJson(null);
        setMunicipalData([]);
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
    selectedState
  ]);

  useEffect(() => {
    if (
      !stateGeoJson ||
      municipalData.length === 0 ||
      !selectedState
    ) {
      setOption(null);
      return;
    }

    const mapName = `state_${selectedState}`;

    const bounds = stateBounds[selectedState];

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
        center: [centerLon, centerLat] as [number, number],
        aspectScale: 1.2,
      };
    }

    const values = municipalData.map(
      (d: any) => d.median || 0
    );

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    const hasQ25Q75 = municipalData.some(
      (d: any) =>
        d.q25 !== undefined &&
        d.q75 !== undefined
    );

    const hasIQR = municipalData.some(
      (d: any) => d.iqr !== undefined
    );

    const capitalInfo =
      STATE_CAPITALS[selectedState];

    const capitalGeocode =
      capitalInfo?.geocode;

    const highlightGeocode =
      selectedCityGeocode || capitalGeocode;

    console.log(
      `Município em destaque: ${highlightGeocode}`
    );

    const mapData = municipalData.map(
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
          value: d.median || 0,
          geocode: d.geocode,

          itemStyle: {
            borderColor: isSelected
              ? "#16240E"
              : isCapital
                ? "#333333"
                : "#666666",

            borderWidth: isSelected
              ? 2.5
              : isCapital
                ? 1.8
                : 0.6,
          },

          label: isSelected
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
        text:
          `Mediana do ${attribute} por município - ${selectedState}`,
        left: "center",

        textStyle: {
          color:
            resolvedTheme === "dark"
              ? "#fff"
              : "#000",

          fontSize: 16,
          fontWeight: "bold"
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
            return `${params.name}: Sem dados`;
          }

          const cityData =
            municipalData.find(
              (d: any) =>
                d.name === params.name
            );

          if (!cityData) {
            return `${params.name}: Sem dados`;
          }

          let tooltipText =
            `<strong>${params.name}</strong><br/>`;

          tooltipText +=
            `Mediana: ${
              cityData.median?.toFixed(4) || "N/A"
            }<br/>`;

          if (hasQ25Q75) {
            tooltipText +=
              `Q25: ${
                cityData.q25?.toFixed(4) || "N/A"
              }<br/>`;

            tooltipText +=
              `Q75: ${
                cityData.q75?.toFixed(4) || "N/A"
              }<br/>`;
          }

          if (hasIQR) {
            tooltipText +=
              `IQR: ${
                cityData.iqr?.toFixed(4) || "N/A"
              }`;
          }

          tooltipText +=
            `<em style="font-size: 8px; opacity: 0.7;">
              (Clique para ver a série temporal)
            </em>`;

          return tooltipText;
        }
      },


      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        left: 20,

        inRange: {
          color: [
            "#D9FACB",
            "#81B863"
          ]
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

          roam: false,

          ...mapConfig,

          nameProperty: "name",

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

              borderColor: "#000000",
              borderWidth: 1.7,
            }
          },

          showLegendSymbol: false,

          z: 1,

          cursor: "pointer",
        },
      ],
    });

  }, [
    stateGeoJson,
    municipalData,
    selectedCityGeocode,
    selectedState,
    attribute,
    resolvedTheme
  ]);
  
  useEffect(() => {
    if (!onCitySelect) return;

    const chartDom = document.querySelector(
      `[data-chart-id="vegetation-iqr-map-${selectedState}"]`
    ) as HTMLElement;

    if (!chartDom) return;

    const chartInstance =
      echarts.getInstanceByDom(chartDom);

    if (!chartInstance) return;

    const handleClick = (params: any) => {

      if (!params.name) return;

      const cityData =
        municipalData.find(
          (d: any) =>
            d.name === params.name
        );

      if (
        cityData &&
        cityData.geocode
      ) {
        console.log(
          `Município selecionado: ${params.name} (${cityData.geocode})`
        );

        onCitySelect(
          String(cityData.geocode),
          params.name
        );

      } else {
        console.warn(
          `Geocode não encontrado para: ${params.name}`
        );
      }
    };

    chartInstance.off("click");
    chartInstance.on("click", handleClick);

    return () => {
      chartInstance.off("click", handleClick);
    };

  }, [
    municipalData,
    selectedState,
    onCitySelect
  ]);

  const chartRef = useChart(
    option,
    loading
  );

  return (
    <div
      ref={chartRef}
      data-chart-id={`vegetation-iqr-map-${selectedState}`}
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
  selectedState,
  selectedCityGeocode,
  selectedCityName
}: ChartProps & { 
    selectedState?: string,
    selectedCityGeocode?: string,
    selectedCityName?: string
}) {
  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] = useState(false);
  const [cityGeocode, setCityGeocode] = useState(geocode);
  const [cityDisplayName, setCityDisplayName] = useState('');

  useEffect(() => {
    if (selectedCityGeocode) {
      setCityGeocode(selectedCityGeocode);
    } else if (selectedState && STATE_CAPITALS[selectedState]) {
      const capitalGeocode = STATE_CAPITALS[selectedState].geocode;
      setCityGeocode(capitalGeocode);

      console.log(`Estado ${selectedState} selecionado, capital: ${STATE_CAPITALS[selectedState].name} (${capitalGeocode})`);
    } else {
      setCityGeocode(geocode);
    }
  }, [selectedState, selectedCityGeocode, selectedCityName, geocode]);

  useEffect(() => {
    if (!cityGeocode || !start || !end) return;

    async function load() {
      setLoading(true);

      try {
        let displayName = cityDisplayName;
        if (!displayName) {
          const city = await getCityName(cityGeocode);
          displayName = city;
          setCityDisplayName(city);
        }

        const query = new URLSearchParams({
          geocode: cityGeocode,
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
            text: `Série temporal do ${getIndexFullName(attribute)} - ${displayName}`,
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
  }, [cityGeocode, start, end, resolvedTheme, attribute, cityDisplayName]);

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