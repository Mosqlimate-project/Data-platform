import { NextResponse, NextRequest } from "next/server";
import { BACKEND_BASE_URL, ADMIN_UIDKEY, FRONTEND_SECRET } from "@/lib/env";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-internal-secret")

  if (!ADMIN_UIDKEY) {
    return NextResponse.json({ message: "Server not configured" }, { status: 500 });
  }

  if (!FRONTEND_SECRET || secret !== FRONTEND_SECRET) {
    return NextResponse.json({ message: "Unauthorized [f]" }, { status: 401 });
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/registry/models/thumbnails/`, {
      headers: {
        "Content-Type": "application/json",
        "X-UID-Key": ADMIN_UIDKEY,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Upstream error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err) {
    console.error("Models proxy error:", err);
    return NextResponse.json({ message: "Upstream request failed" }, { status: 502 });
  }
}
