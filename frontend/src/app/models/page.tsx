import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import Models from "./Models";

async function getData() {
  const [modelsRes, tagsRes] = await Promise.all([
    fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/registry/models/thumbnails/`, { cache: "no-store" }),
    fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/registry/models/tags/`, { cache: "no-store" })
  ]);

  if (!modelsRes.ok || !tagsRes.ok) {
    throw new Error("Failed to fetch data");
  }

  const models = await modelsRes.json();
  const tags = await tagsRes.json();

  return { models, tags };
}

export default async function Page() {
  const { models, tags } = await getData();

  return (
    <div className="relative z-10">
      <Models models={models} tags={tags} />
    </div>
  );
}
