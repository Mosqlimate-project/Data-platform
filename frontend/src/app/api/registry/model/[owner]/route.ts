import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string }> }
) {
  const { owner } = await params;

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/registry/model/${owner}/`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch repository owner" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
