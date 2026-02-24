"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Search, X, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import MarkdownRenderer from "@/components/model/MarkdownRenderer";

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
  lower_90?: number;
  upper_90?: number;
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

        {pred.sprint && (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            IMDC {pred.sprint}
          </div>
        )}
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

export default function PredictionsList({ predictions, canManage = false }: PredictionsListProps) {
  const { t, i18n } = useTranslation(['common', 'models']);
  const router = useRouter();
  const [localPredictions, setLocalPredictions] = useState<ModelPrediction[]>(predictions || []);
  const availableScores = localPredictions.find((p) => p.scores && p.scores.length > 0)?.scores.map((s) => s.name) || [];
  const [selectedMetric, setSelectedMetric] = useState<string>(availableScores[0] || "");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const debouncedSearchQuery = useDebounce(inputValue, 300);
  const [activeChartId, setActiveChartId] = useState<number | null>(null);
  const [chartData, setChartData] = useState<QuantitativePrediction | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

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
      }
      setDeleteModalId(null);
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewChart = useCallback(async (pred: ModelPrediction) => {
    if (activeChartId === pred.id) return;
    setActiveChartId(pred.id); setIsChartLoading(true); setChartData(null);
    try {
      const res = await fetch(`/api/vis/dashboard/prediction/${pred.id}`);
      const data: PredictionRowData[] = await res.json();
      setChartData({
        id: pred.id, color: "#2563eb",
        data: {
          labels: data.map(d => new Date(d.date)), data: data.map(d => d.pred),
          lower_50: data.map(d => d.lower_50 ?? null), upper_50: data.map(d => d.upper_50 ?? null),
          lower_90: data.map(d => d.lower_90 ?? null), upper_90: data.map(d => d.upper_90 ?? null),
        },
      });
    } catch { setChartData(null); } finally { setIsChartLoading(false); }
  }, [activeChartId]);

  useEffect(() => { if (!hasInitialized && localPredictions.length > 0) { const f = localPredictions.find(p => p.published); if (f) handleViewChart(f); setHasInitialized(true); } }, [localPredictions, hasInitialized, handleViewChart]);

  const getDashboardLink = useCallback((pred: ModelPrediction) => {
    const p = new URLSearchParams();
    p.set("sprint", pred.sprint ? "true" : "false");
    p.set("adm_level", pred.adm_level.toString());
    p.set("disease", pred.disease_code);
    p.set("prediction_id", pred.id.toString());
    p.set("case_definition", pred.case_definition || "reported");
    if (pred.adm_0_code) p.set("adm_0", pred.adm_0_code);
    if (pred.adm_level >= 1 && pred.adm_1_code) p.set("adm_1", pred.adm_1_code);
    if (pred.adm_level >= 2 && pred.adm_2_code) p.set("adm_2", pred.adm_2_code);
    if (pred.adm_level >= 3 && pred.adm_3_code) p.set("adm_3", pred.adm_3_code);
    return `/dashboard/${pred.category === "categorical" ? "categorical" : "quantitative"}?${p.toString()}`;
  }, []);

  const filtered = useMemo(() => localPredictions.filter(p => {
    if (!canManage && !p.published) return false;
    if (!debouncedSearchQuery) return true;
    const q = debouncedSearchQuery.toLowerCase();
    return p.id.toString().includes(q) || p.commit.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.adm_0_name?.toLowerCase().includes(q) || p.adm_1_name?.toLowerCase().includes(q);
  }), [localPredictions, debouncedSearchQuery, canManage]);

  if (!predictions || predictions.length === 0) return (<div className="w-full bg-card border rounded-xl p-12"><div className="max-w-3xl mx-auto"><MarkdownRenderer content={`## ${t("model_predictions.empty_title")}\n${t("model_predictions.empty_desc")}`} /></div></div>);

  return (
    <div className="space-y-6">
      {deleteModalId && (
        <div className="fixed bg-bg inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-bg border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2 bg-destructive/10 rounded-full">
                  <AlertTriangle size={24} color="orange" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t("common:actions.delete")}</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                {t("models:predictions.delete_confirm", { id: deleteModalId })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 bg-muted/30 border-t">
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModalId(null)}
                className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors disabled:opacity-50"
              >
                {t("common:actions.cancel")}
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeletePrediction}
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} color="red" />}
                {t("common:actions.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-[500px] w-full bg-card border rounded-xl p-4 relative flex flex-col">
        <h3 className="font-semibold text-sm mb-4">{activeChartId ? t("model_predictions.prediction_id", { id: activeChartId }) : t("model_predictions.select_prediction")}</h3>
        <div className="flex-1 relative">
          {isChartLoading && (<div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10"><Loader2 className="animate-spin text-primary" /></div>)}
          {chartData ? (<LineChart data={{ labels: [], data: [] }} predictions={[chartData]} activeIntervals={new Set([chartData.id])} height="100%" />) : !isChartLoading && (<div className="flex items-center justify-center h-full text-muted-foreground text-sm">{activeChartId ? t("model_predictions.unable_load") : t("model_predictions.select_below")}</div>)}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder={t("model_predictions.search_placeholder")} value={inputValue} onChange={e => setInputValue(e.target.value)} className="w-full pl-9 pr-8 py-2 text-sm border rounded-md bg-background focus:ring-1 focus:ring-primary" />{inputValue && (<button onClick={() => setInputValue("")} className="absolute right-2 top-2.5 text-muted-foreground"><X className="h-4 w-4" /></button>)}</div>
        <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border"><span className="text-sm font-medium text-muted-foreground pl-2">{t("model_predictions.metric_label")}</span><select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer">{availableScores.map(s => (<option key={s} value={s}>{formatScoreName(s)}</option>))}</select></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            {debouncedSearchQuery ? t("model_predictions.no_matches") : t("model_predictions.no_found")}
          </div>
        ) : (
          filtered.map(p => (
            <PredictionCard
              key={p.id}
              pred={p}
              canManage={canManage}
              selectedMetric={selectedMetric}
              isUpdating={isUpdating === p.id}
              isActiveChart={activeChartId === p.id}
              onToggle={handlePublishToggle}
              onDeleteRequest={(id) => setDeleteModalId(id)}
              onViewChart={handleViewChart}
              formatDate={formatDate}
              formatScoreName={formatScoreName}
              getDashboardLink={getDashboardLink}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
