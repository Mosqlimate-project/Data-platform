'use client';

import { useState } from "react";
import { Layout } from "./components/Endpoint";
import { endpoints } from "./data";

export default function DatastorePage() {
  const [selected, setSelected] = useState<number | null>(null);

  const renderContent = () => {

    if (selected === null) return (
      <>
        <h2 className="text-lg font-semibold mb-4">Endpoint Details</h2>
        <p className="text-[var(--color-text)] opacity-80">
          Select an endpoint above to view its specifications.
        </p>
      </>
    );

    const endpoint = endpoints[selected];
    return (
      <Layout
        title={endpoint.name}
        endpoint={endpoint.endpoint}
        description={endpoint.description}
        dataVariables={endpoint.data_variables}
        chartOptions={endpoint.chart_options}
      />
    );
  };

  return (
    <section className="md:p-8 md:flex md:flex-col md:gap-8 md:max-w-[1800px] md:w-full">
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
              href={ep.more_info_link || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-medium self-end ${selected === i
                  ? "text-white/80"
                  : "text-[var(--color-text)] opacity-80"
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              More info →
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
