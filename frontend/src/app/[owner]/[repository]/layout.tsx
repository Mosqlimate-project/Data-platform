import { cookies } from "next/headers";
import Image from "next/image";
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

  const modelDetails = await res.json();
  const avatarUrl = modelDetails.avatar_url;

  return (
    <div className="min-h-screen font-sans bg-bg">
      <div className="container mx-auto px-4 pt-10 pb-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-full border border-border overflow-hidden bg-muted shrink-0 relative flex items-center justify-center shadow-sm">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={owner}
                width={48}
                height={48}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold bg-gray-100 dark:bg-neutral-800 text-muted-foreground">
                {owner.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-text">
              {owner}<span className="text-muted-foreground/60 font-normal mx-0.5">/</span>{repository}
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
