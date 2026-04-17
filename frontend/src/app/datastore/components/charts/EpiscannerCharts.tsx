"use client";

import React from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Loader2 } from "lucide-react";

interface EpiScannerChartProps {
  geoData: any;
  data: any[];
  selectedUf: string;
  onHover?: (name: string, value: string | number, x: number, y: number) => void;
  onLeave?: () => void;
}

const getProjectionConfig = (uf: string) => {
  const configs: Record<string, { center: [number, number]; scale: number }> = {
    AC: { center: [-70.0, -9.0], scale: 3500 },
    AL: { center: [-36.5, -9.6], scale: 12000 },
    AP: { center: [-51.5, 1.5], scale: 3500 },
    AM: { center: [-64.5, -3.5], scale: 1800 },
    BA: { center: [-41.5, -12.5], scale: 2800 },
    CE: { center: [-39.5, -5.5], scale: 6000 },
    DF: { center: [-47.8, -15.8], scale: 35000 },
    ES: { center: [-40.5, -19.8], scale: 8500 },
    GO: { center: [-50.0, -15.8], scale: 3500 },
    MA: { center: [-45.0, -5.5], scale: 3000 },
    MT: { center: [-56.0, -13.0], scale: 2200 },
    MS: { center: [-54.5, -20.5], scale: 3200 },
    MG: { center: [-44.5, -18.5], scale: 3200 },
    PA: { center: [-52.5, -4.0], scale: 2000 },
    PB: { center: [-36.8, -7.2], scale: 11000 },
    PR: { center: [-51.5, -24.5], scale: 4500 },
    PE: { center: [-38.0, -8.4], scale: 7000 },
    PI: { center: [-42.5, -7.5], scale: 3500 },
    RJ: { center: [-42.8, -22.3], scale: 12000 },
    RN: { center: [-36.5, -5.8], scale: 12000 },
    RS: { center: [-53.5, -30.0], scale: 3800 },
    RO: { center: [-63.0, -11.0], scale: 3800 },
    RR: { center: [-61.3, 2.0], scale: 3200 },
    SC: { center: [-50.8, -27.3], scale: 7500 },
    SP: { center: [-48.5, -22.5], scale: 4800 },
    SE: { center: [-37.4, -10.7], scale: 18000 },
    TO: { center: [-48.3, -10.2], scale: 3500 },
  };

  return configs[uf.toUpperCase()] || { center: [-55, -15], scale: 1500 };
};

export function EpiScannerChart({ geoData, data = [], selectedUf, onHover, onLeave }: EpiScannerChartProps) {
  const values = data.map(d => d.value).filter(v => v != null && !isNaN(v));
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 1;

  const colorScale = scaleLinear<string>()
    .domain([minValue, maxValue])
    .range(["#f8fafc", "#ef4444"]);

  const { center, scale } = getProjectionConfig(selectedUf);

  return (
    <div className="w-full h-[600px] flex flex-row items-center border-2 border-border rounded-xl bg-card text-card-foreground shadow-inner overflow-hidden bg-slate-50">
      <div className="h-full flex flex-col items-center justify-center pl-4">
        <span className="font-medium text-xs text-muted-foreground">{maxValue.toFixed(0)}</span>
        <div 
          className="h-24 w-3 rounded-sm" 
          style={{ background: `linear-gradient(to bottom, #ef4444, #f8fafc)` }}
        />
        <span className="font-medium text-xs text-muted-foreground">{minValue.toFixed(0)}</span>
      </div>
      <div className="flex-1 h-full p-2">
        {geoData ? (
          <ComposableMap
            key={selectedUf}
            projection="geoMercator"
            projectionConfig={{ center, scale }}
            className="w-full h-full"
          >
            <ZoomableGroup center={center} zoom={1} maxZoom={5}>
              <Geographies geography={geoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const geoId = geo.properties.geocode || geo.id;
                    const itemData = data.find((d) => String(d.id) === String(geoId));

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onMouseMove={(evt) => {
                          if (onHover) {
                            onHover(
                              geo.properties.name || itemData?.name || "Unknown",
                              itemData?.value ?? "-",
                              evt.clientX,
                              evt.clientY
                            );
                          }
                        }}
                        onMouseLeave={() => {
                          if (onLeave) onLeave();
                        }}
                        fill={itemData ? colorScale(itemData.value) : "#ffffff"}
                        stroke="#475569"
                        strokeWidth={0.2}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            fill: "#fbbf24",
                            stroke: "#000000",
                            strokeWidth: 0.8,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: { fill: "#f59e0b", outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin mb-2" />
            <p className="text-sm font-medium">Loading Map for {selectedUf}...</p>
          </div>
        )}
      </div>
    </div>
  );
}
