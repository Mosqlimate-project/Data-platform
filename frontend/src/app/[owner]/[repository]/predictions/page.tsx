import { NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
import PredictionsList, { ModelPrediction } from "@/components/model/Predictions";
import { getPermissions } from "@/lib/api/model";

interface PageProps {
  params: Promise<{
    owner: string;
    repository: string;
  }>;
}


async function getPredictions(owner: string, repository: string): Promise<ModelPrediction[]> {
  try {
    const res = await fetch(
      `${NEXT_PUBLIC_FRONTEND_URL}/api/registry/model/${owner}/${repository}/predictions`,
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
