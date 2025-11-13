"use client";

import { useState, cloneElement, isValidElement, ReactNode } from "react";

export function AccordionCard({
  title,
  isOpen,
  onClick,
  children,
}: {
  title: string;
  isOpen: boolean;
  onClick: () => void;
  children: ReactNode;
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

export function EndpointLayout({
  title,
  description,
  dataVariables,
  chartOptions,
  endpoint,
  children,
}: {
  title: string;
  endpoint: string;
  description: string;
  dataVariables?: { variable: string; type: string; description: string }[];
  chartOptions?: { option: string; type: string }[];
  children?: ReactNode;
}) {
  const [openCard, setOpenCard] = useState<string | null>("Description");
  const toggleCard = (key: string) => setOpenCard((prev) => (prev === key ? null : key));

  const [geocode, setGeocode] = useState<number>(3304557);
  const [startDate, setStartDate] = useState("2023-01-01");
  const [endDate, setEndDate] = useState("2023-03-03");
  const [selectedDisease, setSelectedDisease] = useState("dengue");

  const handleStartDateChange = (v: string) => {
    if (endDate && v > endDate) return;
    setStartDate(v);
  };
  const handleEndDateChange = (v: string) => {
    if (startDate && v < startDate) return;
    setEndDate(v);
  };

  const injectedChildren = isValidElement(children)
    ? cloneElement(children, {
      geocode: String(geocode),
      start: startDate,
      end: endDate,
      disease: selectedDisease,
    })
    : children;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="border rounded-md p-4 flex flex-col items-center justify-center text-sm font-medium w-full bg-[var(--color-bg)]">
        {injectedChildren || (
          <p className="opacity-60 text-center">
            No chart visualization defined for this endpoint.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full md:w-2/5">
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
                  <tr key={v.variable} className="border-b border-[var(--color-border)]">
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
              {endpoint === "/infodengue/" && (
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
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Geocode</label>
                <input
                  type="number"
                  value={geocode || ""}
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
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="border rounded-md px-2 py-1"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
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
