"use client";

import React from "react";
import { LineChart, Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface DashboardChartProps {
  disease: string;
  sprint: boolean;
  caseDefinition: string;
  chartData: Series;
  chartPredictions: QuantitativePrediction[];
  globalIntervals: Set<string>;
  visibleBounds: Set<number>;
  isHistoricalLoading: boolean;
}

export default function DashboardChart({
  disease,
  sprint,
  caseDefinition,
  chartData,
  chartPredictions,
  globalIntervals,
  visibleBounds,
  isHistoricalLoading
}: DashboardChartProps) {
  const { t } = useTranslation('common');

  const seriesName = sprint
    ? t('dashboard.chart.probable_cases')
    : `${caseDefinition === "probable" ? t('dashboard.filters.probable') : t('dashboard.filters.reported')} ${t('dashboard.chart.cases')}`;

  return (
    <div className="bg-bg border border-border rounded-lg shadow-sm p-4 h-[500px] relative">
      {isHistoricalLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/40 backdrop-blur-[1px] rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {disease ? (
        <LineChart
          data={chartData}
          predictions={chartPredictions}
          globalIntervals={globalIntervals}
          visibleBounds={visibleBounds}
          height="100%"
          dataSeriesName={seriesName}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-secondary">
          {t('dashboard.chart.select_disease')}
        </div>
      )}
    </div>
  );
}
