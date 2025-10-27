'use client';

import { useState } from "react";

function AccordionCard({
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

function EndpointLayout({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const [openCard, setOpenCard] = useState<string | null>("Description");
  const [chartOption, setChartOption] = useState<string>("Default");

  const toggleCard = (key: string) => {
    setOpenCard((prev) => (prev === key ? null : key));
  };

  return (
    <div className="grid grid-cols-[3fr_2fr] gap-6">
      <div className="border rounded-md p-4 flex items-center justify-center text-sm text-[var(--color-text)] opacity-80">
        {chartOption === "Default" && "Default Chart View"}
        {chartOption === "Heatmap" && "Heatmap Visualization"}
        {chartOption === "Timeline" && "Timeline Visualization"}
      </div>

      <div className="flex flex-col gap-3">
        <AccordionCard
          title="Description"
          isOpen={openCard === "Description"}
          onClick={() => toggleCard("Description")}
        >
          <p className="opacity-80">{description}</p>
        </AccordionCard>

        <AccordionCard
          title="Data Dictionary"
          isOpen={openCard === "Data Dictionary"}
          onClick={() => toggleCard("Data Dictionary")}
        >
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="pb-1">Variable</th>
                <th className="pb-1">Required</th>
                <th className="pb-1">Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>geocode</td>
                <td>Yes</td>
                <td>Number</td>
              </tr>
              <tr>
                <td>start_date</td>
                <td>No</td>
                <td>Date</td>
              </tr>
              <tr>
                <td>end_date</td>
                <td>No</td>
                <td>Date</td>
              </tr>
            </tbody>
          </table>
        </AccordionCard>

        <AccordionCard
          title="Charts / Visualization"
          isOpen={openCard === "Charts"}
          onClick={() => toggleCard("Charts")}
        >
          <div className="flex flex-col gap-2">
            {["Default", "Heatmap", "Timeline"].map((opt) => (
              <button
                key={opt}
                onClick={() => setChartOption(opt)}
                className={`text-left px-3 py-2 rounded-md border transition ${chartOption === opt
                  ? "bg-[var(--color-accent)] text-white border-transparent"
                  : "border-[var(--color-border)] hover:bg-[var(--color-border)]"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </AccordionCard>
      </div>
    </div>
  );
}

export default function DatastorePage() {
  const [selected, setSelected] = useState<number | null>(null);

  const endpoints = [
    {
      name: "/infodengue/",
      tags: ["municipality", "temperature"],
      description:
        "Provides municipality-level dengue, temperature, and population data for public health analysis.",
    },
    {
      name: "/climate/",
      tags: ["state", "aggregated", "stats"],
      description:
        "Displays aggregated climate data for each state, including temperature, rainfall, and variability indexes.",
    },
    {
      name: "/mosquito/",
      tags: ["predictions", "forecast"],
      description:
        "Forecasts mosquito vector density using predictive models based on environmental and epidemiological data.",
    },
  ];

  const renderContent = () => {
    if (selected === null) {
      return (
        <>
          <h2 className="text-lg font-semibold mb-4">Endpoint Details</h2>
          <p className="text-[var(--color-text)] opacity-80">
            Select an endpoint above to view its specifications.
          </p>
        </>
      );
    }

    const endpoint = endpoints[selected];
    return (
      <EndpointLayout title={endpoint.name} description={endpoint.description} />
    );
  };

  return (
    <section className="p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold text-[var(--color-text)]">Datastore</h1>

      <div className="overflow-x-auto flex gap-4 pb-2">
        {endpoints.map((ep, i) => (
          <div
            key={i}
            onClick={() => setSelected(i)}
            className={`min-w-[240px] h-40 rounded-md flex flex-col justify-between p-4 cursor-pointer border transition-all shadow-sm ${selected === i
              ? "bg-[var(--color-accent)] text-white shadow-none"
              : "bg-[var(--color-bg)] text-[var(--color-text)] hover:shadow-none"
              }`}
          >
            <div>
              <h3 className="font-semibold mb-2">{ep.name}</h3>
              <div className="flex flex-wrap gap-2">
                {ep.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-2 py-1 rounded-md border ${selected === i
                      ? "border-white/40 bg-white/10"
                      : "border-[var(--color-border)] bg-[var(--color-bg)]"
                      }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <a
              href="#"
              className={`text-sm font-medium self-end ${selected === i
                ? "text-white/80"
                : "text-[var(--color-text)] opacity-80"
                }`}
            >
              Saiba mais →
            </a>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-6">
        {renderContent()}
      </div>
    </section>
  );
}
