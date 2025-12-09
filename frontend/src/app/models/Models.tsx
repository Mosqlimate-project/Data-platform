"use client";

import { useState } from "react";
import Thumbnail from "./components/Model";
import SearchBar from "./components/SearchBar";

type Model = {
  repo: string;
  type: string;
  predictions: number;
  lastUpdate: string | Date;
};

export default function Models({ models }: { models: Model[] }) {
  const [query, setQuery] = useState("");
  const filteredModels = [{ repo: "", type: "", predictions: 0, lastUpdate: "2020-01-01" }].filter((m) =>
    m.repo.toLowerCase().includes(query.toLowerCase())
  );

  const [page, setPage] = useState(1);
  const itemsPerPage = 30;
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedModels = filteredModels.slice(startIndex, startIndex + itemsPerPage);

  function generatePages(current: number, total: number) {
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", total);
    } else if (current >= total - 3) {
      pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, "...", current - 1, current, current + 1, "...", total);
    }

    return pages;
  }

  const pages = generatePages(page, totalPages);

  return (
    <div className="p-6 md:max-w-[1800px] md:w-full mx-auto">
      <div className="flex gap-6 w-full">
        <div className="md:basis-[60%] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Models</h1>
            <div className="justify-end">
              <SearchBar onSearch={setQuery} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 flex-1">
            {paginatedModels.map((model, idx) => (
              <Thumbnail
                key={`${model.repo}-${idx}`}
                repo={model.repo}
                type={model.type}
                predictions={model.predictions}
                lastUpdate={new Date(model.lastUpdate)}
              />
            ))}
          </div>

          <div className="flex justify-center mt-6 gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded-md border text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Prev
            </button>

            {pages.map((p, i) =>
              p === "..." ? (
                <span key={i} className="px-2 py-1 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={i}
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition border-[var(--color-border)] ${page === p
                    ? "border-[var(--color-accent)] text-[var(--color-border)]"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded-md border text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="hidden md:flex basis-[40%] rounded-md border border-[var(--color-border)] p-6 bg-[var(--color-bg)] h-full">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
        </div>
      </div>
    </div>
  );
}
