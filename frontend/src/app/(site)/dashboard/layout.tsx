import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import { Loader2 } from "lucide-react";
import { DashboardProvider } from "@/context/Dashboard";

export const dynamic = "force-dynamic";

async function getSections() {
  try {
    if (!NEXT_PUBLIC_FRONTEND_URL) return [];

    const res = await fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/vis/dashboard/categories/`, {
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
  const sections = await getSections();

  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-bg">
        <Suspense
          fallback={
            <div className="w-64 h-full border-r border-border bg-bg flex items-center justify-center shrink-0">
              <Loader2 className="animate-spin text-secondary" />
            </div>
          }
        >
          <DashboardSidebar sections={sections} />
        </Suspense>

        <main className="flex-1 overflow-y-auto h-full">
          {children}
        </main>
      </div>
    </DashboardProvider>
  );
}
