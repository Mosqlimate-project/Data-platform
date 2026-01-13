import { cookies } from "next/headers";
import { FRONTEND_URL } from "@/lib/env";
import PredictionsList, { ModelPrediction } from "@/components/model/Predictions";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}

async function getPermissions(owner: string, repository: string) {
  try {
    const cookieStore = await cookies();

    const res = await fetch(
      `${FRONTEND_URL}/api/registry/model/${owner}/${repository}/permissions`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    );

    if (!res.ok) {
      return { is_owner: false, can_manage: false };
    }

    return await res.json();
  } catch (error) {
    return { is_owner: false, can_manage: false };
  }
}

async function getPredictions(owner: string, repository: string): Promise<ModelPrediction[]> {
  try {
    const res = await fetch(
      `${FRONTEND_URL}/api/registry/model/${owner}/${repository}/predictions`,
      {
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    return await res.json();
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function PredictionsPage({ params }: PageProps) {
  const { owner, repository } = await params;

  const [predictions, permissions] = await Promise.all([
    getPredictions(owner, repository),
    getPermissions(owner, repository),
  ]);

  return (
    <PredictionsList
      predictions={predictions}
      canManage={permissions.can_manage}
    />
  );
}
