import React from "react";
import {
  Search, X, Loader2, ArrowUp, ArrowDown, ArrowUpDown,
  Eye, EyeOff, ChevronLeft, ChevronRight
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Prediction } from "@/lib/dashboard/api";
import { type QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";

interface DashboardPredictionsProps {
  uniqueModels: string[];
  modelSearch: string;
  setModelSearch: (val: string) => void;
  selectedModels: string[];
  toggleModel: (model: string) => void;
  predictionSearch: string;
  setPredictionSearch: (val: string) => void;
  predictionsLoading: boolean;
  filteredAndSortedPredictions: Prediction[];
  paginatedPredictions: Prediction[];
  chartPredictions: QuantitativePrediction[];
  loadingPredictions: number[];
  activeIntervals: Set<number>;
  togglePrediction: (p: Prediction) => void;
  toggleInterval: (id: number) => void;
  handleSort: (key: string) => void;
  sortConfig: { key: string | null; direction: "asc" | "desc" };
  handleSelectAll: () => void;
  handleClearAll: () => void;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  itemsPerPage: number;
}

export default function DashboardPredictions({
  uniqueModels,
  modelSearch,
  setModelSearch,
  selectedModels,
  toggleModel,
  predictionSearch,
  setPredictionSearch,
  predictionsLoading,
  filteredAndSortedPredictions,
  paginatedPredictions,
  chartPredictions,
  loadingPredictions,
  activeIntervals,
  togglePrediction,
  toggleInterval,
  handleSort,
  sortConfig,
  handleSelectAll,
  handleClearAll,
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage
}: DashboardPredictionsProps) {
  const { t } = useTranslation('common');

  const SCORE_COLUMNS = [
    { key: "mae_score", label: t('dashboard.score_columns.mae') },
    { key: "mse_score", label: t('dashboard.score_columns.mse') },
    { key: "crps_score", label: t('dashboard.score_columns.crps') },
    { key: "interval_score", label: t('dashboard.score_columns.interval') },
    { key: "wis_score", label: t('dashboard.score_columns.wis') },
  ];

  return (
    <div className="bg-bg border border-border rounded-lg shadow-sm p-4">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 flex-shrink-0 border-r border-border pr-4">
          <h3 className="text-lg font-bold mb-4 text-text">{t('dashboard.panels.models')}</h3>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-secondary" />
            <input
              type="text"
              placeholder={t('dashboard.search.models')}
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs border border-border bg-bg text-text rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {modelSearch && (
              <button onClick={() => setModelSearch("")} className="absolute right-2 top-2.5 text-secondary hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto">
            {uniqueModels.map((model) => (
              <button
                key={model}
                onClick={() => toggleModel(model)}
                className={`text-left text-xs px-3 py-2 rounded transition-colors border ${selectedModels.includes(model)
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium"
                  : "bg-hover text-secondary border-transparent hover:bg-accent hover:text-white"
                  }`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text">{t('dashboard.panels.predictions')}</h3>
            <div className="flex items-center gap-2">
              <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-500/10 border border-blue-500/30 rounded hover:bg-blue-500/20">
                {t('dashboard.actions.select_10')}
              </button>
              <button onClick={handleClearAll} className="px-3 py-1.5 text-xs font-medium text-secondary bg-bg border border-border rounded hover:bg-hover">
                {t('dashboard.actions.clear')}
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-secondary" />
            <input
              type="text"
              placeholder={t('dashboard.search.predictions')}
              value={predictionSearch}
              onChange={(e) => setPredictionSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-border bg-bg text-text rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {predictionSearch && (
              <button onClick={() => setPredictionSearch("")} className="absolute right-2 top-2 text-secondary hover:text-text">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-secondary uppercase bg-hover border-b border-border">
                <tr>
                  <th className="px-3 py-2 w-[40%]">{t('dashboard.table.model')}</th>
                  <th className="px-3 py-2 text-center w-[10%]">{t('dashboard.table.interval_bounds')}</th>
                  {SCORE_COLUMNS.map((col) => (
                    <th key={col.key} className="px-3 py-2 text-right cursor-pointer hover:bg-accent" onClick={() => handleSort(col.key)}>
                      <div className="flex items-center justify-end gap-1">
                        {col.label}
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : <ArrowUpDown size={14} className="opacity-50" />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedPredictions.map((p) => {
                  const selectedPred = chartPredictions.find(cp => cp.id === p.id);
                  const isSelected = !!selectedPred;
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border cursor-pointer ${!isSelected && 'hover:bg-hover'}`}
                      onClick={() => togglePrediction(p)}
                      style={isSelected ? { backgroundColor: `${selectedPred.color}20` } : undefined}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className="text-xs font-mono text-secondary mt-1 min-w-[30px]">
                            {loadingPredictions.includes(p.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            ) : (
                              `#${p.id}`
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-2 items-center">
                              <span className="bg-blue-500/10 text-blue-600 text-xs px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                                {p.owner}
                              </span>
                              <a
                                href={`/${p.owner}/${p.repository}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="bg-hover text-text text-xs px-2 py-0.5 rounded border border-border font-mono hover:bg-accent hover:underline hover:text-white transition-colors"
                              >
                                {p.repository}
                              </a>
                            </div>
                            <div className="text-xs text-secondary flex gap-2 items-center">
                              <span>{p.start} - {p.end}</span>
                              {p.sprint && (
                                <span className="px-2 py-0.5 bg-accent text-white rounded-full text-[10px]">
                                  IMDC {p.sprint}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleInterval(p.id)}
                          disabled={!isSelected}
                          className={`p-1 rounded ${isSelected ? (activeIntervals.has(p.id) ? "text-blue-600" : "text-secondary") : "opacity-30"}`}
                        >
                          {activeIntervals.has(p.id) ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </td>
                      {SCORE_COLUMNS.map((col) => {
                        const score = p.scores.find((s) => s.name === col.key);
                        return (
                          <td key={col.key} className="px-3 py-2 text-right font-mono">
                            {score?.score != null ? score.score.toFixed(2) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 border-t border-border pt-3">
            <div className="text-xs text-secondary">
              {t('dashboard.pagination.showing', {
                start: ((currentPage - 1) * itemsPerPage) + 1,
                end: Math.min(currentPage * itemsPerPage, filteredAndSortedPredictions.length),
                total: filteredAndSortedPredictions.length
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded border border-border disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <div className="text-xs font-medium self-center">{t('dashboard.pagination.page', { current: currentPage, total: totalPages })}</div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 rounded border border-border disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
