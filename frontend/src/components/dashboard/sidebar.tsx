"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Info, FileText, LineChart } from "lucide-react";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const isLevelActive = (
    categoryId: string,
    levelSlug: string,
    sectionId: string
  ) => {
    if (!pathname.includes(`/dashboard/${categoryId}`)) return false;

    const currentSprint = searchParams.get("sprint");
    const isSprintSection = sectionId === "sprint";
    const targetSprintValue = isSprintSection ? "true" : "false";

    const effectiveCurrentSprint = currentSprint === null ? "false" : currentSprint;

    if (effectiveCurrentSprint !== targetSprintValue) return false;

    const currentLevel = searchParams.get("adm_level");
    const targetLevel = LEVEL_TO_INT[levelSlug];

    if (!currentLevel && targetLevel === "1") return true;

    return currentLevel === targetLevel;
  };

  return (
    <div className="flex flex-col h-full bg-bg border-r border-border">
      <div className="p-6 flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold text-text mb-6">Dashboard</h2>

        <nav className="space-y-6">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${pathname === "/dashboard"
                ? "bg-accent/10 text-accent"
                : "hover:bg-primary/5 hover:text-text"
              }`}
          >
            Overview
          </Link>

          {(sections || []).map((section) => (
            <div key={section.id} className="mb-6">
              <h3 className="text-sm font-bold text-text mb-3 uppercase tracking-wider border-b pb-1">
                {section.label}
              </h3>

              {(section.categories || []).map((cat) => (
                <div key={cat.id} className="mb-4">
                  <div className="pt-1 pb-2">
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider">
                      {cat.label}
                    </p>
                  </div>

                  <div className="space-y-1">
                    {(cat.levels || []).map((level) => (
                      <Link
                        key={level.id}
                        href={createLink(`/dashboard/${cat.id}`, section.id, {
                          adm_level: LEVEL_TO_INT[level.id] || "1",
                        })}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isLevelActive(cat.id, level.id, section.id)
                            ? "bg-accent/10 text-accent font-medium"
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

      <div className="p-4 bg-bg/50">
        <h3 className="text-xs text-secondary font-semibold uppercase tracking-wider mb-3 px-2">
          More Info
        </h3>
        <div className="space-y-1">
          <Link
            href="/dashboard/details"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-text rounded-md hover:bg-primary/5 transition-colors"
          >
            <FileText size={18} />
            Models
          </Link>
          <Link
            href="/dashboard/predictions"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-text rounded-md hover:bg-primary/5 transition-colors"
          >
            <LineChart size={18} />
            Predictions
          </Link>
          <Link
            href="/dashboard/about"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-text rounded-md hover:bg-primary/5 transition-colors"
          >
            <Info size={18} />
            About
          </Link>
        </div>
      </div>
    </div>
  );
}
