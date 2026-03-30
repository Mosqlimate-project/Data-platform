import { cookies } from "next/headers";
import { BACKEND_BASE_URL } from "@/lib/env";
import { ModelTabs } from "@/components/model/tabs";
import { notFound } from "next/navigation";

export default async function ModelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ owner: string; repository: string }>;
}) {
  const { owner, repository } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/`,
    {
      cache: "no-store",
      headers,
    }
  );

  if (res.status !== 200) {
    notFound();
  }

  return (
    <div className="min-h-screen font-sans bg-bg">
      <div className="container mx-auto px-4 pt-10 pb-4">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded flex items-center justify-center shrink-0">
            {/* icon goes here */}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-medium text-text">
              {owner}/{repository}
            </h1>
          </div>
        </div>

        <ModelTabs owner={owner} repository={repository} />
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
