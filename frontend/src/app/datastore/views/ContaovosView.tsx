"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import CitySearch from "../components/CitySearch";
import { EggCountChart } from "../components/charts/ContaovosCharts";
import { NEXT_PUBLIC_BACKEND_URL } from "@/lib/env";

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group mt-4">
      <label className="text-xs font-semibold uppercase tracking-wider opacity-70 block mb-2">
        Generated URL
      </label>
      <div className="relative">
        <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto border border-border pr-8">
          {code}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background border border-border shadow-sm hover:bg-muted transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Copy URL"
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
        </button>
      </div>
    </div>
  );
}

function MosquitoApiBuilder() {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [municipality, setMunicipality] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [dateStart, setDateStart] = useState<string>(formatDate(oneYearAgo));
  const [dateEnd, setDateEnd] = useState<string>(formatDate(now));
  const [page, setPage] = useState<number>(1);

  const baseUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/datastore/mosquito/`;
  const params = new URLSearchParams();

  if (dateStart) params.set("date_start", dateStart);
  if (dateEnd) params.set("date_end", dateEnd);
  if (state) params.set("state", state);
  if (municipality) params.set("municipality", municipality);
  if (page > 1) params.set("page", String(page));

  const url = `${baseUrl}?${params.toString()}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">municipality</label>
        <input
          type="text"
          placeholder="e.g. Ponta Porã"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
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
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium opacity-70">date_start</label>
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium opacity-70">date_end</label>
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">page</label>
        <input
          type="number"
          min={1}
          value={page}
          onChange={(e) => setPage(parseInt(e.target.value) || 1)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
        />
      </div>

      <CodeBlock code={url} />
    </div>
  );
}

export function ContaovosView({ config }: { config: EndpointDetails }) {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(now.getDate() - 365);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const [geocode, setGeocode] = useState<number | undefined>(3304557);
  const [startDate, setStartDate] = useState<string>(formatDate(oneYearAgo));
  const [endDate, setEndDate] = useState<string>(formatDate(now));

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
      endpoint={config.endpoint}
      dataVariables={config.data_variables}
      apiBuilder={<MosquitoApiBuilder />}
      controls={
        <>
          <div className="flex flex-col gap-1 relative z-20">
            <label className="text-xs font-medium opacity-70">Municipality</label>
            <CitySearch value={geocode} onChange={setGeocode} />
          </div>

          <div className="flex gap-2 relative z-10">
            <div className="flex flex-col flex-1 gap-1">
              <label className="text-xs font-medium opacity-70">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
              />
            </div>
            <div className="flex flex-col flex-1 gap-1">
              <label className="text-xs font-medium opacity-70">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="border rounded-md px-2 py-1 bg-background text-foreground text-sm"
              />
            </div>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-6 w-full">
        <EggCountChart
          geocode={String(geocode)}
          start={startDate}
          end={endDate}
        />
      </div>
    </EndpointLayout>
  );
}
