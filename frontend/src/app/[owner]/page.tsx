import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    owner: string;
  }>;
}

export default async function OwnerPage({ params }: PageProps) {
  const { owner } = await params;

  const res = await fetch(
    `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/`,
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
      <h1>{owner}</h1>
    </div>
  );
}
