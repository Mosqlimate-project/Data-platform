import { NextRequest, NextResponse } from "next/server";
import { BACKEND_BASE_URL, FRONTEND_SECRET, ADMIN_UIDKEY } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repository: string } }
) {
  const secret = request.headers.get("x-internal-secret")
  const { owner, repository } = params;

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  const res = await fetch(
    `${BACKEND_BASE_URL}/api/registry/model/${owner}/${repository}/readme/`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch model repository" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
