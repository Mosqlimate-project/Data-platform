"use client";

import { useState, useMemo } from "react";
import { FileJson, FileSpreadsheet, Lock, Loader2 } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import { NEXT_PUBLIC_BACKEND_URL } from "@/lib/env";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/components/AuthProvider";

function jsonToCsv(items: any[]) {
  if (!items || items.length === 0) return "";
  const header = Object.keys(items[0]);
  const rows = items.map(row =>
    header.map(fieldName => {
      const value = row[fieldName] ?? "";
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(",")
  );
  return [header.join(","), ...rows].join("\r\n");
}

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

      const jsonData = await response.json();
      let blob: Blob;

      if (format === "csv") {
        const csvContent = jsonToCsv(jsonData);
        blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      } else {
        blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      const filename = `episcanner_export_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute("download", filename);

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
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

  const baseUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/datastore/episcanner/`;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (disease) p.set("disease", disease);
    if (uf) p.set("uf", uf.toUpperCase());
    if (year) p.set("year", String(year));
    return p;
  }, [disease, uf, year]);

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
          <option value="chik">Chikungunya</option>
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

export function EpiScannerChart() {
  const { t } = useTranslation('common');

  return (
    <div className="w-full h-[400px] flex items-center justify-center border rounded-md bg-card text-card-foreground shadow-sm">
      <p className="text-muted-foreground opacity-70 font-medium">
        {t('charts_episcanner.unavailable')} <a href="https://info.dengue.mat.br/epi-scanner/" className="italic">EpiScanner</a>
      </p>
    </div>
  );
}

export function EpiScannerView({ config }: { config: EndpointDetails }) {
  const currentYear = new Date().getFullYear();
  const [disease, setDisease] = useState<string>("dengue");
  const [uf, setUf] = useState<string>("SP");
  const [year, setYear] = useState<number>(currentYear);

  return (
    <EndpointLayout
      title={config.name}
      description={config.description}
      moreInfoLink={config.more_info_link}
      endpoint={config.endpoint}
      source={config.source}
      dataVariables={config.data_variables}
      apiBuilder={<EpiScannerApiBuilder />}
      controls={
        <div className="grid grid-cols-3 gap-2 relative z-20">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Disease</label>
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="dengue">Dengue</option>
              <option value="chik">Chikungunya</option>
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
        </div>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <EpiScannerChart />
      </div>
    </EndpointLayout>
  );
}
