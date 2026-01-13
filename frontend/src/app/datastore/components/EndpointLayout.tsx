"use client";

import { useState, ReactNode } from "react";

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
    <div className="border rounded-md overflow-hidden transition-all bg-card">
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 font-medium border-b border-border transition-colors flex justify-between items-center ${isOpen
            ? "bg-muted/50 text-foreground"
            : "bg-card text-muted-foreground hover:bg-muted/30"
          }`}
      >
        <span>{title}</span>
        <span className="text-xs opacity-50">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && <div className="p-4 text-sm bg-card text-card-foreground">{children}</div>}
    </div>
  );
}

interface EndpointLayoutProps {
  title: string;
  endpoint: string;
  description: string;
  dataVariables?: { variable: string; type: string; description: string }[];
  chartOptions?: { option: string; type: string }[];
  children?: ReactNode;
  controls?: ReactNode;
}

export function EndpointLayout({
  title,
  description,
  dataVariables,
  chartOptions,
  endpoint,
  children,
  controls,
}: EndpointLayoutProps) {
  const [openCard, setOpenCard] = useState<string | null>(controls ? "Controls" : "Description");

  const toggleCard = (key: string) => {
    setOpenCard((prev) => (prev === key ? null : key));
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8">
      <div className="flex-1 min-w-0">
        <div className="border rounded-md p-6 bg-card text-card-foreground shadow-sm">
          <div className="mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block text-muted-foreground">
              GET {endpoint}
            </code>
          </div>

          {children || (
            <div className="py-12 text-center text-muted-foreground opacity-60">
              No visualization content available.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full xl:w-[400px] shrink-0">

        {controls && (
          <AccordionCard
            title="Visualization Controls"
            isOpen={openCard === "Controls"}
            onClick={() => toggleCard("Controls")}
          >
            <div className="flex flex-col gap-4">
              {controls}
            </div>
          </AccordionCard>
        )}

        <AccordionCard
          title="Description"
          isOpen={openCard === "Description"}
          onClick={() => toggleCard("Description")}
        >
          <p className="opacity-90 leading-relaxed">{description}</p>
        </AccordionCard>

        {dataVariables && dataVariables.length > 0 && (
          <AccordionCard
            title="Data Dictionary"
            isOpen={openCard === "Data Dictionary"}
            onClick={() => toggleCard("Data Dictionary")}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 py-2 font-semibold">Variable</th>
                    <th className="px-2 py-2 font-semibold">Type</th>
                    <th className="px-2 py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {dataVariables.map((v) => (
                    <tr key={v.variable} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2 font-mono text-primary">{v.variable}</td>
                      <td className="px-2 py-2 opacity-70">{v.type}</td>
                      <td className="px-2 py-2 opacity-90">{v.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionCard>
        )}

        {chartOptions && chartOptions.length > 0 && (
          <AccordionCard
            title="Available Parameters"
            isOpen={openCard === "Parameters"}
            onClick={() => toggleCard("Parameters")}
          >
            <div className="mb-2 text-xs text-muted-foreground">
              These parameters can be used to filter the API response:
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 py-2 font-semibold">Parameter</th>
                    <th className="px-2 py-2 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {chartOptions.map((opt) => (
                    <tr key={opt.option} className="border-b border-border/50 last:border-0">
                      <td className="px-2 py-2 font-mono text-primary">{opt.option}</td>
                      <td className="px-2 py-2 opacity-70">{opt.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionCard>
        )}
      </div>
    </div>
  );
}
