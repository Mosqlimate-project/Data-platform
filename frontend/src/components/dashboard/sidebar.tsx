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

interface SidebarProps {
  categories: Category[];
}

export function DashboardSidebar({ categories }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createBaseLink = (path: string) => {
    const params = searchParams.toString();
    return `${path}${params ? `?${params}` : ""}`;
  };

  const createOverviewLink = (path: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("category");
    const paramString = params.toString();
    return `${path}${paramString ? `?${paramString}` : ""}`;
  };

  const createCategoryLink = (path: string, categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", categoryId);
    return `${path}?${params.toString()}`;
  };

  const isActive = (path: string, categoryId: string) => {
    return pathname.includes(path) && searchParams.get("category") === categoryId;
  };

  const isOverviewActive = pathname === "/dashboard" && !searchParams.get("category");

  return (
    <div className="flex flex-col h-full bg-bg border-r border-border">
      <div className="p-6 flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold text-text mb-6">Dashboard</h2>

        <nav className="space-y-6">
          <Link
            href={createOverviewLink("/dashboard")}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isOverviewActive
                ? "bg-accent/10 text-accent"
                : "hover:bg-primary/5 hover:text-text"
              }`}
          >
            Overview
          </Link>

          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="pt-2 pb-2">
                <p className="text-xs font-bold text-secondary uppercase tracking-wider">
                  {cat.label}
                </p>
              </div>

              <div className="space-y-1">
                {(cat.levels || []).map((level) => (
                  <Link
                    key={level.id}
                    href={createCategoryLink(
                      `/dashboard/${level.url_slug}`,
                      cat.id
                    )}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${isActive(`/${level.url_slug}`, cat.id)
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
        </nav>
      </div>

      <div className="p-4 bg-bg/50">
        <h3 className="text-xs text-secondary font-semibold uppercase tracking-wider mb-3 px-2">
          More Info
        </h3>
        <div className="space-y-1">
          <Link
            href={createBaseLink("/dashboard/details")}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-text rounded-md hover:bg-primary/5 transition-colors"
          >
            <FileText size={18} />
            Models
          </Link>
          <Link
            href={createBaseLink("/dashboard/predictions")}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium hover:text-text rounded-md hover:bg-primary/5 transition-colors"
          >
            <LineChart size={18} />
            Predictions
          </Link>
          <Link
            href={createBaseLink("/dashboard/about")}
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
