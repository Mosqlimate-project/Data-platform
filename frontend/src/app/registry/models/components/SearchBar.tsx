"use client";

import { useState, useEffect } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  delay?: number;
}

export default function SearchBar({
  onSearch,
  placeholder = "Search",
  delay = 300,
}: SearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      onSearch(value.trim());
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay, onSearch]);

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border rounded-md text-sm bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text)] focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          ×
        </button>
      )}
    </div>
  );
}
