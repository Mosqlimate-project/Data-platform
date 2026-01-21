import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/env";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: { prediction_id: string } }
) {
  const { prediction_id } = params;

  try {
    const res = await fetch(
      `${BACKEND_BASE_URL}/api/vis/dashboard/prediction/${prediction_id}/`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-UID-Key": ADMIN_UIDKEY,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch prediction data" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
