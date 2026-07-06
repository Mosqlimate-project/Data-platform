import { cookies } from "next/headers";
import MarkdownRenderer from "@/components/model/MarkdownRenderer";
import ModelSidebar from "@/components/model/ModelSidebar";
import { BACKEND_BASE_URL } from "@/lib/env";
import { getPermissions } from "@/lib/api/model";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default async function ReadmePage({ params }: PageProps) {
  const { owner, repository } = await params;
  const headers = await getAuthHeaders();

  const [detailsRes, readmeRes, permissions] = await Promise.all([
    fetch(`${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/`, { headers, cache: "no-store" }),
    fetch(`${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/readme/`, { headers, cache: "no-store" }),
    getPermissions(owner, repository)
  ]);

  if (!detailsRes.ok) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Model not found</h1>
        <p className="text-muted-foreground max-w-sm">This model is inactive, does not exist, or you lack the required access permissions.</p>
      </div>
    );
  }

  const modelDetails = await detailsRes.json();
  const readmeData = readmeRes.ok ? await readmeRes.json() : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch w-full py-6">
      <div className="lg:col-span-3 h-full border border-border rounded-xl p-6 sm:p-8 bg-card shadow-sm min-w-0 break-words">
        {readmeData?.content ? (
          <MarkdownRenderer
            content={readmeData.content}
            owner={owner}
            repo={repository}
            branch="main"
          />
        ) : (
          <div className="flex h-60 flex-col items-center justify-center text-muted-foreground gap-2 border border-dashed rounded-lg">
            <p className="text-sm">No README available for this model.</p>
          </div>
        )}
      </div>

      <aside className="lg:col-span-2 w-full lg:sticky lg:top-6 self-start">
        <ModelSidebar
          owner={owner}
          repository={repository}
          initialDescription={modelDetails.description}
          contributors={modelDetails.contributors}
          githubUrl={modelDetails.github_url || modelDetails.html_url}
          canManage={permissions?.can_manage || false}
          tags={{
            disease: modelDetails.disease,
            category: modelDetails.category,
            adm_level: modelDetails.adm_level,
            time_resolution: modelDetails.time_resolution,
            license: modelDetails.license
          }}
        />
      </aside>
    </div>
  );
}
