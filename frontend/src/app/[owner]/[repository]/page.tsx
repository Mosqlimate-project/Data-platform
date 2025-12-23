import { FRONTEND_URL } from "@/lib/env";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

export default async function ModelPage({ params }: PageProps) {
  const { owner, repository } = await params;

  const res = await fetch(
    `${FRONTEND_URL}/api/registry/model/${owner}/${repository}/`,
    {
      cache: "no-store",
    }
  );

  if (res.status !== 200) {
    notFound();
  }

  const data = await res.json();

  return (
    <div>
      <h1>{owner}/{repository}</h1>
    </div>
  );
}
