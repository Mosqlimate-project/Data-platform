"use client";

import React, { useState, useEffect } from "react";
import { LineChart, Series, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import { fetchCases, fetchPredictionData, CaseData, PredictionRowData } from "@/lib/dashboard/api";
import { Loader2 } from "lucide-react";

interface ChartProps {
  baseUrl: string;
  disease: string;
  admLevel: number;
  adm0: string;
  adm1?: string;
  adm2?: string;
  start: string;
  end: string;
  caseDefinition: "reported" | "probable";
  predictionIds?: number[];
  sprint?: boolean;
  height?: string | number;
}

export default function EmbeddedQuantitativeLineChart({
  baseUrl,
  disease,
  admLevel,
  adm0,
  adm1,
  adm2,
  start,
  end,
  caseDefinition,
  predictionIds = [],
  sprint = false,
  height = "400px"
}: ChartProps) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<Series>({ labels: [], data: [] });
  const [chartPredictions, setChartPredictions] = useState<QuantitativePrediction[]>([]);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const fetchUrl = (path: string) => `${baseUrl.replace(/\/$/, "")}${path}`;

        const casesData: CaseData[] = await fetch(
          fetchUrl(`/api/vis/dashboard/cases?disease=${disease}&adm_level=${admLevel}&sprint=${sprint}&case_definition=${caseDefinition}&start=${start}&end=${end}&adm_0=${adm0}${adm1 ? `&adm_1=${adm1}` : ""}${adm2 ? `&adm_2=${adm2}` : ""}`)
        ).then(res => res.json());

        const predsData = await Promise.all(
          predictionIds.map(async (id) => {
            const data: PredictionRowData[] = await fetch(fetchUrl(`/api/vis/dashboard/prediction/${id}/`)).then(res => res.json());
            return {
              id,
              color: "#44aa99",
              data: {
                labels: data.map(d => new Date(d.date)),
                data: data.map(d => d.pred),
                lower_90: data.map(d => d.lower_90 ?? null),
                upper_90: data.map(d => d.upper_90 ?? null),
                lower_50: data.map(d => d.lower_50 ?? null),
                upper_50: data.map(d => d.upper_50 ?? null),
              }
            };
          })
        );

        setChartData({
          labels: casesData.map(d => new Date(d.date)),
          data: casesData.map(d => d.cases)
        });
        setChartPredictions(predsData);
      } catch (err) {
        console.error("Failed to load embedded chart", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [disease, adm0, adm1, adm2, start, end, caseDefinition, predictionIds.join(","), sprint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full" style={{ height }}>
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <LineChart
      data={chartData}
      predictions={chartPredictions}
      height={height}
      activeIntervals={new Set(predictionIds)}
      dataSeriesName={caseDefinition === "probable" ? "Probable Cases" : "Reported Cases"}
    />
  );
}
