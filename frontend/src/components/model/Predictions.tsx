'use client';

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

interface PredictionScore {
  name: string;
  score: number;
}

export interface ModelPrediction {
  id: number;
  date: string;
  commit: string;
  adm_0: string;
  adm_1?: string | null;
  adm_2?: string | null;
  adm_3?: string | null;
  description?: string | null;
  start?: string | null;
  end?: string | null;
  sprint?: number | null;
  scores: PredictionScore[];
  published?: boolean;
}

interface PredictionsListProps {
  predictions: ModelPrediction[];
  canManage?: boolean;
}

export default function PredictionsList({ predictions, canManage = false }: PredictionsListProps) {
  const { i18n } = useTranslation();
  const safePredictions = predictions || [];
  const availableScores = safePredictions.find(p => p.scores && p.scores.length > 0)?.scores.map((s) => s.name) || [];
  const [selectedMetric, setSelectedMetric] = useState<string>(availableScores[0] || "");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatScoreName = (name: string) => {
    return name.replace("_score", "").toUpperCase();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  const handlePublishToggle = async (id: number, currentStatus: boolean) => {
    console.log(`Toggle publish for ${id}. New status: ${!currentStatus}`);
  };

  const filteredPredictions = safePredictions.filter((pred) => {
    if (canManage) return true;
    return pred.published === true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight"></h2>

        <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground pl-2">
            Metric:
          </span>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="h-8 bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            {availableScores.map((score) => (
              <option key={score} value={score}>
                {formatScoreName(score)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPredictions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            No predictions found.
          </div>
        ) : (
          filteredPredictions.map((pred) => {
            const activeScore = pred.scores?.find((s) => s.name === selectedMetric);

            return (
              <div
                key={pred.id}
                className={`group flex flex-col border rounded-xl overflow-hidden bg-card hover:shadow-md transition-all duration-200 ${canManage && !pred.published ? "opacity-75 border-dashed border-yellow-400/50" : ""
                  }`}
              >
                <div className="px-4 py-2 bg-muted/20 border-b flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    #{pred.id}
                  </span>

                  <div className="flex items-center gap-3">
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pred.published}
                          onChange={() => handlePublishToggle(pred.id, !!pred.published)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          id={`publish-${pred.id}`}
                        />
                        <label
                          htmlFor={`publish-${pred.id}`}
                          className="text-[10px] uppercase font-semibold text-muted-foreground cursor-pointer select-none"
                        >
                          Published
                        </label>
                      </div>
                    )}

                    <div className="h-4 w-px bg-border mx-1"></div>

                    <Link
                      href="#"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="View Dashboard"
                    >
                      <LayoutDashboard size={16} />
                    </Link>
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-semibold" suppressHydrationWarning>
                        {formatDate(pred.date)}
                      </div>
                    </div>
                    <div className="px-2 py-1 bg-muted rounded text-xs font-mono text-muted-foreground">
                      {pred.commit.substring(0, 7)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm">
                      {pred.adm_0 && <span className="font-medium text-foreground"> {pred.adm_0} </span>}
                      {pred.adm_1 && <span className="text-muted-foreground"> {pred.adm_1}</span>}
                      {pred.adm_2 && <span className="text-muted-foreground"> {pred.adm_2}</span>}
                      {pred.adm_3 && <span className="text-muted-foreground"> {pred.adm_3}</span>}
                    </div>
                  </div>

                  {(pred.start && pred.end) && (
                    <div className="space-y-1">
                      <div className="text-sm flex items-center gap-2">
                        <span suppressHydrationWarning>{formatDate(pred.start)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span suppressHydrationWarning>{formatDate(pred.end)}</span>
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
          })
        )}
      </div>
    </div>
  );
}
