import Models from "./Models";

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const url = base.startsWith("http") ? base : `https://${base}`;
  const res = await fetch(`${url}/api/registry/models`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch models");
  }

  const models = await res.json();

  return <Models models={models} />;
}
