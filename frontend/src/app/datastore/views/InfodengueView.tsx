"use client";

import { useState, useMemo } from "react";
import Papa from "papaparse";
import { Calendar as CalendarIcon, FileJson, FileSpreadsheet, Lock, Loader2 } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import CitySearch from "../components/CitySearch";
import { NEXT_PUBLIC_BACKEND_URL } from "@/lib/env";
import { useDateFormatter } from "@/hooks/useDateFormatter";
import { TotalCases, DailyCasesChart, RtChart } from "../components/charts/InfodengueCharts";
import { useAuth } from "@/components/AuthProvider";

const VALID_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

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
      const filename = `infodengue_export_${new Date().toISOString().split('T')[0]}.${format}`;
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
            Select City or UF
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
            } catch (err) { }
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

function InfodengueApiBuilder() {
  const formatDateISO = (date: Date) => date.toISOString().split('T')[0];
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);

  const [disease, setDisease] = useState<string>("dengue");
  const [geocode, setGeocode] = useState<number | undefined>();
  const [uf, setUf] = useState<string>("");
  const [start, setStart] = useState<string>(formatDateISO(oneYearAgo));
  const [end, setEnd] = useState<string>(formatDateISO(now));
  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(100);

  const isValidUf = useMemo(() => VALID_UFS.includes(uf.toUpperCase()), [uf]);
  const isDownloadDisabled = !geocode && !isValidUf;

  const baseUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/datastore/infodengue/`;

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (disease) p.set("disease", disease);
    if (start) p.set("start", start);
    if (end) p.set("end", end);
    if (geocode) p.set("geocode", String(geocode));
    if (uf && isValidUf) p.set("uf", uf.toUpperCase());
    p.set("page", String(page));
    p.set("per_page", String(perPage));
    return p;
  }, [disease, start, end, geocode, uf, isValidUf, page, perPage]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">disease</label>
        <select
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="dengue">dengue</option>
          <option value="chikungunya">chikungunya</option>
          <option value="zika">zika</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">geocode</label>
        <CitySearch
          value={geocode}
          onChange={(val) => {
            setGeocode(val);
            if (val) setUf("");
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">uf</label>
        <input
          type="text"
          maxLength={2}
          placeholder="e.g. RJ"
          value={uf}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();
            setUf(val);
            if (val.length > 0) setGeocode(undefined);
          }}
          className={`border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 transition-all outline-none ${uf && !isValidUf ? "border-destructive ring-1 ring-destructive" : "focus:ring-1 focus:ring-primary border-border"
            }`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <LocalizedDateInput label="start" value={start} onChange={setStart} />
        <LocalizedDateInput label="end" value={end} onChange={setEnd} />
      </div>

      <div className="grid grid-cols-2 gap-2">
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium opacity-70">per_page</label>
          <input
            type="number"
            min={1}
            max={300}
            value={perPage}
            onChange={(e) => setPerPage(Math.min(300, Math.max(1, parseInt(e.target.value) || 1)))}
            className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9 outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <DownloadButtons baseUrl={baseUrl} params={params} disabled={isDownloadDisabled} />
    </div>
  );
}

export function InfodengueView({ config }: { config: EndpointDetails }) {
  const formatDateISO = (date: Date) => date.toISOString().split('T')[0];
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);

  const [disease, setDisease] = useState<string>("dengue");
  const [geocode, setGeocode] = useState<number | undefined>(3304557);
  const [startDate, setStartDate] = useState<string>(formatDateISO(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDateISO(now));

  return (
    <EndpointLayout
      title={config.name}
      description={config.description}
      moreInfoLink={config.more_info_link}
      endpoint={config.endpoint}
      source={config.source}
      dataVariables={config.data_variables}
      apiBuilder={<InfodengueApiBuilder />}
      controls={
        <>
          <div className="flex flex-col gap-1 relative z-20">
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

          <div className="flex flex-col gap-1 relative z-10">
            <label className="text-xs font-medium opacity-70">Municipality</label>
            <CitySearch value={geocode} onChange={setGeocode} />
          </div>

          <div className="flex gap-2 relative">
            <LocalizedDateInput label="Start Date" value={startDate} onChange={setStartDate} />
            <LocalizedDateInput label="End Date" value={endDate} onChange={setEndDate} />
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-8 w-full">
        <TotalCases geocode={String(geocode)} disease={disease} start={startDate} end={endDate} />
        <DailyCasesChart geocode={String(geocode)} disease={disease} start={startDate} end={endDate} />
        <RtChart geocode={String(geocode)} disease={disease} start={startDate} end={endDate} />
      </div>
    </EndpointLayout>
  );
}
