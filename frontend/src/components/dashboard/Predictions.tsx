import React from "react";
import {
  Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown,
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
  globalIntervals: Set<string>;
  toggleGlobalInterval: (val: string) => void;
  visibleBounds: Set<number>;
  toggleIndividualVisibility: (id: number) => void;
  togglePredictionLine: (p: Prediction) => void;
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
  filteredAndSortedPredictions,
  paginatedPredictions,
  chartPredictions,
  loadingPredictions,
  globalIntervals,
  toggleGlobalInterval,
  visibleBounds,
  toggleIndividualVisibility,
  togglePredictionLine,
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
  const INTERVAL_OPTIONS = ["50", "80", "90", "95"];

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
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[400px]">
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

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text">{t('dashboard.panels.predictions')}</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                  {t('dashboard.table.interval_bounds')}:
                </span>
                {INTERVAL_OPTIONS.map((interval) => (
                  <label key={interval} className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded border-border text-blue-600 focus:ring-blue-500 bg-bg"
                      checked={globalIntervals.has(interval)}
                      onChange={() => toggleGlobalInterval(interval)}
                    />
                    <span className={`text-xs transition-colors ${globalIntervals.has(interval) ? 'text-text font-bold' : 'text-secondary group-hover:text-text'}`}>
                      {interval}%
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 border-l border-border pl-4">
                <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-500/10 border border-blue-500/30 rounded hover:bg-blue-500/20">
                  {t('dashboard.actions.select_10')}
                </button>
                <button onClick={handleClearAll} className="px-3 py-1.5 text-xs font-medium text-secondary bg-bg border border-border rounded hover:bg-hover">
                  {t('dashboard.actions.clear')}
                </button>
              </div>
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-secondary uppercase bg-hover border-b border-border">
                <tr>
                  <th className="px-3 py-2 w-[50%]">{t('dashboard.table.model')}</th>
                  <th className="px-3 py-2 text-center w-[10%]">
                    {t('dashboard.table.interval_bounds')}:
                  </th>
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
                  const boundsVisible = visibleBounds.has(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border cursor-pointer transition-colors ${isSelected ? '' : 'hover:bg-hover'}`}
                      onClick={() => togglePredictionLine(p)}
                      style={isSelected ? { backgroundColor: `${selectedPred.color}15` } : undefined}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className="text-xs font-mono text-secondary mt-1 min-w-[30px]">
                            {loadingPredictions.includes(p.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                            ) : `#${p.id}`}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-2 items-center">
                              <span className="bg-blue-500/10 text-blue-600 text-xs px-2 py-0.5 rounded border border-blue-500/20 font-mono">
                                {p.owner}
                              </span>
                              <span className="font-mono text-xs">{p.repository}</span>
                            </div>
                            <div className="text-xs text-secondary">{p.start} - {p.end}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleIndividualVisibility(p.id);
                          }}
                          className={`p-1.5 rounded-full transition-all ${boundsVisible ? 'bg-blue-500/20 text-blue-600' : 'text-secondary opacity-30 hover:opacity-100'}`}
                        >
                          {boundsVisible ? <Eye size={18} /> : <EyeOff size={18} />}
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

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div className="text-xs text-secondary">
              {t('dashboard.pagination.showing', {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, filteredAndSortedPredictions.length),
                total: filteredAndSortedPredictions.length
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1 rounded border border-border bg-bg text-secondary disabled:opacity-30 hover:bg-hover transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-xs rounded transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-secondary hover:bg-hover border border-transparent'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1 rounded border border-border bg-bg text-secondary disabled:opacity-30 hover:bg-hover transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
