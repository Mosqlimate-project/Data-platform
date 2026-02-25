"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { EndpointLayout } from "../components/EndpointLayout";
import { EndpointDetails } from "../types";
import { NEXT_PUBLIC_BACKEND_URL } from "@/lib/env";
import { useTranslation } from "react-i18next";

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

function EpiScannerApiBuilder() {
  const currentYear = new Date().getFullYear();
  const [disease, setDisease] = useState<string>("dengue");
  const [uf, setUf] = useState<string>("SP");
  const [year, setYear] = useState<number>(currentYear);

  const baseUrl = `${NEXT_PUBLIC_BACKEND_URL}/api/datastore/episcanner/`;
  const params = new URLSearchParams();

  if (disease) params.set("disease", disease);
  if (uf) params.set("uf", uf);
  if (year) params.set("year", String(year));

  const url = `${baseUrl}?${params.toString()}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">disease</label>
        <select
          value={disease}
          onChange={(e) => setDisease(e.target.value)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
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
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium opacity-70">year</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
          className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
        />
      </div>

      <CodeBlock code={url} />
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
      endpoint={config.endpoint}
      dataVariables={config.data_variables}
      apiBuilder={<EpiScannerApiBuilder />}
      controls={
        <div className="grid grid-cols-3 gap-2 relative z-20">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Disease</label>
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
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
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium opacity-70">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || currentYear)}
              className="border rounded-md px-2 py-1 bg-background text-foreground text-sm h-9"
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
