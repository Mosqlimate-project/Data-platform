"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Level {
  id: string;
  label: string;
  url_slug: string;
}

interface Category {
  id: string;
  label: string;
  levels: Level[];
}

interface Section {
  id: string;
  label: string;
  categories: Category[];
}

interface SidebarProps {
  sections: Section[];
}

const LEVEL_TO_INT: Record<string, string> = {
  national: "0",
  state: "1",
  municipal: "2",
  sub_municipal: "3",
};

export function DashboardSidebar({ sections }: SidebarProps) {
  const { t } = useTranslation("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }

    const handleResize = (e: Event) => {
      if (!e.isTrusted) return;

      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const createLink = (
    basePath: string,
    sectionId: string,
    extraParams: Record<string, string> = {}
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    if (sectionId === "sprint") {
      params.set("sprint", "true");
    } else {
      params.set("sprint", "false");
    }

    Object.entries(extraParams).forEach(([key, value]) => {
      params.set(key, value);
    });

    return `${basePath}?${params.toString()}`;
  };

  const isSectionActive = (sectionId: string) => {
    const currentSprint = searchParams.get("sprint");
    const isSprintSection = sectionId === "sprint";
    const targetSprintValue = isSprintSection ? "true" : "false";
    const effectiveCurrentSprint =
      currentSprint === null ? "false" : currentSprint;

    return effectiveCurrentSprint === targetSprintValue;
  };

  const isCategoryActive = (categoryId: string, sectionId: string) => {
    if (!pathname.includes(`/dashboard/${categoryId}`)) return false;
    return isSectionActive(sectionId);
  };

  const isLevelActive = (
    categoryId: string,
    levelSlug: string,
    sectionId: string
  ) => {
    if (!pathname.includes(`/dashboard/${categoryId}`)) return false;
    if (!isSectionActive(sectionId)) return false;

    const currentLevel = searchParams.get("adm_level");
    const targetLevel = LEVEL_TO_INT[levelSlug];

    if (!currentLevel && targetLevel === "1") return true;

    return currentLevel === targetLevel;
  };

  const SECTION_LABEL_MAP: Record<string, string> = {
    default: "dashboard.overview.general.title",
    sprint: "dashboard.overview.imdc.title",
  };

  return (
    <div
      className={`flex flex-col flex-shrink-0 min-h-screen bg-bg border-r border-border transition-all duration-300 ease-in-out ${isOpen ? "w-64" : "w-16"
        }`}
    >
      <div className="relative flex items-center justify-between h-16 px-4 border-b border-border/50">
        <h2
          className={`text-lg font-bold text-text whitespace-nowrap transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 hidden"
            }`}
        >
          {t("navbar.dashboard")}
        </h2>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-primary/10 text-text/70 hover:text-text transition-colors"
        >
          {isOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav
          className={`space-y-6 p-4 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 invisible"
            }`}
        >
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors whitespace-nowrap ${pathname === "/dashboard"
                ? "bg-accent text-white"
                : "hover:bg-primary/5 hover:text-text"
              }`}
          >
            {t("dashboard.overview.overview")}
          </Link>

          {(sections || []).map((section) => (
            <div key={section.id} className="mb-6">
              <h3 className="text-sm font-bold text-text mb-3 uppercase tracking-wider border-b pb-1 whitespace-nowrap">
                {t(SECTION_LABEL_MAP[section.id] ?? section.label)}
              </h3>

              {(section.categories || []).map((cat) => (
                <div key={cat.id} className="mb-4">
                  {section.categories.length > 1 && (
                    <div className="pt-1 pb-2">
                      <p
                        className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors`}
                      >
                        {cat.label}
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    {(cat.levels || []).map((level) => (
                      <Link
                        key={level.id}
                        href={createLink(`/dashboard/${cat.id}`, section.id, {
                          adm_level: LEVEL_TO_INT[level.id] || "1",
                        })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm whitespace-nowrap ${isLevelActive(cat.id, level.id, section.id)
                            ? "bg-accent text-white font-medium"
                            : "hover:bg-primary/5 hover:text-text"
                          }`}
                      >
                        {level.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
