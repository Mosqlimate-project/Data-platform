import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import Models from "./Models";

export default async function Page() {
  const res = await fetch(`${NEXT_PUBLIC_FRONTEND_URL}/api/registry/models/`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch models: ${res.status}`);
  }

  const models = await res.json();

  return (
    <>
      <div className="relative z-10">
        <Models models={models} />
      </div>
    </>
  );
}
