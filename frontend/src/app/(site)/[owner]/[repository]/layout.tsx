import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
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

  const res = await fetch(
    `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/${repository}/`,
    { cache: "no-store" }
  );

  if (res.status !== 200) notFound();

  return (
    <div className="min-h-screen font-sans bg-bg">
      <div className="container mx-auto px-4 pt-10 pb-4">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded flex items-center justify-center shrink-0">
            {/* icon goes here */}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-medium text-text">{owner}/{repository}</h1>
          </div>
        </div>

        <ModelTabs owner={owner} repository={repository} />
        {children}
      </div>
    </div>
  );
}
