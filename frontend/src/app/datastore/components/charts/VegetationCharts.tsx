"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";
import { useTheme } from "next-themes";
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
    label: "EVI",
    description:
      "Índice de Vegetação Aprimorado, substitui o NDVI em florestas fechadas ou biomas densos, pois não satura o sinal e ignora a névoa atmosférica.",
  },
  {
    value: "NDVI",
    label: "NDVI",
    description:
      "Índice de Vegetação por Diferença Normalizada, mede o verde e vigor geral das plantas. É o padrão para lavouras, mas falha em florestas muito densas ou solo exposto.",
  },
  {
    value: "SAVI",
    label: "SAVI",
    description:
      "Índice de Vegetação Ajustada ao Solo, substitui o NDVI em plantios jovens, áreas urbanas ou secas, eliminando a interferência do brilho do solo.",
  },
  {
    value: "NDWI",
    label: "NDWI",
    description:
      "Índice de Água por Diferença Normalizada, identifica corpos de água e umidade na vegetação, diferenciando o que é recurso hídrico de solo seco.",
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
        Índice de Vegetação
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
            {selectedLabel}
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
                  {index.label}
                </div>

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

    try {
      const response =
        await fetch("/br.json");

      if (!response.ok) {
        throw new Error(
          "Fallback map failed"
        );
      }

      const geoJson =
        await response.json();

      echarts.registerMap(
        "brazil",
        geoJson
      );

      brazilMapRegistered = true;

    } catch (fallbackError) {
      console.error(
        "Fallback map load also failed:",
        fallbackError
      );
    }
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
      `/geoJSON_ufs/geojs-${stateCode}-mun.json`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load state map: ${response.status}`
      );
    }

    const geoJson = await response.json();

    stateMaps[stateCode] = geoJson;

    stateBounds[stateCode] =
      calculateBounds(geoJson);

    echarts.registerMap(
      mapName,
      geoJson
    );

    console.log(
      `State map registered: ${mapName}`
    );

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
    EVI:
      "EVI (Enhanced Vegetation Index)",
    NDVI:
      "NDVI (Normalized Difference Vegetation Index)",
    SAVI:
      "SAVI (Soil Adjusted Vegetation Index)",
    NDWI:
      "NDWI (Normalized Difference Water Index)",
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


export function VegetationMap({
  start,
  end,
  attribute = "EVI",
  selectedState,
  onStateSelect,
}: VegetationMapProps) {

  const { resolvedTheme } =
    useTheme();

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


  /*
   * OPTION
   */

  const option =
    useMemo<echarts.EChartsOption | null>(
      () => {

        if (
          !mapData ||
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

                  fontWeight: "bold",

                  fontSize: 12,
                }
              : undefined,
          };
        });

        return {
          title: {
            text:
              `Mediana do ${attribute} por estado`,

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
                return `${params.name}: Sem dados`;
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

            formatter: (value: number) => value.toFixed(2),

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


  /*
   * FETCH DATA
   */

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
            `Failed to load vegetation map: ${response.status}`
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

        console.error(
          `Error loading vegetation map for ${attribute}:`,
          error
        );

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
          className="
            absolute inset-0
            flex items-center justify-center
            text-secondary opacity-60
            text-sm bg-background/80
          "
        >
          Sem dados disponíveis
        </div>
      )}
    </div>
  );
}


/* ============================================================================
 * MUNICIPAL VEGETATION MAP
 * ========================================================================== */

interface VegetationIQRMapProps
  extends ChartProps {
  selectedState?: string;
  selectedCityGeocode?: string;

  onCitySelect?: (
    geocode: string,
    cityName: string
  ) => void;
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
  selectedState?: string;
  selectedCityGeocode?: string;
  onCitySelect?: (
    geocode: string,
    cityName: string
  ) => void;
}) {

  const { resolvedTheme } = useTheme();

  const [option, setOption] =
    useState<echarts.EChartsOption | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [municipalData, setMunicipalData] =
    useState<any[]>([]);

  const [stateGeoJson, setStateGeoJson] =
    useState<any>(null);

  /*
   * MUITO IMPORTANTE:
   *
   * Guarda qual estado os dados atualmente carregados
   * representam.
   *
   * Isso impede que dados do RJ sejam renderizados
   * enquanto selectedState já mudou para MG.
   */
  const [loadedState, setLoadedState] =
    useState<string | null>(null);


  /*
   * ============================================================
   * 1. CARREGAMENTO DO MAPA E DOS DADOS
   * ============================================================
   */

  useEffect(() => {

    if (
      !start ||
      !end ||
      !selectedState
    ) {
      return;
    }

    let cancelled = false;


    /*
     * Invalida imediatamente os dados antigos.
     *
     * Isso é fundamental quando troca de estado.
     */
    setLoadedState(null);
    setStateGeoJson(null);
    setMunicipalData([]);
    setOption(null);

    setLoading(true);


    async function loadData() {

      try {

        /*
         * 1. Carrega e registra o GeoJSON
         */
        const geoJson =
          await loadStateMap(selectedState);


        if (!geoJson) {

          console.error(
            `Failed to load map for state ${selectedState}`
          );

          return;
        }


        if (cancelled) return;


        /*
         * Confirma que o mapa realmente está registrado
         */
        const mapName =
          `state_${selectedState}`;


        if (!echarts.getMap(mapName)) {

          console.error(
            `Map ${mapName} is not registered`
          );

          return;
        }


        /*
         * 2. Busca os dados municipais
         */
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

          console.warn(
            `No municipal data received for ${selectedState}`
          );

          setStateGeoJson(geoJson);
          setMunicipalData([]);

          return;
        }


        /*
         * 3. Atualiza tudo junto para o estado correto
         */
        setStateGeoJson(geoJson);
        setMunicipalData(data);

        /*
         * Esta linha só acontece DEPOIS que:
         *
         * - o mapa foi registrado
         * - o GeoJSON foi carregado
         * - os dados municipais chegaram
         */
        setLoadedState(selectedState);


      } catch (error) {

        if (cancelled) return;

        console.error(
          `Error loading municipal map for ${selectedState}:`,
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
    selectedState
  ]);


  /*
   * ============================================================
   * 2. CRIAÇÃO DO OPTION
   * ============================================================
   */

  useEffect(() => {

    /*
     * REGRA MAIS IMPORTANTE:
     *
     * Só cria o mapa se os dados carregados pertencem
     * exatamente ao estado selecionado.
     */
    if (
      !stateGeoJson ||
      municipalData.length === 0 ||
      !selectedState ||
      loadedState !== selectedState
    ) {

      setOption(null);

      return;
    }


    const mapName =
      `state_${selectedState}`;


    /*
     * Segurança extra:
     * não chama setOption se o mapa não estiver registrado.
     */
    if (!echarts.getMap(mapName)) {

      console.warn(
        `Map ${mapName} is not available yet`
      );

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


    /*
     * Valores para visualMap
     */
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


    const hasIQR =
      municipalData.some(
        (d: any) =>
          d.iqr !== undefined
      );


    /*
     * Capital do estado
     */
    const capitalInfo =
      STATE_CAPITALS[selectedState];

    const capitalGeocode =
      capitalInfo?.geocode;


    /*
     * Dados do mapa
     */
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


    /*
     * Criação do gráfico
     */
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
              cityData.median?.toFixed(4) ??
              "N/A"
            }<br/>`;


          if (hasQ25Q75) {

            tooltipText +=
              `Q25: ${
                cityData.q25?.toFixed(4) ??
                "N/A"
              }<br/>`;


            tooltipText +=
              `Q75: ${
                cityData.q75?.toFixed(4) ??
                "N/A"
              }<br/>`;

          }


          if (hasIQR) {

            tooltipText +=
              `IQR: ${
                cityData.iqr?.toFixed(4) ??
                "N/A"
              }<br/>`;

          }


          tooltipText +=
            `<em style="font-size: 10px; opacity: 0.7;">
              Clique para ver a série temporal
            </em>`;


          return tooltipText;

        },

      },

      visualMap: {

        min: minValue,

        max: maxValue,

        calculable: true,

        left: 20,

        formatter: (value: number) => value.toFixed(2),

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


  /*
   * ============================================================
   * 3. EVENTO DE CLIQUE
   * ============================================================
   */

  useEffect(() => {

    if (!onCitySelect) return;

    if (
      loadedState !== selectedState
    ) {
      return;
    }


    const chartDom =
      document.querySelector(
        `[data-chart-id="vegetation-iqr-map-${selectedState}"]`
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

        }

      };


    chartInstance.off(
      "click",
      handleClick
    );


    chartInstance.on(
      "click",
      handleClick
    );


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
    onCitySelect
  ]);


  /*
   * ============================================================
   * 4. ECHARTS
   * ============================================================
   */

  const chartRef =
    useChart(
      option,
      loading
    );


  return (

    <div
      className="
        w-full
        overflow-hidden
        relative
      "
    >

      <div
        ref={chartRef}
        data-chart-id={`vegetation-iqr-map-${selectedState}`}
        style={{
          width: "100%",
          height: MAP_HEIGHT,
          minWidth: "0",
        }}
      />


      {!loading && !option && (

        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            text-secondary
            opacity-60
            text-sm
            bg-background/80
          "
        >

          Sem dados disponíveis

        </div>

      )}

    </div>

  );

}


/* ============================================================================
 * VEGETATION TIME SERIES
 * ========================================================================== */

interface VegetationTimeSeriesProps
  extends ChartProps {
  selectedState?: string;
  selectedCityGeocode?: string;
  selectedCityName?: string;
}


export function VegetationTimeSeries({

  geocode,

  start,

  end,

  attribute = "EVI",

  selectedState,

  selectedCityGeocode,

  selectedCityName,

}: VegetationTimeSeriesProps) {

  const { resolvedTheme } =
    useTheme();


  /*
   * STATES
   */

  const [
    timeSeriesData,
    setTimeSeriesData,
  ] = useState<any[] | null>(
    null
  );


  const [
    cityDisplayName,
    setCityDisplayName,
  ] = useState("");


  const [
    loading,
    setLoading,
  ] = useState(false);


  /*
   * DEFINE CITY GEOCODE
   *
   * Não precisa de useState adicional.
   * Ele pode ser derivado diretamente das props.
   */

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


  /*
   * OPTION
   */

  const option =
    useMemo<echarts.EChartsOption | null>(
      () => {

        if (
          !timeSeriesData ||
          timeSeriesData.length === 0
        ) {
          return null;
        }


        const dates =
          timeSeriesData.map(
            (item: any) =>
              item.date
          );


        const median =
          timeSeriesData.map(
            (item: any) =>
              item.median
          );


        const q25 =
          timeSeriesData.map(
            (item: any) =>
              item.q25
          );


        const q75 =
          timeSeriesData.map(
            (item: any) =>
              item.q75
          );


        return {

          title: {
            text:
              `Série temporal do ${getIndexFullName(attribute)} - ${cityDisplayName}`,

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

              const q25Point =
                params.find(
                  (point: any) =>
                    point.seriesName ===
                    "Q25"
                );


              const medianPoint =
                params.find(
                  (point: any) =>
                    point.seriesName ===
                    "Mediana"
                );


              const q75Point =
                params.find(
                  (point: any) =>
                    point.seriesName ===
                    "Q75"
                );


              if (!medianPoint) {
                return "";
              }


              return `
                <strong>
                  ${medianPoint.axisValue}
                </strong>
                <br/>

                Q25:
                ${
                  q25Point?.value?.toFixed(
                    4
                  ) || "N/A"
                }
                <br/>

                Mediana:
                ${
                  medianPoint.value?.toFixed(
                    4
                  ) || "N/A"
                }
                <br/>

                Q75:
                ${
                  q75Point?.value?.toFixed(
                    4
                  ) || "N/A"
                }
              `;
            },
          },


          legend: {
            top: 35,

            data: [
              "Q25",
              "Mediana",
              "Q75",
            ],

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
      ]
    );


  /*
   * CHART
   */

  const chartRef =
    useChart(option, loading);


  /*
   * FETCH TIME SERIES
   */

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
            `Failed to load time series: ${response.status}`
          );
        }


        const data =
          await response.json();


        if (cancelled) return;


        if (
          !data ||
          data.length === 0
        ) {
          setTimeSeriesData(null);
          return;
        }


        setTimeSeriesData(data);

      } catch (error) {

        if (cancelled) return;

        console.error(
          `Error loading time series for ${attribute}:`,
          error
        );

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
        <div
          className="
            absolute inset-0
            flex items-center justify-center
            text-secondary opacity-60
            text-sm bg-background/80
          "
        >
          Sem dados disponíveis
        </div>
      )}
    </div>
  );
}