import { NextResponse } from "next/server";
import { BACKEND_BASE_URL } from "@/lib/api";
import { ADMIN_UIDKEY } from "@/lib/env";

export async function GET(
  request: Request,
  { params }: { params: { predict_id: string } }
) {
  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  const { predict_id } = params;

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/predictions/${predict_id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (err) {
    console.error("proxy error", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
