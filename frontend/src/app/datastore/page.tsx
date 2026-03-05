'use client';

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouter, useSearchParams } from "next/navigation";
import { getEndpoints } from "./data";
import { ClimateView } from "./views/ClimateView";
import { InfodengueView } from "./views/InfodengueView";
import { ContaovosView } from "./views/ContaovosView";
import { NEXT_PUBLIC_DOCS_URL } from "@/lib/env";
import { EpiScannerView } from "./views/EpiscannerView";

export default function DatastorePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const endpoints = getEndpoints(t);

  const currentEndpointParam = searchParams.get('endpoint');

  const selectedIndex = endpoints.findIndex(
    (ep) => ep.endpoint.replace(/\//g, '') === currentEndpointParam
  );

  const selected = selectedIndex !== -1 ? selectedIndex : 0;

  const handleSelect = (index: number) => {
    const endpointName = endpoints[index].endpoint.replace(/\//g, '');
    const params = new URLSearchParams(searchParams.toString());
    params.set('endpoint', endpointName);

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const renderContent = () => {
    const endpoint = endpoints[selected];
    if (!endpoint) return null;

    switch (endpoint.endpoint) {
      case "/climate/":
        return <ClimateView config={endpoint} />;
      case "/infodengue/":
        return <InfodengueView config={endpoint} />;
      case "/mosquito/":
        return <ContaovosView config={endpoint} />;
      case "/episcanner/":
        return <EpiScannerView config={endpoint} />;
      default:
        return <div>Unknown Endpoint</div>;
    }
  };

  return (
    <>
      <section className="md:p-8 md:flex md:flex-col md:gap-8 md:max-w-[1800px] md:w-full">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Datastore</h1>

        <div className="z-10 overflow-x-auto flex gap-4 pb-2">
          {endpoints.map((ep, i) => {
            const docUrl = `${NEXT_PUBLIC_DOCS_URL}/datastore/GET${ep.endpoint}`;

            return (
              <div
                key={i}
                onClick={() => handleSelect(i)}
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
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm font-medium self-end hover:underline ${selected === i ? "text-white/80" : "opacity-80"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  More info →
                </a>
              </div>
            );
          })}
        </div>

        <div className="z-10 flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md p-6">
          {renderContent()}
        </div>
      </section>
    </>
  );
}
