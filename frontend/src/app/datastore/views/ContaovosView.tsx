"use client";

import { useState, useMemo, useEffect } from "react";
import Papa from "papaparse";
import { Calendar as CalendarIcon, FileJson, FileSpreadsheet, Lock, Loader2 } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import CitySearch from "../components/CitySearch";
import { EggCountChart } from "../components/charts/ContaovosCharts";
import { NEXT_PUBLIC_BACKEND_URL, FRONTEND_SECRET } from "@/lib/env";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import { useAuth } from "@/components/AuthProvider";

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

      const dataToExport = Array.isArray(rawData)
        ? rawData
        : (rawData.items && Array.isArray(rawData.items))
          ? rawData.items
          : null;

      if (!dataToExport || dataToExport.length === 0) {
        alert("No data found for the selected filters.");
        setIsDownloading(null);
        return;
      }

      let blob: Blob;

      if (format === "csv") {
        const csvString = Papa.unparse(dataToExport, {
          quotes: true,
          header: true,
          skipEmptyLines: true,
        });
        blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      } else {
        blob = new Blob([JSON.stringify(rawData, null, 2)], { type: "application/json" });
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const filename = `mosquito_export_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data.");
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
            Fill municipality or state
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

function LocalizedDateInput({
  value,
  onChange,
  label
}: {
  value: string,
  onChange: (val: string) => void,
  label?: string
}) {
  const { formatDate, dateFormatPattern } = useDateFormatter();

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-xs font-medium opacity-70">{label}</label>}
      <div className="relative h-9 w-full">
        <div className="absolute inset-0 w-full h-full flex items-center justify-between px-3 py-1 border rounded-md bg-background text-sm pointer-events-none z-0">
          <span className={!value ? "opacity-50" : ""}>
            {value ? formatDate(value) : <span className="opacity-40">{dateFormatPattern}</span>}
          </span>
          <CalendarIcon className="w-4 h-4 opacity-50" />
        </div>

        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch { }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

function MosquitoApiBuilder() {
  const formatDateISO = (date: Date) => date.toISOString().split('T')[0];
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);

  const [municipality, setMunicipality] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>(formatDateISO(oneYearAgo));
  const [dateEnd, setDateEnd] = useState<string>(formatDateISO(now));
  const [page, setPage] = useState<number>(1);

  const baseUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/datastore/mosquito/`;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (dateStart) p.set("date_start", dateStart);
    if (dateEnd) p.set("date_end", dateEnd);
    if (state) p.set("state", state);
    if (municipality) p.set("municipality", municipality);
    p.set("page", String(page));
    return p;
  }, [dateStart, dateEnd, state, municipality, page]);

  const isDownloadDisabled = !municipality && !state;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">municipality</label>
        <input
          type="text"
          placeholder="e.g. Ponta Porã"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">state</label>
        <input
          type="text"
          maxLength={2}
          placeholder="e.g. MS"
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <LocalizedDateInput label="date_start" value={dateStart} onChange={setDateStart} />
        <LocalizedDateInput label="date_end" value={dateEnd} onChange={setDateEnd} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">page</label>
        <input
          type="number"
          min={1}
          value={page}
          onChange={(e) => setPage(Math.max(1, parseInt(e.target.value) || 1))}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <DownloadButtons baseUrl={baseUrl} params={params} disabled={isDownloadDisabled} />
    </div>
  );
}

export function ContaovosView({ config }: { config: EndpointDetails }) {
  const formatDateISO = (date: Date) => date.toISOString().split('T')[0];
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);

  const [geocode, setGeocode] = useState<number | undefined>(3304557);
  const [startDate, setStartDate] = useState<string>(formatDateISO(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDateISO(now));
  const [geoJson, setGeoJson] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const secret = FRONTEND_SECRET || "";
        const geo = await fetch("/api/maps/states", {
          headers: { "x-internal-secret": secret }
        }).then(r => r.json());
        setGeoJson(geo);
      } catch (e) {
        console.error("Failed to load map:", e);
      }
    }
    load();
  }, []);

  const handleStartDateChange = (value: string) => {
    if (endDate && value > endDate) return;
    setStartDate(value);
  };

  const handleEndDateChange = (value: string) => {
    if (startDate && value < startDate) return;
    setEndDate(value);
  };

  return (
    <EndpointLayout
      title={config.name}
      description={config.description}
      moreInfoLink={config.more_info_link}
      endpoint={config.endpoint}
      source={config.source}
      dataVariables={config.data_variables}
      apiBuilder={<MosquitoApiBuilder />}
      controls={
        <>
          <div className="flex flex-col gap-1 relative z-20">
            <label className="text-xs font-medium opacity-70">Municipality</label>
            <CitySearch value={geocode} onChange={setGeocode} />
          </div>

          <div className="flex gap-2 relative">
            <LocalizedDateInput label="Start Date" value={startDate} onChange={handleStartDateChange} />
            <LocalizedDateInput label="End Date" value={endDate} onChange={handleEndDateChange} />
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <EggCountChart
          geocode={String(geocode)}
          start={startDate}
          end={endDate}
          geoJson={geoJson}
        />
      </div>
    </EndpointLayout>
  );
}
