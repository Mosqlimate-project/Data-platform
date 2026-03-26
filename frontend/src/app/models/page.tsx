import { NEXT_PUBLIC_FRONTEND_URL, FRONTEND_SECRET } from "@/lib/env";
import Models from "./Models";
import { cookies } from "next/headers";

async function getData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const headers: Record<string, string> = {
    "x-internal-secret": FRONTEND_SECRET || "",
  };

  if (token) {
    headers["cookie"] = `access_token=${token}`;
  }

  const [modelsRes, tagsRes] = await Promise.all([
    fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/registry/models/thumbnails/`, {
      cache: "no-store",
      headers: headers,
    }),
    fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/registry/models/tags/`, {
      cache: "no-store",
      headers: headers,
    })
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
