import type { PredictionOut } from "@/types/prediction";

export async function fetchPrediction(predict_id: number): Promise<PredictionOut | null> {
  try {
    const res = await fetch(`/api/predictions/${predict_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to fetch prediction");
    }

    return res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}
