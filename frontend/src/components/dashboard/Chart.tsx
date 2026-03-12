"use client";

import React from "react";
import { LineChart, Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import { useTranslation } from "react-i18next";

interface DashboardChartProps {
  disease: string;
  sprint: boolean;
  caseDefinition: string;
  chartData: Series;
  chartPredictions: QuantitativePrediction[];
  globalIntervals: Set<string>;
  visibleBounds: Set<number>;
}

export default function DashboardChart({
  disease,
  sprint,
  caseDefinition,
  chartData,
  chartPredictions,
  globalIntervals,
  visibleBounds
}: DashboardChartProps) {
  const { t } = useTranslation('common');

  const seriesName = sprint
    ? t('dashboard.chart.probable_cases')
    : `${caseDefinition === "probable" ? t('dashboard.filters.probable') : t('dashboard.filters.reported')} ${t('dashboard.chart.cases')}`;

  return (
    <div className="bg-bg border border-border rounded-lg shadow-sm p-4 h-[500px]">
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
