import MarkdownRenderer from "@/components/model/MarkdownRenderer";
import { FRONTEND_URL } from "@/lib/env";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

async function getReadmeContent(owner: string, repository: string) {
  try {
    const res = await fetch(`${FRONTEND_URL}/api/registry/model/${owner}/${repository}/readme`);

    if (!res.ok) return null;

    const data = await res.json();
    return data.content;
  } catch (error) {
    console.error("Failed to fetch README:", error);
    return null;
  }
}

export default async function ReadmePage({ params }: PageProps) {
  const { owner, repository } = await params;
  const content = await getReadmeContent(owner, repository);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 border p-8 rounded bg-card text-card-foreground min-w-0 break-words overflow-hidden">
        {content ? (
          <MarkdownRenderer
            content={content}
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
      <aside className="lg:col-span-2">Sidebar</aside>
    </div>
  );
}
