"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Papa from "papaparse";
import { FileJson, FileSpreadsheet, Lock, Loader2 } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";
import { EpiScannerChart } from "../components/charts/EpiscannerCharts";
import { FRONTEND_SECRET } from "@/lib/env";

function DownloadButtons({
  baseUrl,
  params,
  disabled
}: {
  baseUrl: string,
  params: URLSearchParams,
  disabled: boolean
}) {
  const { user, openLogin } = useAuth();
  const [isDownloading, setIsDownloading] = useState<"csv" | "json" | null>(null);
  const isLoggedIn = !!user;

  const handleDownload = async (format: "csv" | "json") => {
    if (!isLoggedIn) {
      openLogin();
      return;
    }

    if (disabled) return;

    setIsDownloading(format);

    try {
      const keyRes = await fetch("/api/user/api-key");
      if (!keyRes.ok) throw new Error("Could not retrieve API Key");
      const { api_key } = await keyRes.json();

      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-UID-Key": api_key,
          "Accept": "application/json"
        },
      });

      if (!response.ok) throw new Error("Download failed");

      const rawData = await response.json();

      let dataToExport: any[] = [];

      if (Array.isArray(rawData)) {
        dataToExport = rawData;
      } else if (rawData && typeof rawData === 'object') {
        dataToExport = Array.isArray(rawData.items)
          ? rawData.items
          : [rawData];
      }

      if (format === "csv") {
        if (!dataToExport || dataToExport.length === 0 || (dataToExport.length === 1 && Object.keys(dataToExport[0]).length === 0)) {
          alert("No data found for the selected filters.");
          setIsDownloading(null);
          return;
        }

        const csvString = Papa.unparse(dataToExport, {
          quotes: true,
          header: true,
          skipEmptyLines: true,
        });
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", `export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: "application/json" });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", `export_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsDownloading(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider opacity-70">
          Export Data
        </label>
        {disabled && isLoggedIn && (
          <span className="text-[10px] text-destructive flex items-center gap-1 font-medium animate-in fade-in slide-in-from-right-1">
            Input a valid UF
          </span>
        )}
        {!isLoggedIn && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
            <Lock size={10} /> Login required
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={disabled || !!isDownloading}
          onClick={() => handleDownload("csv")}
          className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-md transition-all text-sm font-medium 
            ${disabled && isLoggedIn
              ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
              : "bg-background border-border hover:bg-muted hover:border-primary/30 text-foreground shadow-sm active:scale-95"}`}
        >
          {isDownloading === "csv" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className={`w-4 h-4 ${disabled && isLoggedIn ? "text-muted-foreground" : "text-green-600"}`} />
          )}
          CSV
        </button>
        <button
          disabled={disabled || !!isDownloading}
          onClick={() => handleDownload("json")}
          className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-md transition-all text-sm font-medium 
            ${disabled && isLoggedIn
              ? "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-60"
              : "bg-background border-border hover:bg-muted hover:border-primary/30 text-foreground shadow-sm active:scale-95"}`}
        >
          {isDownloading === "json" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileJson className={`w-4 h-4 ${disabled && isLoggedIn ? "text-muted-foreground" : "text-blue-600"}`} />
          )}
          JSON
        </button>
      </div>
    </div>
  );
}

function EpiScannerApiBuilder() {
  const currentYear = new Date().getFullYear();
  const [disease, setDisease] = useState<string>("dengue");
  const [uf, setUf] = useState<string>("SP");
  const [year, setYear] = useState<number>(currentYear);

  const baseUrl = `/api/datastore/episcanner/`;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (disease) p.set("disease", disease);
    if (uf) p.set("uf", uf.toUpperCase());
    p.set("year", String(year || currentYear));
    return p;
  }, [disease, uf, year, currentYear]);

  const isDownloadDisabled = !uf || uf.length < 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">disease</label>
        <select
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="dengue">Dengue</option>
          <option value="chikungunya">Chikungunya</option>
          <option value="zika">Zika</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">uf</label>
        <input
          type="text"
          maxLength={2}
          placeholder="e.g. SP"
          value={uf}
          onChange={(e) => setUf(e.target.value.toUpperCase())}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <DownloadButtons baseUrl={baseUrl} params={params} disabled={isDownloadDisabled} />
    </div>
  );
}

type MetricType = "peak_week" | "R0" | "total_cases" | "ep_dur";

export function EpiScannerView({ config }: { config: EndpointDetails }) {
  const currentYear = new Date().getFullYear();
  const containerRef = useRef<HTMLDivElement>(null);

  const [disease, setDisease] = useState<string>("dengue");
  const [uf, setUf] = useState<string>("SP");
  const [year, setYear] = useState<number>(currentYear);
  const [metric, setMetric] = useState<MetricType>("R0");
  const [rawData, setRawData] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ name: string; value: string | number; x: number; y: number } | null>(null);

  const chartData = useMemo(() => {
    return rawData.map((item: any) => ({
      id: String(item.geocode),
      value: Number(item[metric]) || 0,
      name: item.muni_name || "Unknown"
    }));
  }, [rawData, metric]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!uf || uf.length < 2) return;
      setIsLoading(true);
      try {
        const geoRes = await fetch(`/api/maps/cities?uf=${uf.toLowerCase()}`, {
          headers: { "x-internal-secret": FRONTEND_SECRET || "" }
        });
        const gData = await geoRes.json();
        setGeoData(gData);

        const queryParams = new URLSearchParams({
          disease,
          uf: uf.toUpperCase(),
          year: String(year || currentYear)
        });

        const dataRes = await fetch(`/api/datastore/charts/episcanner?${queryParams.toString()}`, {
          headers: { "x-internal-secret": FRONTEND_SECRET || "" }
        });

        if (dataRes.ok) {
          const result = await dataRes.json();
          setRawData(result);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [disease, uf, year, currentYear]);

  return (
    <EndpointLayout
      title={config.name}
      description={config.description}
      endpoint={config.endpoint}
      source={config.source}
      dataVariables={config.data_variables}
      moreInfoLink={config.more_info_link}
      apiBuilder={<EpiScannerApiBuilder />}
      controls={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative z-20">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Disease</label>
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="dengue">Dengue</option>
              <option value="chikungunya">Chikungunya</option>
              <option value="zika">Zika</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">State (UF)</label>
            <input
              type="text"
              maxLength={2}
              value={uf}
              onChange={(e) => setUf(e.target.value.toUpperCase())}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Variable</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricType)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="R0">R0</option>
              <option value="peak_week">Peak Week</option>
              <option value="total_cases">Total Cases</option>
              <option value="ep_dur">Duration (weeks)</option>
            </select>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-md">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-slate-50 shadow-sm"
        >
          <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur px-3 py-1.5 rounded-md border text-sm font-bold shadow-sm">
            {metric} by city in {year}
          </div>

          <EpiScannerChart
            geoData={geoData}
            data={chartData}
            selectedUf={uf}
            onHover={(name, value, clientX, clientY) => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setTooltip({
                  name,
                  value,
                  x: clientX - rect.left,
                  y: clientY - rect.top
                });
              }
            }}
            onLeave={() => setTooltip(null)}
          />

          {tooltip && (
            <div
              className="pointer-events-none absolute z-50 bg-black/90 text-white px-3 py-2 rounded-md text-xs shadow-xl flex flex-col border border-white/20 whitespace-nowrap"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y + 12
              }}
            >
              <span className="font-bold border-b border-white/20 pb-1 mb-1">{tooltip.name}</span>
              <span className="opacity-90">{metric}: <span className="font-mono">{typeof tooltip.value === 'number' ? tooltip.value.toFixed(2) : tooltip.value}</span></span>
            </div>
          )}
        </div>
      </div>
    </EndpointLayout>
  );
}
