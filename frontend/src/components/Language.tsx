'use client';

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";

const LANGUAGES = [
  { code: "en-us", label: "EN" },
  { code: "pt-br", label: "PT" },
  { code: "es", label: "ES" },
];

export default function LanguageSelector() {
  const [language, setLanguage] = useState("en-us");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setLanguage(saved);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    setLanguage(code);
    localStorage.setItem("lang", code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center px-4 h-10 rounded-md border border-border hover:bg-hover transition-colors text-sm font-medium"
      >
        {LANGUAGES.find((l) => l.code === language)?.label}
      </button>

      {open && (
        <div className="absolute right-0 mt-[35px] w-35 bg-bg border border-border rounded-md shadow-lg overflow-hidden z-50">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={clsx(
                "w-full text-left px-4 py-2 hover:bg-hover transition-colors",
                language === code ? "font-semibold" : "font-normal"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
