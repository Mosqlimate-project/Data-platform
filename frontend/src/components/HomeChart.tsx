"use client";

import React, { useState, useEffect } from "react";
import { LineChart, Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import { fetchCases, fetchPredictionData, AdmLevel, CaseDefinition } from "@/lib/dashboard/api";
import { Loader2 } from "lucide-react";

interface HomeChartProps {
  predictionId: number;
  disease: string;
  admLevel: AdmLevel;
  sprint: boolean;
  caseDefinition: CaseDefinition;
  adm0: string;
  adm1?: string;
  adm2?: string;
}

export default function HomeChart({
  predictionId,
  disease,
  admLevel,
  sprint,
  caseDefinition,
  adm0,
  adm1,
  adm2
}: HomeChartProps) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<Series>({ labels: [], data: [] });
  const [predictions, setPredictions] = useState<QuantitativePrediction[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const predRows = await fetchPredictionData(predictionId);

        if (predRows && predRows.length > 0) {
          const sorted = [...predRows].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          const start = sorted[0].date;
          const end = sorted[sorted.length - 1].date;

          try {
            const cases = await fetchCases(
              disease,
              admLevel,
              sprint,
              caseDefinition,
              start,
              end,
              adm0,
              adm1,
              adm2
            );

            setChartData({
              labels: cases.map((d) => new Date(d.date)),
              data: cases.map((d) => d.cases),
            });
          } catch (caseError) {
            console.error("Historical cases fetch failed, showing only predictions", caseError);
            setChartData({
              labels: sorted.map((d) => new Date(d.date)),
              data: [],
            });
          }

          setPredictions([{
            id: predictionId,
            color: "#44aa99",
            data: {
              labels: predRows.map((d) => new Date(d.date)),
              data: predRows.map((d) => d.pred),
              lower_95: predRows.map((d) => d.lower_95 ?? null),
              upper_95: predRows.map((d) => d.upper_95 ?? null),
              lower_50: predRows.map((d) => d.lower_50 ?? null),
              upper_50: predRows.map((d) => d.upper_50 ?? null),
            },
          }]);
        }
      } catch (error) {
        console.error("HomeChart failed to fetch prediction data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [predictionId, disease, admLevel, sprint, caseDefinition, adm0, adm1, adm2]);

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center bg-border/20 rounded-2xl border border-border/50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-border/10 p-4 rounded-2xl border border-border/50 shadow-inner">
      <LineChart
        data={chartData}
        predictions={predictions}
        height={500}
        activeIntervals={new Set(["95", "50"])}
      />
    </div>
  );
}
