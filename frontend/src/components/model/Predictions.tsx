"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Search,
  X,
  Loader2,
  Trash2,
  AlertTriangle,
  Table as TableIcon,
  LineChart as ChartIcon,
  Download,
  Info,
  BookOpen
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, QuantitativePrediction, Series } from "@/components/dashboard/QuantitativeLineChart";
import MarkdownRenderer from "@/components/model/MarkdownRenderer";
import { FRONTEND_SECRET } from "@/lib/env";

interface PredictionScore {
  name: string;
  score: number;
}

export interface ModelPrediction {
  id: number;
  date: string;
  commit: string;
  description?: string | null;
  start?: string | null;
  end?: string | null;
  case_definition: string;
  sprint?: number | null;
  scores: PredictionScore[];
  published?: boolean;
  disease_code: string;
  category: string;
  adm_level: number;
  adm_0_name: string;
  adm_0_code: string;
  adm_1_name?: string | null;
  adm_1_code?: string | null;
  adm_2_name?: string | null;
  adm_2_code?: string | null;
  adm_3_name?: string | null;
  adm_3_code?: string | null;
}

interface PredictionRowData {
  date: string;
  pred: number;
  lower_50?: number;
  upper_50?: number;
  lower_80?: number;
  upper_80?: number;
  lower_90?: number;
  upper_90?: number;
  lower_95?: number;
  upper_95?: number;
}

interface CaseData {
  date: string;
  cases: number;
}

interface PredictionsListProps {
  predictions: ModelPrediction[];
  canManage?: boolean;
  owner?: string;
  modelName?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const PredictionCard = memo(function PredictionCard({
  pred,
  canManage,
  selectedMetric,
  isUpdating,
  isActiveChart,
  onToggle,
  onDeleteRequest,
  onViewChart,
  formatDate,
  formatScoreName,
  getDashboardLink,
  t,
}: {
  pred: ModelPrediction;
  canManage: boolean;
  selectedMetric: string;
  isUpdating: boolean;
  isActiveChart: boolean;
  onToggle: (id: number, status: boolean) => void;
  onDeleteRequest: (id: number) => void;
  onViewChart: (pred: ModelPrediction) => void;
  formatDate: (d: string) => string;
  formatScoreName: (s: string) => string;
  getDashboardLink: (pred: ModelPrediction) => string;
  t: (key: string, options?: any) => string;
}) {
  const activeScore = pred.scores?.find((s) => s.name === selectedMetric);
  const dashboardUrl = getDashboardLink(pred);

  return (
    <div
      onClick={() => onViewChart(pred)}
      className={`group flex flex-col border rounded-xl overflow-hidden bg-card transition-all duration-200 cursor-pointer ${isActiveChart ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
        } ${canManage && !pred.published ? "opacity-75 border-dashed border-yellow-400/50" : ""}`}
    >
      <div className="px-4 py-2 bg-muted/20 border-b flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          #{pred.id}
        </span>

        <div className="flex items-center gap-3">
          {canManage && (
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!pred.published}
                  disabled={isUpdating}
                  onChange={() => onToggle(pred.id, !!pred.published)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                  id={`publish-${pred.id}`}
                />
                <label
                  htmlFor={`publish-${pred.id}`}
                  className={`text-[10px] uppercase font-semibold text-muted-foreground cursor-pointer select-none ${isUpdating ? "opacity-50" : ""}`}
                >
                  {isUpdating ? t("model_predictions.saving") : t("model_predictions.published")}
                </label>
              </div>
              <button
                onClick={() => onDeleteRequest(pred.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title={t("common:actions.delete")}
              >
                <Trash2 size={14} color="red" />
              </button>
            </div>
          )}

          {pred.published && (
            <>
              <div className="h-4 w-px bg-border mx-1"></div>
              <Link
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-primary transition-colors"
                title={t("model_predictions.view_dashboard")}
              >
                <LayoutDashboard size={16} />
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-foreground" suppressHydrationWarning>
              {formatDate(pred.date)}
            </div>
          </div>
          <div className="px-2 py-1 bg-muted rounded text-xs font-mono text-muted-foreground">
            {pred.commit.substring(0, 7)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm">
            {pred.adm_0_name && <span className="font-medium text-foreground"> {pred.adm_0_name} </span>}
            {pred.adm_1_name && <span className="text-muted-foreground"> {pred.adm_1_name}</span>}
            {pred.adm_2_name && <span className="text-muted-foreground"> {pred.adm_2_name}</span>}
            {pred.adm_3_name && <span className="text-muted-foreground"> {pred.adm_3_name}</span>}
          </div>
        </div>

        {pred.start && pred.end && (
          <div className="space-y-1">
            <div className="text-sm flex items-center gap-2">
              <span className="text-foreground" suppressHydrationWarning>{formatDate(pred.start)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground" suppressHydrationWarning>{formatDate(pred.end)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {pred.disease_code && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border uppercase tracking-wider">
              {pred.disease_code}
            </div>
          )}

          {pred.sprint && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              IMDC {pred.sprint}
            </div>
          )}
        </div>
      </div>

      <div className="bg-muted/30 p-4 border-t flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedMetric ? formatScoreName(selectedMetric) : "SCORE"}
        </span>
        <span className="text-xl font-bold font-mono text-primary">
          {activeScore ? activeScore.score.toFixed(4) : "-"}
        </span>
      </div>
    </div>
  );
});

export default function PredictionsList({ predictions, canManage = false, owner = "", modelName = "" }: PredictionsListProps) {
  const { t, i18n } = useTranslation(['common', 'models']);
  const router = useRouter();
  const [localPredictions, setLocalPredictions] = useState<ModelPrediction[]>(predictions || []);
  const availableScores = localPredictions.find((p) => p.scores && p.scores.length > 0)?.scores.map((s) => s.name) || [];
  const [selectedMetric, setSelectedMetric] = useState<string>(availableScores[0] || "");
  const [selectedDisease, setSelectedDisease] = useState<string>("all");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const debouncedSearchQuery = useDebounce(inputValue, 300);
  const [activeChartId, setActiveChartId] = useState<number | null>(null);
  const [chartData, setChartData] = useState<QuantitativePrediction | null>(null);
  const [rawTableData, setRawTableData] = useState<PredictionRowData[]>([]);
  const [historicalCases, setHistoricalCases] = useState<Series>({ labels: [], data: [] });
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [visibleIntervals, setVisibleIntervals] = useState<string[]>(["50", "90"]);

  const repoPath = `${owner}/${modelName}`;

  const tutorialMarkdown = `
### ${t("model_predictions.usage_examples")}

The \`mosqlient\` package accepts a pandas DataFrame with the required keys. 
[Read the full documentation here](https://mosqlimate-client.readthedocs.io/en/latest/tutorials/API/registry/).

\`\`\`python
from mosqlient import upload_prediction

repository = "${repoPath}"
prediction = [
    {
        "date": "2024-01-01",
        "lower_95": 0.1,
        "lower_50": 0.4,
        "pred": 1,
        "upper_50": 1.1,
        "upper_95": 1.4,
    },
]

pred = upload_prediction(
    api_key=api_key,
    disease="A90",
    repository=repository,
    commit="e90c5c099e6d3043a41ab992bf3d9da02a83f150",
    case_definition="probable",
    published=True,
    adm_level=1,
    adm_0="BRA",
    adm_1=33,
    prediction=prediction
)
\`\`\`
`;

  const uniqueDiseases = useMemo(() => {
    const diseases = localPredictions.map(p => p.disease_code).filter(Boolean);
    return Array.from(new Set(diseases));
  }, [localPredictions]);

  const availableBounds = useMemo(() => {
    if (!rawTableData.length) return [];
    const firstRow = rawTableData[0];
    const bounds: string[] = [];
    if ("lower_50" in firstRow) bounds.push("50");
    if ("lower_80" in firstRow) bounds.push("80");
    if ("lower_90" in firstRow) bounds.push("90");
    if ("lower_95" in firstRow) bounds.push("95");
    return bounds;
  }, [rawTableData]);

  const activeIntervalsSet = useMemo(() => {
    return new Set(visibleIntervals);
  }, [visibleIntervals]);

  const filteredChartData = useMemo(() => {
    if (!chartData) return null;
    const keep = (i: string) => activeIntervalsSet.has(i);

    return {
      ...chartData,
      data: {
        ...chartData.data,
        lower_50: keep("50") ? chartData.data.lower_50 : null,
        upper_50: keep("50") ? chartData.data.upper_50 : null,
        lower_80: keep("80") ? chartData.data.lower_80 : null,
        upper_80: keep("80") ? chartData.data.upper_80 : null,
        lower_90: keep("90") ? chartData.data.lower_90 : null,
        upper_90: keep("90") ? chartData.data.upper_90 : null,
        lower_95: keep("95") ? chartData.data.lower_95 : null,
        upper_95: keep("95") ? chartData.data.upper_95 : null,
      }
    };
  }, [chartData, activeIntervalsSet]);

  const toggleInterval = (key: string) => {
    setVisibleIntervals(prev =>
      prev.includes(key) ? prev.filter(i => i !== key) : [...prev, key]
    );
  };

  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { setLocalPredictions(predictions || []); }, [predictions]);
  const formatScoreName = useCallback((name: string) => name.replace("_score", "").toUpperCase(), []);
  const formatDate = useCallback((d: string) => d ? new Date(d).toLocaleDateString(i18n.language, { year: "numeric", month: "numeric", day: "numeric" }) : "", [i18n.language]);

  const handlePublishToggle = useCallback(async (id: number, current: boolean) => {
    const next = !current;
    setLocalPredictions(prev => prev.map(p => p.id === id ? { ...p, published: next } : p));
    setIsUpdating(id);
    try {
      const res = await fetch(`/api/registry/prediction/${id}/published`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: next }) });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setLocalPredictions(prev => prev.map(p => p.id === id ? { ...p, published: current } : p));
    } finally { setIsUpdating(null); }
  }, [router]);

  const handleDeletePrediction = async () => {
    if (!deleteModalId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/registry/predictions/${deleteModalId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLocalPredictions(prev => prev.filter(p => p.id !== deleteModalId));
      if (activeChartId === deleteModalId) {
        setActiveChartId(null);
        setChartData(null);
        setRawTableData([]);
        setHistoricalCases({ labels: [], data: [] });
      }
      setDeleteModalId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadCSV = () => {
    if (!rawTableData.length) return;
    const headers = ["date", "pred", "lower_50", "upper_50", "lower_80", "upper_80", "lower_90", "upper_90", "lower_95", "upper_95"];
    const csvContent = [
      headers.join(","),
      ...rawTableData.map(d => [
        `"${d.date}"`, d.pred,
        d.lower_50 ?? "", d.upper_50 ?? "",
        d.lower_80 ?? "", d.upper_80 ?? "",
        d.lower_90 ?? "", d.upper_90 ?? "",
        d.lower_95 ?? "", d.upper_95 ?? ""
      ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prediction_${activeChartId}.csv`);
    link.click();
  };

  const handleViewChart = useCallback(async (pred: ModelPrediction) => {
    if (activeChartId === pred.id) return;
    setActiveChartId(pred.id); setIsChartLoading(true);
    setChartData(null);
    setRawTableData([]);
    setHistoricalCases({ labels: [], data: [] });

    try {
      const predRes = await fetch(`/api/vis/dashboard/prediction/${pred.id}`, {
        headers: { "Content-Type": "application/json", "x-internal-secret": FRONTEND_SECRET || "" }
      });
      if (!predRes.ok) throw new Error("Failed to fetch prediction");
      const jsonResponse = await predRes.json();
      const data: PredictionRowData[] = jsonResponse.data || jsonResponse;
      setRawTableData(data);
      setChartData({
        id: pred.id, color: "#2563eb",
        data: {
          labels: data.map(d => new Date(d.date)),
          data: data.map(d => d.pred),
          lower_50: data.map(d => d.lower_50 ?? null),
          upper_50: data.map(d => d.upper_50 ?? null),
          lower_80: data.map(d => d.lower_80 ?? null),
          upper_80: data.map(d => d.upper_80 ?? null),
          lower_90: data.map(d => d.lower_90 ?? null),
          upper_90: data.map(d => d.upper_90 ?? null),
          lower_95: data.map(d => d.lower_95 ?? null),
          upper_95: data.map(d => d.upper_95 ?? null),
        },
      });

      if (pred.start && pred.end) {
        const caseParams = new URLSearchParams({
          disease: pred.disease_code, adm_level: pred.adm_level.toString(),
          sprint: pred.sprint ? "true" : "false", case_definition: pred.case_definition || "reported",
          start: pred.start, end: pred.end,
        });
        if (pred.adm_0_code) caseParams.set("adm_0", String(pred.adm_0_code));
        if (pred.adm_1_code) caseParams.set("adm_1", String(pred.adm_1_code));
        const casesRes = await fetch(`/api/vis/dashboard/cases?${caseParams.toString()}`, {
          headers: { "Content-Type": "application/json", "x-internal-secret": FRONTEND_SECRET || "" }
        });
        if (casesRes.ok) {
          const cases: CaseData[] = await casesRes.json();
          setHistoricalCases({
            labels: cases.map(c => new Date(c.date)),
            data: cases.map(c => c.cases)
          });
        }
      }
    } catch (error) { setChartData(null); } finally { setIsChartLoading(false); }
  }, [activeChartId]);

  useEffect(() => { if (!hasInitialized && localPredictions.length > 0) { const f = localPredictions.find(p => p.published); if (f) handleViewChart(f); setHasInitialized(true); } }, [localPredictions, hasInitialized, handleViewChart]);

  const getDashboardLink = useCallback((pred: ModelPrediction) => {
    const p = new URLSearchParams();
    p.set("sprint", pred.sprint ? "true" : "false");
    p.set("adm_level", pred.adm_level.toString());
    p.set("disease", pred.disease_code);
    p.set("prediction_id", pred.id.toString());
    p.set("case_definition", pred.case_definition || "reported");
    if (pred.adm_0_code) p.set("adm_0", String(pred.adm_0_code));
    if (pred.adm_level >= 1 && pred.adm_1_code) p.set("adm_1", String(pred.adm_1_code));
    if (pred.adm_level >= 2 && pred.adm_2_code) p.set("adm_2", String(pred.adm_2_code));
    if (pred.adm_level >= 3 && pred.adm_3_code) p.set("adm_3", String(pred.adm_3_code));
    return `/dashboard/${pred.category === "categorical" ? "categorical" : "quantitative"}?${p.toString()}`;
  }, []);

  const filtered = useMemo(() => localPredictions.filter(p => {
    if (!canManage && !p.published) return false;

    const matchesDisease = selectedDisease === "all" || p.disease_code === selectedDisease;
    if (!matchesDisease) return false;

    if (!debouncedSearchQuery) return true;
    const q = debouncedSearchQuery.toLowerCase();
    const metricValue = p.scores?.find(s => s.name === selectedMetric)?.score.toString() || "";
    const searchableFields = [p.id, p.commit, p.description, p.disease_code, p.case_definition, p.adm_0_name, p.adm_1_name, p.adm_2_name, p.adm_3_name, p.adm_0_code, p.adm_1_code, p.adm_2_code, p.adm_3_code, metricValue];
    return searchableFields.some(field => field !== null && field !== undefined && String(field).toLowerCase().includes(q));
  }), [localPredictions, debouncedSearchQuery, canManage, selectedMetric, selectedDisease]);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="w-full bg-card border rounded-xl p-12">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center">
            <MarkdownRenderer content={`# ${t("model_predictions.empty_title")}\n${t("model_predictions.empty_desc")} [${t("model_predictions.view_docs")}](https://api.mosqlimate.org/docs/${i18n.language}/registry/POST/predictions/)`} />
          </div>
          {canManage && (
            <div className="pt-8 border-t space-y-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <BookOpen size={20} />
                <span>{t("model_predictions.python_rec")}</span>
              </div>
              <div className="bg-muted/30 p-6 rounded-xl border font-mono text-xs overflow-auto">
                <MarkdownRenderer content={tutorialMarkdown} />
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-sm flex items-center gap-3">
                <Info size={16} className="text-blue-600 shrink-0" />
                <div className="text-blue-700 dark:text-blue-300 [&_p]:m-0">
                  <MarkdownRenderer content={t("model_predictions.need_api_key")} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {deleteModalId && (
        <div className="fixed bg-bg inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-bg border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle size={24} color="red" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t("common.actions.delete")}</h3>
              </div>
              <p className="text-muted-foreground text-sm">{t("models.predictions.delete_confirm", { id: deleteModalId })}</p>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-muted/30 border-t">
              <button disabled={isDeleting} onClick={() => setDeleteModalId(null)} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors disabled:opacity-50">{t("common.actions.cancel")}</button>
              <button disabled={isDeleting} onClick={handleDeletePrediction} className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-all flex items-center gap-2 disabled:opacity-50">{isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} color="red" />}{t("common.actions.delete")}</button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-[550px] w-full bg-card border rounded-xl p-4 relative flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <h3 className="font-semibold text-sm">
            {activeChartId ? t("model_predictions.prediction_id", { id: activeChartId }) : t("model_predictions.select_prediction")}
          </h3>

          {activeChartId && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 border rounded-lg p-1 bg-muted/20">
                {availableBounds.map((interval) => (
                  <button
                    key={interval}
                    onClick={() => toggleInterval(interval)}
                    className={`px-3 py-1 text-[11px] rounded transition-all ${visibleIntervals.includes(interval) ? "bg-primary text-primary-foreground font-black shadow-md ring-2 ring-primary/20 scale-105" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {interval}%
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/20">
                <button onClick={() => setViewMode("chart")} className={`p-1.5 rounded-md transition-all ${viewMode === "chart" ? "bg-background shadow-md text-primary ring-1 ring-border" : "text-muted-foreground hover:bg-muted"}`} title="View Chart"><ChartIcon size={16} /></button>
                <button onClick={() => setViewMode("table")} className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-background shadow-md text-primary ring-1 ring-border" : "text-muted-foreground hover:bg-muted"}`} title="View Data Table"><TableIcon size={16} /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={downloadCSV} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-all" title="Download CSV"><Download size={16} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 relative">
          {isChartLoading && (<div className="absolute inset-0 flex items-center justify-center bg-card/80 z-20"><Loader2 className="animate-spin text-primary" /></div>)}

          {chartData ? (
            viewMode === "chart" ? (
              <div className="h-[400px]">
                <LineChart
                  data={historicalCases}
                  predictions={filteredChartData ? [filteredChartData] : []}
                  globalIntervals={activeIntervalsSet}
                  visibleBounds={chartData ? new Set([chartData.id]) : new Set()}
                  height="100%"
                />
              </div>
            ) : (
              <div className="overflow-auto max-h-[400px] border rounded-lg relative">
                <table className="w-full text-[11px] text-left border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-bg">
                    <tr>
                      <th className="p-2 font-bold whitespace-nowrap bg-card border-b">date</th>
                      <th className="p-2 font-bold whitespace-nowrap text-primary bg-card border-b">pred</th>
                      {availableBounds.map(b => (<th key={b} className="p-2 font-bold whitespace-nowrap text-muted-foreground bg-card border-b">lower_{b} - upper_{b}</th>))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawTableData.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors border-b last:border-0">
                        <td className="p-2 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="p-2 font-mono font-medium text-primary">{row.pred.toFixed(2)}</td>
                        {availableBounds.map(b => (
                          <td key={b} className="p-2 font-mono text-muted-foreground">
                            {typeof row[`lower_${b}` as keyof PredictionRowData] === 'number' ? row[`lower_${b}` as keyof PredictionRowData] : "-"} / {typeof row[`upper_${b}` as keyof PredictionRowData] === 'number' ? row[`upper_${b}` as keyof PredictionRowData] : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : !isChartLoading && (
            <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
              {activeChartId ? t("model_predictions.unable_load") : t("model_predictions.select_below")}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder={t("model_predictions.search_placeholder")} value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full pl-9 pr-8 py-2 text-sm border rounded-md bg-background focus:ring-1 focus:ring-primary" />
            {inputValue && (<button onClick={() => setInputValue("")} className="absolute right-2 top-2.5 text-muted-foreground"><X className="h-4 w-4" /></button>)}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {uniqueDiseases.length > 1 && (
              <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
                <span className="text-sm font-medium text-muted-foreground pl-2">{t("model_sidebar.tags.disease", "Disease")}:</span>
                <select value={selectedDisease} onChange={e => setSelectedDisease(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground dark:text-slate-100">
                  <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{t("common:all", "All")}</option>
                  {uniqueDiseases.map(d => (<option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{d}</option>))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
              <span className="text-sm font-medium text-muted-foreground pl-2">{t("model_predictions.metric_label")}</span>
              <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground dark:text-slate-100">
                {availableScores.map(s => (<option key={s} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{formatScoreName(s)}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">{debouncedSearchQuery ? t("model_predictions.no_matches") : t("model_predictions.no_found")}</div>
        ) : (
          filtered.map(p => (
            <PredictionCard key={p.id} pred={p} canManage={canManage} selectedMetric={selectedMetric} isUpdating={isUpdating === p.id} isActiveChart={activeChartId === p.id} onToggle={handlePublishToggle} onDeleteRequest={setDeleteModalId} onViewChart={handleViewChart} formatDate={formatDate} formatScoreName={formatScoreName} getDashboardLink={getDashboardLink} t={t} />
          ))
        )}
      </div>
    </div>
  );
}
