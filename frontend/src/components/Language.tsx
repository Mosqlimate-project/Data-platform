'use client';

import { useState, useEffect, useRef } from "react";
import clsx from "clsx";
import i18n from "@/lib/i18n";
import { IoLanguage } from "react-icons/io5";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
  { code: "es", label: "ES" },
];

export default function LanguageSelector() {
  const [language, setLanguage] = useState<string>(i18n.language || "en");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("i18nextLng");
    const lng = saved || i18n.language || "en";
    if (lng !== i18n.language) {
      i18n.changeLanguage(lng);
    }
    setLanguage(lng);
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

  useEffect(() => {
    const handleLangChanged = (lng: string) => {
      setLanguage(lng);
      document.documentElement.lang = lng;
    };
    i18n.on("languageChanged", handleLangChanged);
    return () => {
      i18n.off("languageChanged", handleLangChanged);
    };
  }, []);

  const handleSelect = (code: string) => {
    localStorage.setItem("i18nextLng", code);
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-hover transition-colors text-text/80 hover:text-text flex items-center justify-center"
        aria-label="Change Language"
      >
        <IoLanguage size={20} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-16 bg-bg border border-border rounded-md shadow-lg overflow-hidden z-50 py-1">
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={clsx(
                "w-full text-left px-4 py-2 hover:bg-hover transition-colors text-sm",
                language === code ? "font-semibold text-blue-600 dark:text-blue-400" : "text-text"
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
