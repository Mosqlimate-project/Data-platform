"use client";

import { useState } from "react";
import Link from "next/link";
import Thumbnail from "./components/Model";
import SearchBar from "./components/SearchBar";
import { useAuth } from "@/components/AuthProvider";
import { FaPlus } from "react-icons/fa";

type Model = {
  owner: string;
  repository: string;
  avatarUrl: string | null;
  disease: string;
  predictions: number;
  lastUpdate: string | Date;
};

export default function Models({ models }: { models: Model[] }) {
  const [query, setQuery] = useState("");
  const { user } = useAuth();

  const filteredModels = models.filter((m) =>
    m.repository.toLowerCase().includes(query.toLowerCase()) ||
    m.owner.toLowerCase().includes(query.toLowerCase())
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
            <h1 className="text-2xl font-bold text-[var(--color-text)]">Models</h1>

            <div className="flex items-center gap-3">
              {user && (
                <Link
                  href="/model/add"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-2xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
                >
                  <FaPlus className="text-xs" />
                  <span className="hidden sm:inline">Model</span>
                </Link>
              )}
              <SearchBar onSearch={setQuery} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
            {paginatedModels.map((model, idx) => (
              <Thumbnail
                key={`${model.owner}-${model.repository}-${idx}`}
                owner={model.owner}
                repo={model.repository}
                avatarUrl={model.avatarUrl}
                disease={model.disease}
                predictions={model.predictions}
                lastUpdate={new Date(model.lastUpdate)}
              />
            ))}
          </div>

          {totalPages > 1 && (
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
                      ? "bg-blue-600 text-white border-blue-600"
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
          )}
        </div>

        <div className="hidden md:flex basis-[40%] rounded-md border border-[var(--color-border)] p-6 bg-[var(--color-bg)] h-full">
          <h2 className="text-lg font-semibold mb-4">Tags</h2>
        </div>
      </div>
    </div>
  );
}
