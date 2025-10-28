'use client';

import { useState } from "react";

export function AccordionCard({
  title,
  isOpen,
  onClick,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-md overflow-hidden transition-all">
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 font-medium border-b border-[var(--color-border)] transition-colors ${isOpen
          ? "bg-[var(--color-accent)] text-white"
          : "bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
          }`}
      >
        {title}
      </button>
      {isOpen && <div className="p-4 text-sm bg-[var(--color-bg)]">{children}</div>}
    </div>
  );
}

export function Layout({
  title,
  description,
  dataVariables,
  chartOptions,
}: {
  title: string;
  description: string;
  dataVariables?: { variable: string; type: string; description: string }[];
  chartOptions?: { option: string; type: string }[];
}) {
  const [openCard, setOpenCard] = useState<"Charts" | string | null>("Charts");
  const [selectedChart, setSelectedChart] = useState<string>(
    chartOptions && chartOptions.length > 0 ? chartOptions[0].option : "Default"
  );
  const [selectedDisease, setSelectedDisease] = useState("dengue");
  const [geocode, setGeocode] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const toggleCard = (key: string) =>
    setOpenCard((prev) => (prev === key ? null : key));

  const chartStyles: Record<string, string> = {
    Default: "bg-gray-100 text-gray-800",
    Heatmap: "bg-red-100 text-red-800",
    Timeline: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-6">
      <div
        className={`border rounded-md p-4 flex items-center justify-center text-sm font-medium transition-colors ${chartStyles[selectedChart] || "bg-gray-100 text-gray-800"
          }`}
      >
        {selectedChart ? `Preview for "${selectedChart}" chart` : "Select a chart"}
      </div>

      <div className="flex flex-col gap-3">
        <AccordionCard
          title="Description"
          isOpen={openCard === "Description"}
          onClick={() => toggleCard("Description")}
        >
          <p className="opacity-80">{description}</p>
        </AccordionCard>

        {dataVariables && (
          <AccordionCard
            title="Data Dictionary"
            isOpen={openCard === "Data Dictionary"}
            onClick={() => toggleCard("Data Dictionary")}
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="px-3 py-1">Variable</th>
                  <th className="px-3 py-1">Type</th>
                  <th className="px-3 py-1">Description</th>
                </tr>
              </thead>
              <tbody>
                {dataVariables.map((v) => (
                  <tr
                    key={v.variable}
                    className="border-b border-[var(--color-border)]"
                  >
                    <td className="px-3 py-1">{v.variable}</td>
                    <td className="px-3 py-1">{v.type}</td>
                    <td className="px-3 py-1">{v.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AccordionCard>
        )}

        {chartOptions && chartOptions.length > 0 && (
          <AccordionCard
            title="Charts / Visualization"
            isOpen={openCard === "Charts"}
            onClick={() => toggleCard("Charts")}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Disease</label>
                <select
                  value={selectedDisease}
                  onChange={(e) => setSelectedDisease(e.target.value)}
                  className="border rounded-md px-2 py-1"
                >
                  <option value="dengue">Dengue</option>
                  <option value="chikungunya">Chikungunya</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Geocode</label>
                <input
                  type="number"
                  value={geocode}
                  onChange={(e) => setGeocode(Number(e.target.value))}
                  className="border rounded-md px-2 py-1"
                />
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-md px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-md px-2 py-1"
                  />
                </div>
              </div>
            </div>
          </AccordionCard>

        )}
      </div>
    </div>
  );
}
