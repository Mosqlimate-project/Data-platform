"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Thumbnail from "./components/Model";
import SearchBar from "./components/SearchBar";
import { useAuth } from "@/components/AuthProvider";
import { FaPlus, FaTag, FaTimes } from "react-icons/fa";

type Model = {
  model_id: number;
  owner: string;
  repository: string;
  avatar_url: string | null;
  disease: string;
  predictions: number;
  last_update: number;
};

type TagModelSummary = {
  id: number;
};

type Tag = {
  id: string;
  name: string;
  category: string;
  models: TagModelSummary[];
};

export default function Models({ models, tags }: { models: Model[]; tags: Tag[] }) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const itemsPerPage = 30;

  const groupedTags = useMemo(() => {
    const groups: Record<string, Tag[]> = {};
    tags.forEach((tag) => {
      const cat = tag.category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(tag);
    });
    return groups;
  }, [tags]);

  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchesSearch =
        m.repository.toLowerCase().includes(query.toLowerCase()) ||
        m.owner.toLowerCase().includes(query.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedTags.length === 0) return true;

      const matchesTags = selectedTags.some((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        return tag?.models.some((tm) => tm.id === m.model_id);
      });

      return matchesTags;
    });
  }, [models, query, selectedTags, tags]);

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

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
    setPage(1);
  };

  return (
    <div className="p-6 md:max-w-[1800px] md:w-full mx-auto">
      <div className="flex flex-col md:flex-row gap-6 w-full">
        <div className="md:w-[75%] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Models</h1>
              <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {filteredModels.length}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {user && (
                <Link
                  href="/model/add"
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-2xl text-sm font-medium transition-all shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  <FaPlus className="text-xs" />
                  <span className="hidden sm:inline">Model</span>
                </Link>
              )}
              <div className="flex-1 sm:w-64">
                <SearchBar onSearch={(q) => { setQuery(q); setPage(1); }} />
              </div>
            </div>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedTags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return (
                  <button
                    key={tagId}
                    onClick={() => toggleTag(tagId)}
                    className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-200 transition"
                  >
                    {tag?.name} <FaTimes />
                  </button>
                )
              })}
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-gray-500 hover:text-gray-700 underline px-2"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 flex-1 min-h-[400px] content-start">
            {paginatedModels.length > 0 ? (
              paginatedModels.map((model, idx) => (
                <Thumbnail
                  key={`${model.owner}-${model.repository}-${idx}`}
                  owner={model.owner}
                  repo={model.repository}
                  avatar_url={model.avatar_url}
                  disease={model.disease}
                  predictions={model.predictions}
                  last_update={model.last_update}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-20">
                <FaTag className="text-4xl mb-3 opacity-20" />
                <p>No models match your filters.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-md border text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                Prev
              </button>

              {pages.map((p, i) =>
                p === "..." ? (
                  <span key={i} className="px-2 py-1 text-gray-500">...</span>
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

        <aside className="md:w-[25%] flex flex-col gap-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--color-border)] bg-gray-50/50 dark:bg-gray-900/50">
              <h2 className="font-semibold flex items-center gap-2">
                <FaTag className="text-gray-400 text-sm" />
                Filters
              </h2>
            </div>

            <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar space-y-6">
              {Object.entries(groupedTags).map(([category, categoryTags]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition-all duration-200 text-left ${isSelected
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white dark:bg-gray-800 border-[var(--color-border)] text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:text-blue-500"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span>{tag.name}</span>
                            <span className={`text-[10px] ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                              {tag.models.length}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
