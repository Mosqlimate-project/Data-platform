import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { FRONTEND_URL } from "@/lib/env";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCategories() {
  try {
    if (!FRONTEND_URL) return [];

    const res = await fetch(`${FRONTEND_URL}/api/vis/dashboard/categories/`, {
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await getCategories();

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="w-64 shrink-0">

        <Suspense
          fallback={
            <div className="flex-1 h-full items-center justify-center">
              <Loader2 className="animate-spin text-secondary" />
            </div>
          }
        >
          <DashboardSidebar categories={categories} />
        </Suspense>

      </div>

      <main className="flex-1 overflow-y-auto h-full">
        {children}
      </main>
    </div>
  );
}
