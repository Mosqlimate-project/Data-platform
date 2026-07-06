import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { FRONTEND_SECRET, NEXT_PUBLIC_FRONTEND_URL } from "@/lib/env";
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
        headers: {
          "x-internal-secret": FRONTEND_SECRET || ""
        }
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-foreground">
            {repository} predictions
          </h1>
        </div>
        {predictions.length > 0 && (
          <div className="text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border">
            {predictions.length} prediction{predictions.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <PredictionsList
        predictions={predictions}
        canManage={permissions.can_manage}
        owner={owner}
        modelName={repository}
      />
    </div>
  );
}
