"use client"

import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { LineChart } from "./components/LineChart";

interface PredictionPoint {
  date: string;
  pred: number;
  upper_50?: number;
  lower_50?: number;
  upper_95: number;
  lower_95: number;
}

interface PredictionData {
  id: number;
  color: string;
  data: PredictionPoint[];
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "predictions_state" | "predictions_municipal" | "howto">("overview");
  const [disease, setDisease] = useState("Dengue");
  const [state, setState] = useState("Acre");

  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);

  useEffect(() => {
    async function getPrediction() {
      try {
        const res = await fetch("/api/registry/predictions/1796");
        if (!res.ok) throw new Error("Failed to fetch prediction");

        const data = await res.json();
        console.log("Fetched prediction:", data);

        const formatted: PredictionData = {
          id: data.id,
          color: data.color,
          data: data.data.map((d: any) => ({
            date: d.date,
            pred: d.pred,
            upper_50: d.upper_50,
            lower_50: d.lower_50,
            upper_95: d.upper_95,
            lower_95: d.lower_95,
          })),
        };

        setPredictionData([formatted]);
      } catch (err) {
        console.error(err);
      }
    }

    getPrediction();
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar onSelect={setActiveTab} />

      <main className="flex-1 border-l border-[var(--color-border)] p-6">
        {activeTab === "overview" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">Overview</h1>
          </div>
        )}

        {activeTab === "predictions_state" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">Predictions</h1>

            <div className="flex gap-4 mb-4">
              <select
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className="border rounded p-2"
              >
                <option>Dengue</option>
                <option>Zika</option>
              </select>

              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="border rounded p-2"
              >
                <option>Acre</option>
                <option>Amazonas</option>
              </select>
            </div>

            <div className="w-full mb-6 border rounded">
              <LineChart predictions={predictionData} />
            </div>

            <div className="flex gap-6">
              <div className="flex-2 border rounded p-4">
                <h2 className="font-bold mb-2">Models</h2>
              </div>

              <div className="flex-1 border rounded p-4">
                <h2 className="font-bold mb-2">Predictions</h2>
              </div>
            </div>
          </div>
        )}

        {activeTab === "predictions_municipal" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">Predictions</h1>

            <div className="flex gap-4 mb-4">
              <select
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                className="border rounded p-2"
              >
                <option>Dengue</option>
                <option>Zika</option>
              </select>

              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="border rounded p-2"
              >
                <option>Acre</option>
                <option>Amazonas</option>
              </select>
            </div>

            <div className="w-full mb-6 border rounded">
              <LineChart predictions={predictionData} />
            </div>

            <div className="flex gap-6">
              <div className="flex-2 border rounded p-4">
                <h2 className="font-bold mb-2">Models</h2>
              </div>

              <div className="flex-1 border rounded p-4">
                <h2 className="font-bold mb-2">Predictions</h2>
              </div>
            </div>
          </div>
        )}

        {activeTab === "howto" && (
          <div>
            <h1 className="text-2xl font-bold mb-4">How to use</h1>
          </div>
        )}
      </main>
    </div>
  );
}
