import MarkdownRenderer from "@/components/model/MarkdownRenderer";
import ModelSidebar from "@/components/model/ModelSidebar";
import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import { getPermissions } from "@/lib/api/model";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

async function getReadmeContent(owner: string, repository: string) {
  try {
    const res = await fetch(
      `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/${repository}/readme`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    const data = await res.json();
    return data.content;
  } catch (error) {
    console.error("Failed to fetch README:", error);
    return null;
  }
}

async function fetchModelDetails(owner: string, repository: string) {
  try {
    const res = await fetch(
      `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/${repository}/`,
      { cache: "no-store" }
    );

    if (!res.ok) return null;

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch model details:", error);
    return null;
  }
}

export default async function ReadmePage({ params }: PageProps) {
  const { owner, repository } = await params;

  const [readmeContent, permissions, modelDetails] = await Promise.all([
    getReadmeContent(owner, repository),
    getPermissions(owner, repository),
    fetchModelDetails(owner, repository),
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 border p-8 rounded bg-card text-card-foreground min-w-0 break-words overflow-hidden">
        {readmeContent ? (
          <MarkdownRenderer
            content={readmeContent}
            owner={owner}
            repo={repository}
            branch="main"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No content
          </div>
        )}
      </div>

      <aside className="lg:col-span-2">
        <ModelSidebar
          owner={owner}
          repository={repository}
          initialDescription={modelDetails?.description}
          contributors={modelDetails?.contributors}
          canManage={permissions.can_manage}
        />
      </aside>
    </div>
  );
}
